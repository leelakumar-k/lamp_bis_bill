// Desktop browsers don't always have fonts for Indian scripts, so the web build
// loads the Noto families (one per script) and lists them as fallbacks.
const families = [
  'Noto Sans',
  'Noto Sans Devanagari',
  'Noto Sans Gujarati',
  'Noto Sans Bengali',
  'Noto Sans Tamil',
  'Noto Sans Telugu',
  'Noto Sans Kannada',
  'Noto Sans Malayalam',
];

export const fontFamily = [...families.map((f) => `"${f}"`), 'system-ui', 'sans-serif'].join(', ');

let loaded = false;

export function loadWebFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const query = families.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  document.head.appendChild(link);
}
