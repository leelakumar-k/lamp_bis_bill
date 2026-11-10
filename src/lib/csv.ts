const escape = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** UTF-8 BOM so Excel opens Indian-language text correctly. */
export function toCsv(rows: (string | number)[][]) {
  return `\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`;
}
