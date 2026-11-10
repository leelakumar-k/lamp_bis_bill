import type { PaperWidth, Settings } from '@/db/meta';
import type { OrderDetail, Shift } from '@/db/pos-types';
import type { ShiftTotal } from '@/db/sales';

import { nowLocal, receiptDate, receiptDateTime } from './date';

export type ReceiptRow = { left: string; right?: string; bold?: boolean };
export type ReceiptItem = { name: string; qty: number; rate: number; amount: number };

/** Layout-independent receipt; rendered as text (ESC/POS), HTML (print) or a preview. */
export type ReceiptModel = {
  paper: PaperWidth;
  currency: string;
  header: string[];
  title: string;
  meta: ReceiptRow[];
  items: ReceiptItem[] | null;
  showPrices: boolean;
  totals: ReceiptRow[];
  footer: string[];
};

/** Characters per line for 58 mm (28 chars) and 80 mm (48 chars) thermal printers. */
export const COLUMNS: Record<PaperWidth, number> = { '58': 28, '80': 48 };

export const formatItemVal = (minor: number) => {
  const v = minor / 100;
  return minor % 100 === 0 ? String(v) : v.toFixed(2);
};

const money = (minor: number) =>
  (minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function headerLines(settings: Settings) {
  const name = (settings.businessName || '').trim() || 'Restaurant Name';
  const addr = (settings.address || '').trim() || 'Main Road, City';
  const ph = (settings.phone || '').trim() || '9876543210';
  const gst = (settings.gstin || '').trim();
  return [
    name,
    addr,
    `Ph: ${ph}`,
    gst ? `GSTIN: ${gst}` : '',
  ].filter(Boolean);
}

type BuildOptions = {
  settings: Settings;
  kind: 'bill' | 'kot';
  /** Translates a dish name when the bill is set to print in the app language. */
  itemName: (id: string | null, english: string) => string;
  printedAt?: string;
};

/**
 * The bill date is the shift's business date, not the print time: a bill printed at
 * 2 AM in a night shift that opened on the 7th is dated the 7th. Print time is shown separately.
 */
export function buildOrderReceipt(order: OrderDetail, { settings, kind, itemName, printedAt = nowLocal() }: BuildOptions): ReceiptModel {
  const paper = settings.paperWidth;
  const where = order.type === 'takeaway' ? `Token: ${order.token ?? '-'}` : `Table: ${order.table_name ?? '-'}-${order.party ?? 'A'}`;
  const name = (id: string | null, english: string) =>
    settings.receiptLanguage === 'app' ? itemName(id, english) : english;

  const meta: ReceiptRow[] = [];
  if (kind === 'bill') meta.push({ left: `Bill No: ${order.bill_no ?? '-'}`, right: where, bold: true });
  else meta.push({ left: where, right: order.type === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN', bold: true });
  meta.push({ left: `Date: ${receiptDate(order.business_date)}`, right: order.shift_name });
  meta.push({ left: `Order: ${receiptDateTime(order.created_at)}` });
  if (order.customer_name) meta.push({ left: `Customer: ${order.customer_name}` });
  if (kind === 'kot' && order.note) meta.push({ left: `Note: ${order.note}`, bold: true });

  const items = order.lines.map((l) => ({
    name: l.note ? `${name(l.item_id, l.name)} (${l.note})` : name(l.item_id, l.name),
    qty: l.qty,
    rate: l.price,
    amount: l.price * l.qty,
  }));

  const totals: ReceiptRow[] = [];
  if (kind === 'bill') {
    const hasGst = Boolean(settings.gstin && settings.gstin.trim().length > 0);
    const hasDiscount = Boolean(order.discount && order.discount > 0);

    if (hasGst && order.tax_percent > 0 && order.tax > 0) {
      totals.push({ left: 'Subtotal :', right: money(order.subtotal) });
      if (hasDiscount) {
        totals.push({ left: 'Discount :', right: `-${money(order.discount)}` });
      }
      const half = order.tax_percent / 2;
      const cgst = Math.floor(order.tax / 2);
      totals.push({ left: `CGST ${half}% :`, right: money(cgst) });
      totals.push({ left: `SGST ${half}% :`, right: money(order.tax - cgst) });
      if (order.round_off) {
        totals.push({ left: 'Round off :', right: money(order.round_off) });
      }
      totals.push({ left: 'Total :', right: money(order.total), bold: true });
    } else {
      // IF No GST number: No tax lines needed. Directly print total after items (or subtotal & discount if discounted)
      if (hasDiscount) {
        totals.push({ left: 'Subtotal :', right: money(order.subtotal) });
        totals.push({ left: 'Discount :', right: `-${money(order.discount)}` });
      }
      const finalTotal = hasGst ? order.total : order.subtotal - (order.discount || 0);
      totals.push({ left: 'Total :', right: money(finalTotal), bold: true });
    }
  } else {
    totals.push({ left: 'Items :', right: String(order.lines.reduce((s, l) => s + l.qty, 0)), bold: true });
  }

  return {
    paper,
    currency: settings.currency.trim(),
    header: kind === 'bill' ? headerLines(settings) : [settings.businessName || 'Restaurant'],
    title:
      kind === 'kot'
        ? `KOT${order.revision ? ` (UPDATED ${order.revision})` : ''}`
        : `${settings.gstin ? 'TAX INVOICE' : 'BILL'}${order.revision ? ' (REVISED)' : ''}`,
    meta,
    items,
    showPrices: kind === 'bill',
    totals,
    footer: kind === 'bill' ? [settings.receiptFooter].filter(Boolean) : [],
  };
}

export function buildShiftReport(shift: Shift, total: ShiftTotal, settings: Settings, printedAt = nowLocal()): ReceiptModel {
  return {
    paper: settings.paperWidth,
    currency: settings.currency.trim(),
    header: [settings.businessName || 'Restaurant'],
    title: 'SHIFT REPORT',
    meta: [
      { left: `Business date: ${receiptDate(shift.business_date)}`, bold: true },
      { left: `Shift: ${shift.name}` },
      { left: `Opened: ${receiptDateTime(shift.opened_at)}` },
      { left: `Closed: ${shift.closed_at ? receiptDateTime(shift.closed_at) : 'OPEN'}` },
      { left: `Printed: ${receiptDateTime(printedAt)}` },
    ],
    items: null,
    showPrices: false,
    totals: [
      { left: 'Bills', right: String(total.orders) },
      { left: 'Cash', right: money(total.cash) },
      { left: 'UPI', right: money(total.upi) },
      { left: 'Card', right: money(total.card) },
      ...(total.unpaid ? [{ left: 'Unpaid', right: money(total.unpaid) }] : []),
      { left: 'NET SALES', right: `${settings.currency.trim()} ${money(total.net)}`, bold: true },
    ],
    footer: [],
  };
}

// ---- Plain text (for ESC/POS printers and the share sheet) ----

const center = (text: string, width: number) => {
  const t = text.slice(0, width);
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return ' '.repeat(pad) + t;
};

const twoCol = (left: string, right: string, width: number) => {
  if (left.length + right.length + 1 > width) {
    const maxLeft = Math.max(1, width - right.length - 1);
    left = left.slice(0, maxLeft);
  }
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
};

function wrap(text: string, width: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      if (line) lines.push(line);
      line = word.slice(0, width);
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Text receipts avoid the ₹ sign because most thermal printer code pages lack it. */
export function receiptText(model: ReceiptModel) {
  const w = COLUMNS[model.paper];
  const rule = '-'.repeat(w);
  const doubleRule = '='.repeat(w);
  const out: string[] = [];
  for (const h of model.header) out.push(...wrap(h, w).map((l) => center(l, w)));
  out.push(rule, center(model.title, w), rule);
  for (const m of model.meta) out.push(m.right ? twoCol(m.left, m.right, w) : m.left);

  if (model.items) {
    out.push(rule);
    const is58 = model.paper === '58';
    const nameW = is58 ? 15 : 24;
    const qtyW = is58 ? 3 : 4;
    const rateW = model.showPrices ? (is58 ? 5 : 8) : 0;
    const amtW = model.showPrices ? (is58 ? 5 : 12) : 0;
    const head =
      'Item'.padEnd(nameW) +
      'Qty'.padStart(qtyW) +
      (rateW ? 'Rate'.padStart(rateW) : '') +
      (amtW ? 'Amt'.padStart(amtW) : '');
    out.push(head, rule);
    for (const item of model.items) {
      const cleanName = item.name.slice(0, nameW).padEnd(nameW);
      const qtyStr = String(item.qty).padStart(qtyW);
      const rateStr = rateW ? formatItemVal(item.rate).padStart(rateW) : '';
      const amtStr = amtW ? formatItemVal(item.amount).padStart(amtW) : '';
      out.push(cleanName + qtyStr + rateStr + amtStr);
    }
  }

  if (model.totals.length > 0) {
    // If the first row is NOT bold (has subtotal, discount, or tax), print dashed rule after items
    if (!model.totals[0].bold) {
      out.push(rule);
    }
    for (const row of model.totals) {
      if (row.bold) {
        // Before total print ================
        out.push(doubleRule);
      }
      const right = (row.right ?? '').replace('₹', 'Rs.');
      out.push(right ? twoCol(row.left, right, w) : row.left);
      if (row.bold) {
        // After total print ================
        out.push(doubleRule);
      }
    }
  }

  if (model.footer.length) {
    out.push('');
    for (const f of model.footer) out.push(...wrap(f, w).map((l) => center(l, w)));
  }
  out.push('', '', '');
  return out.join('\n');
}

// ---- HTML (for the system print service; renders any script, including Indian languages) ----

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function receiptHtml(model: ReceiptModel) {
  const mm = model.paper === '58' ? 58 : 80;
  const cols = COLUMNS[model.paper];
  const doubleRule = '='.repeat(cols);

  const metaRows = model.meta
    .map(
      (m) =>
        `<tr${m.bold ? ' class="b"' : ''}><td class="m-l">${esc(m.left)}</td><td class="m-r">${esc(
          m.right ?? '',
        )}</td></tr>`,
    )
    .join('');

  const items = model.items
    ? `<table class="items-table"><thead><tr><th class="col-item">Item</th><th class="col-qty">Qty</th>${
        model.showPrices ? '<th class="col-rate">Rate</th>' : ''
      }${model.showPrices ? '<th class="col-amt">Amt</th>' : ''}</tr></thead><tbody>${model.items
        .map(
          (i) =>
            `<tr><td class="col-item">${esc(i.name)}</td><td class="col-qty">${i.qty}</td>${
              model.showPrices ? `<td class="col-rate">${formatItemVal(i.rate)}</td>` : ''
            }${model.showPrices ? `<td class="col-amt">${formatItemVal(i.amount)}</td>` : ''}</tr>`,
        )
        .join('')}</tbody></table>`
    : '';

  const hasSubtotalOrTax = model.totals.length > 0 && !model.totals[0].bold;

  const totalsRows = model.totals
    .map((r) => {
      if (r.bold) {
        return `
          <div class="sep-double"></div>
          <div class="total-row">
            <span class="t-l">${esc(r.left)}</span>
            <span class="t-r">${esc(r.right ?? '')}</span>
          </div>
          <div class="sep-double"></div>
        `;
      }
      return `
        <div class="sub-row">
          <span class="t-l">${esc(r.left)}</span>
          <span class="t-r">${esc(r.right ?? '')}</span>
        </div>
      `;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
@page { size: ${mm}mm auto; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; width: ${mm}mm; padding: 2mm 2mm 6mm; font-family: "Noto Sans", "Noto Sans Telugu", "Noto Sans Devanagari", "Courier New", monospace, sans-serif; font-size: ${model.paper === '58' ? '2.7mm' : '3.1mm'}; line-height: 1.35; color: #000; }
.c { text-align: center; } .h1 { font-size: 1.35em; font-weight: 700; } .t { font-weight: 700; letter-spacing: .08em; }
hr { border: 0; border-top: 1px dashed #000; margin: 1.2mm 0; }
.b { font-weight: 700; }
table { width: 100%; border-collapse: collapse; }
.meta-table td { padding: 0.3mm 0; vertical-align: top; }
.meta-table .m-l { text-align: left; }
.meta-table .m-r { text-align: right; white-space: nowrap; }
.items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.items-table th, .items-table td { padding: .4mm 0; vertical-align: middle; }
.items-table th { font-weight: 700; border-bottom: 1px dashed #000; }
.col-item { width: ${model.paper === '58' ? '48%' : '52%'}; text-align: left; }
.col-qty { width: ${model.paper === '58' ? '12%' : '12%'}; text-align: right; white-space: nowrap; }
.col-rate { width: ${model.paper === '58' ? '18%' : '16%'}; text-align: right; white-space: nowrap; }
.col-amt { width: ${model.paper === '58' ? '22%' : '20%'}; text-align: right; white-space: nowrap; }
.totals-wrap { width: 100%; margin-top: 0.5mm; }
.sub-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0.3mm 0; }
.total-row { display: flex; justify-content: space-between; align-items: center; width: 100%; font-weight: 800; font-size: 1.15em; padding: 0.5mm 0; }
.t-l { text-align: left; white-space: nowrap; }
.t-r { text-align: right; white-space: nowrap; }
.sep-double { border-top: 2px solid #000; border-bottom: 2px solid #000; height: 3px; margin: 1.2mm 0; width: 100%; }
</style></head><body>
${model.header.map((h, i) => `<div class="c${i === 0 ? ' h1' : ''}">${esc(h)}</div>`).join('')}
<hr/><div class="c t">${esc(model.title)}</div><hr/>
<table class="meta-table">${metaRows}</table>
<hr/>${items}${hasSubtotalOrTax ? '<hr/>' : ''}
<div class="totals-wrap">${totalsRows}</div>
${model.footer.length ? `<hr/>${model.footer.map((f) => `<div class="c">${esc(f)}</div>`).join('')}` : ''}
</body></html>`;
}
