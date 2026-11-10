import { randomUUID } from 'expo-crypto';

import { addDays, businessDateFor, parseISODate, toLocalDateTime } from '@/lib/date';

import { computeTotals } from './orders';
import type { OrderLine, PaymentMode } from './pos-types';
import type { Database } from './types';

type SeedItem = { slug: string; name: string; price: number; veg: boolean; local: Record<string, string> };
type SeedCategory = { name: string; local: Record<string, string>; items: SeedItem[] };

// Local names are how the dish is written and said in each language (transliterated),
// not a translation of its meaning.
const MENU: SeedCategory[] = [
  {
    name: 'Tiffin',
    local: {
      hi: 'टिफिन / नाश्ता',
      mr: 'टिफिन / नाश्ता',
      ta: 'டிபன்',
      te: 'టిఫిన్ / అల్పాహారం',
      kn: 'ತಿಂಡಿ / ಟಿಫಿನ್',
      gu: 'ટિફિન / નાસ્તો',
      bn: 'টিফিন / জলখাবার',
      ml: 'ടിഫിൻ / പലഹാരം',
    },
    items: [
      {
        slug: 'masala-dosa',
        name: 'Masala Dosa',
        price: 90,
        veg: true,
        local: {
          hi: 'मसाला डोसा',
          mr: 'मसाला डोसा',
          ta: 'மசாலா தோசை',
          te: 'మసాలా దోశ',
          kn: 'ಮಸಾಲೆ ದೋಸೆ',
          gu: 'મસાલા ઢોસા',
          bn: 'মশলা দোসা',
          ml: 'മസാല ദോശ',
        },
      },
      {
        slug: 'idli-sambar',
        name: 'Idli Sambar',
        price: 60,
        veg: true,
        local: {
          hi: 'इडली सांभर',
          mr: 'इडली सांबार',
          ta: 'இட்லி சாம்பார்',
          te: 'ఇడ్లీ సాంబార్',
          kn: 'ಇಡ್ಲಿ ಸಾಂಬಾರ್',
          gu: 'ઇડલી સાંભાર',
          bn: 'ইডলি সম্বর',
          ml: 'ഇഡ്ഡലി സാമ്പാർ',
        },
      },
      {
        slug: 'medu-vada',
        name: 'Medu Vada',
        price: 70,
        veg: true,
        local: {
          hi: 'मेदु वड़ा',
          mr: 'मेदू वडा',
          ta: 'மெது வடை',
          te: 'మేదు వడ',
          kn: 'ಮೆದು ವಡೆ',
          gu: 'મેદુ વડા',
          bn: 'মেদু বড়ে',
          ml: 'മേദു വട',
        },
      },
      {
        slug: 'plain-dosa',
        name: 'Plain Dosa',
        price: 70,
        veg: true,
        local: {
          hi: 'प्लेन डोसा',
          mr: 'प्लेन डोसा',
          ta: 'சாதாரண தோசை',
          te: 'ప్లెయిన్ దోశ',
          kn: 'ಪ್ಲೈನ್ ದೋಸೆ',
          gu: 'પ્લેન ઢોસા',
          bn: 'প্লেন দোসা',
          ml: 'പ്ലെയിൻ ദോശ',
        },
      },
      {
        slug: 'upma',
        name: 'Upma',
        price: 50,
        veg: true,
        local: {
          hi: 'उपमा',
          mr: 'उपमा',
          ta: 'உப்மா',
          te: 'ఉప్మా',
          kn: 'ಉಪ್ಪಿಟ್ಟು',
          gu: 'ઉપમા',
          bn: 'উপমা',
          ml: 'ഉപ്പുമാവ്',
        },
      },
      {
        slug: 'poori-bhaji',
        name: 'Poori Bhaji',
        price: 80,
        veg: true,
        local: {
          hi: 'पूरी भाजी',
          mr: 'पुरी भाजी',
          ta: 'பூரி பாஜி',
          te: 'పూరీ భాజీ',
          kn: 'ಪೂರಿ ಬಾಜಿ',
          gu: 'પૂરી ભાજી',
          bn: 'পুরি ভাজি',
          ml: 'പൂരി ബാജി',
        },
      },
    ],
  },
  {
    name: 'Starters',
    local: { hi: 'स्टार्टर', mr: 'स्टार्टर', ta: 'ஸ்டார்டர்ஸ்' },
    items: [
      { slug: 'paneer-tikka', name: 'Paneer Tikka', price: 280, veg: true, local: { hi: 'पनीर टिक्का', mr: 'पनीर टिक्का', ta: 'பனீர் டிக்கா' } },
      { slug: 'chicken-65', name: 'Chicken 65', price: 260, veg: false, local: { hi: 'चिकन 65', mr: 'चिकन 65', ta: 'சிக்கன் 65' } },
      { slug: 'veg-spring-roll', name: 'Veg Spring Roll', price: 180, veg: true, local: { hi: 'वेज स्प्रिंग रोल', mr: 'व्हेज स्प्रिंग रोल', ta: 'வெஜ் ஸ்பிரிங் ரோல்' } },
    ],
  },
  {
    name: 'Main Course',
    local: { hi: 'मेन कोर्स', mr: 'मेन कोर्स', ta: 'மெயின் கோர்ஸ்' },
    items: [
      { slug: 'paneer-butter-masala', name: 'Paneer Butter Masala', price: 300, veg: true, local: { hi: 'पनीर बटर मसाला', mr: 'पनीर बटर मसाला', ta: 'பனீர் பட்டர் மசாலா' } },
      { slug: 'dal-makhani', name: 'Dal Makhani', price: 240, veg: true, local: { hi: 'दाल मखनी', mr: 'दाल मखनी', ta: 'தால் மக்னி' } },
      { slug: 'butter-chicken', name: 'Butter Chicken', price: 340, veg: false, local: { hi: 'बटर चिकन', mr: 'बटर चिकन', ta: 'பட்டர் சிக்கன்' } },
    ],
  },
  {
    name: 'Breads',
    local: { hi: 'रोटी-नान', mr: 'रोटी-नान', ta: 'ரொட்டி வகைகள்' },
    items: [
      { slug: 'butter-naan', name: 'Butter Naan', price: 60, veg: true, local: { hi: 'बटर नान', mr: 'बटर नान', ta: 'பட்டர் நான்' } },
      { slug: 'tandoori-roti', name: 'Tandoori Roti', price: 30, veg: true, local: { hi: 'तंदूरी रोटी', mr: 'तंदूरी रोटी', ta: 'தந்தூரி ரொட்டி' } },
      { slug: 'garlic-naan', name: 'Garlic Naan', price: 70, veg: true, local: { hi: 'गार्लिक नान', mr: 'गार्लिक नान', ta: 'கார்லிக் நான்' } },
    ],
  },
  {
    name: 'Rice & Biryani',
    local: { hi: 'चावल और बिरयानी', mr: 'भात आणि बिर्याणी', ta: 'சாதம் & பிரியாணி' },
    items: [
      { slug: 'chicken-biryani', name: 'Chicken Biryani', price: 320, veg: false, local: { hi: 'चिकन बिरयानी', mr: 'चिकन बिर्याणी', ta: 'சிக்கன் பிரியாணி' } },
      { slug: 'veg-pulao', name: 'Veg Pulao', price: 220, veg: true, local: { hi: 'वेज पुलाव', mr: 'व्हेज पुलाव', ta: 'வெஜ் புலாவ்' } },
      { slug: 'jeera-rice', name: 'Jeera Rice', price: 160, veg: true, local: { hi: 'जीरा राइस', mr: 'जिरा राइस', ta: 'ஜீரா ரைஸ்' } },
    ],
  },
  {
    name: 'South Indian',
    local: { hi: 'साउथ इंडियन', mr: 'साउथ इंडियन', ta: 'தென்னிந்திய உணவு' },
    items: [
      { slug: 'masala-dosa', name: 'Masala Dosa', price: 120, veg: true, local: { hi: 'मसाला डोसा', mr: 'मसाला डोसा', ta: 'மசாலா தோசை' } },
      { slug: 'idli-sambar', name: 'Idli Sambar', price: 80, veg: true, local: { hi: 'इडली सांभर', mr: 'इडली सांबार', ta: 'இட்லி சாம்பார்' } },
      { slug: 'medu-vada', name: 'Medu Vada', price: 90, veg: true, local: { hi: 'मेदु वड़ा', mr: 'मेदू वडा', ta: 'மெது வடை' } },
    ],
  },
  {
    name: 'Beverages',
    local: { hi: 'पेय', mr: 'पेये', ta: 'பானங்கள்' },
    items: [
      { slug: 'masala-chai', name: 'Masala Chai', price: 30, veg: true, local: { hi: 'मसाला चाय', mr: 'मसाला चहा', ta: 'மசாலா டீ' } },
      { slug: 'sweet-lassi', name: 'Sweet Lassi', price: 80, veg: true, local: { hi: 'मीठी लस्सी', mr: 'गोड लस्सी', ta: 'ஸ்வீட் லஸ்ஸி' } },
      { slug: 'fresh-lime-soda', name: 'Fresh Lime Soda', price: 70, veg: true, local: { hi: 'फ्रेश लाइम सोडा', mr: 'फ्रेश लाइम सोडा', ta: 'ஃப்ரெஷ் லைம் சோடா' } },
    ],
  },
  {
    name: 'Desserts',
    local: { hi: 'मिठाई', mr: 'गोड पदार्थ', ta: 'இனிப்புகள்' },
    items: [
      { slug: 'gulab-jamun', name: 'Gulab Jamun', price: 90, veg: true, local: { hi: 'गुलाब जामुन', mr: 'गुलाबजाम', ta: 'குலாப் ஜாமூன்' } },
      { slug: 'kulfi', name: 'Malai Kulfi', price: 100, veg: true, local: { hi: 'मलाई कुल्फी', mr: 'मलई कुल्फी', ta: 'மலாய் குல்ஃபி' } },
    ],
  },
];

const TABLES: [string, number][] = [
  ['T1', 2], ['T2', 4], ['T3', 4], ['T4', 6], ['T5', 4], ['T6', 2], ['T7', 4], ['T8', 6], ['T9', 4], ['T10', 8],
];

type CatalogItem = OrderLine & { item_id: string };

function random(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

async function insertOrder(
  db: Database,
  o: {
    shiftId: string;
    businessDate: string;
    createdAt: Date;
    type: 'dine_in' | 'takeaway';
    tableId: string | null;
    party: string | null;
    token: number | null;
    billNo: number | null;
    status: 'open' | 'billed' | 'paid';
    mode: PaymentMode | null;
    lines: OrderLine[];
    discount?: number;
  },
) {
  const id = randomUUID();
  const totals = computeTotals(o.lines, o.discount ?? 0, 5);
  const created = toLocalDateTime(o.createdAt);
  const settled = toLocalDateTime(new Date(o.createdAt.getTime() + 40 * 60000));
  await db.run(
    `INSERT INTO orders (id, shift_id, business_date, type, table_id, party, token, bill_no, status, tax_percent,
       subtotal, discount, tax, round_off, total, payment_mode, created_at, updated_at, billed_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, o.shiftId, o.businessDate, o.type, o.tableId, o.party, o.token, o.billNo, o.status, totals.subtotal,
      totals.discount, totals.tax, totals.round_off, totals.total, o.mode, created, created,
      o.status === 'open' ? null : settled, o.status === 'paid' ? settled : null,
    ],
  );
  for (let i = 0; i < o.lines.length; i++) {
    const l = o.lines[i];
    await db.run(
      `INSERT INTO order_items (id, order_id, item_id, category_id, name, category_name, price, qty, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), id, l.item_id, l.category_id, l.name, l.category_name, l.price, l.qty, i],
    );
  }
}

function pickLines(catalog: CatalogItem[], seed: number): OrderLine[] {
  const count = 1 + Math.floor(random(seed) * 4);
  const chosen = new Map<string, OrderLine>();
  for (let i = 0; i < count; i++) {
    const item = catalog[Math.floor(random(seed + i * 13) * catalog.length)];
    const existing = chosen.get(item.item_id!);
    const qty = 1 + Math.floor(random(seed + i * 7) * 3);
    chosen.set(item.item_id!, { ...item, qty: Math.min(99, (existing?.qty ?? 0) + qty) });
  }
  return [...chosen.values()];
}

/** Sample restaurant: menu, tables, two weeks of night shifts, and a live shift. */
export async function loadSampleRestaurant(db: Database, dayStartHour = 6) {
  const existing = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM items');
  if ((existing?.n ?? 0) > 0) return;

  await db.transaction(async () => {
    const catalog: CatalogItem[] = [];
    for (let c = 0; c < MENU.length; c++) {
      const cat = MENU[c];
      const catId = randomUUID();
      await db.run('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)', [catId, cat.name, c + 1]);
      for (const [lang, value] of Object.entries(cat.local)) {
        await db.run('INSERT OR IGNORE INTO translations (lang, key, value) VALUES (?, ?, ?)', [lang, `category:${catId}`, value]);
      }
      for (let i = 0; i < cat.items.length; i++) {
        const item = cat.items[i];
        const itemId = randomUUID();
        await db.run(
          `INSERT INTO items (id, category_id, name, price, image, is_veg, sort) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, catId, item.name, item.price * 100, `asset:${item.slug}`, item.veg ? 1 : 0, i + 1],
        );
        for (const [lang, value] of Object.entries(item.local)) {
          await db.run('INSERT OR IGNORE INTO translations (lang, key, value) VALUES (?, ?, ?)', [lang, `item:${itemId}`, value]);
        }
        catalog.push({
          item_id: itemId,
          category_id: catId,
          name: item.name,
          category_name: cat.name,
          price: item.price * 100,
          qty: 1,
          note: null,
        });
      }
    }

    const tableIds: string[] = [];
    for (let i = 0; i < TABLES.length; i++) {
      const id = randomUUID();
      tableIds.push(id);
      await db.run('INSERT INTO dining_tables (id, name, seats, sort) VALUES (?, ?, ?, ?)', [id, TABLES[i][0], TABLES[i][1], i + 1]);
    }

    // Live shift: opened two hours ago; its business date is fixed at open time.
    const opened = new Date(Date.now() - 2 * 3600_000);
    const currentDate = businessDateFor(opened, dayStartHour);

    // Closed night shifts for the previous 14 business days: 8 PM to 4:30 AM.
    for (let d = 14; d >= 1; d--) {
      const businessDate = addDays(currentDate, -d);
      const start = parseISODate(businessDate);
      start.setHours(20, 0, 0, 0);
      const end = new Date(start.getTime() + 8.5 * 3600_000);
      const shiftId = randomUUID();
      await db.run('INSERT INTO shifts (id, business_date, name, opened_at, closed_at) VALUES (?, ?, ?, ?, ?)', [
        shiftId, businessDate, 'Shift 1', toLocalDateTime(start), toLocalDateTime(end),
      ]);
      const weekend = [5, 6].includes(start.getDay());
      const count = (weekend ? 34 : 20) + Math.floor(random(d) * 10);
      let token = 0;
      for (let n = 0; n < count; n++) {
        const seed = d * 1000 + n;
        // Busiest around 9–11 PM, tapering after midnight.
        const offsetHours = Math.min(8.2, Math.pow(random(seed + 3), 1.6) * 8.4);
        const createdAt = new Date(start.getTime() + offsetHours * 3600_000);
        const takeaway = random(seed + 5) < 0.38;
        const r = random(seed + 9);
        const mode: PaymentMode = r < 0.5 ? 'upi' : r < 0.82 ? 'cash' : 'card';
        await insertOrder(db, {
          shiftId,
          businessDate,
          createdAt,
          type: takeaway ? 'takeaway' : 'dine_in',
          tableId: takeaway ? null : tableIds[Math.floor(random(seed + 11) * tableIds.length)],
          party: takeaway ? null : 'A',
          token: takeaway ? ++token : null,
          billNo: n + 1,
          status: 'paid',
          mode,
          lines: pickLines(catalog, seed),
          discount: random(seed + 17) < 0.1 ? 5000 : 0,
        });
      }
    }

    const shiftId = randomUUID();
    await db.run('INSERT INTO shifts (id, business_date, name, opened_at) VALUES (?, ?, ?, ?)', [
      shiftId, currentDate, 'Shift 1', toLocalDateTime(opened),
    ]);
    const live = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000);
    const find = (name: string) => catalog.find((c) => c.name === name)!;
    const line = (name: string, qty: number): OrderLine => ({ ...find(name), qty });

    // Settled earlier this shift.
    for (let n = 0; n < 9; n++) {
      await insertOrder(db, {
        shiftId, businessDate: currentDate, createdAt: live(115 - n * 10), type: n % 3 === 0 ? 'takeaway' : 'dine_in',
        tableId: n % 3 === 0 ? null : tableIds[(n * 3) % tableIds.length], party: n % 3 === 0 ? null : 'A',
        token: n % 3 === 0 ? n / 3 + 1 : null, billNo: n + 1, status: 'paid',
        mode: n % 2 ? 'upi' : 'cash', lines: pickLines(catalog, 5000 + n),
      });
    }
    // On the floor now: T4 is shared by two parties, T7 is billed and waiting for payment.
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(48), type: 'dine_in', tableId: tableIds[1], party: 'A', token: null, billNo: null, status: 'open', mode: null, lines: [line('Paneer Butter Masala', 1), line('Butter Naan', 4), line('Sweet Lassi', 2)] });
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(35), type: 'dine_in', tableId: tableIds[3], party: 'A', token: null, billNo: null, status: 'open', mode: null, lines: [line('Chicken Biryani', 2), line('Chicken 65', 1)] });
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(12), type: 'dine_in', tableId: tableIds[3], party: 'B', token: null, billNo: null, status: 'open', mode: null, lines: [line('Masala Dosa', 2), line('Masala Chai', 2)] });
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(62), type: 'dine_in', tableId: tableIds[6], party: 'A', token: null, billNo: 10, status: 'billed', mode: null, lines: [line('Butter Chicken', 1), line('Garlic Naan', 3), line('Jeera Rice', 1), line('Gulab Jamun', 2)] });
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(9), type: 'takeaway', tableId: null, party: null, token: 4, billNo: null, status: 'open', mode: null, lines: [line('Veg Pulao', 2), line('Dal Makhani', 1), line('Tandoori Roti', 6)] });
    await insertOrder(db, { shiftId, businessDate: currentDate, createdAt: live(4), type: 'takeaway', tableId: null, party: null, token: 5, billNo: null, status: 'open', mode: null, lines: [line('Idli Sambar', 3), line('Medu Vada', 2)] });
  });
}
