import { shareFile } from './file-io';
import { type ReceiptModel, receiptHtml, receiptText } from './receipt';

/** Prints the receipt from a hidden frame so only the bill (not the app) is printed. */
export async function printReceipt(model: ReceiptModel) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(receiptHtml(model));
  doc.close();
  await new Promise((resolve) => setTimeout(resolve, 250));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 2000);
}

export async function shareReceipt(model: ReceiptModel, name: string) {
  await shareFile(`${name}.txt`, 'text/plain', receiptText(model));
}
