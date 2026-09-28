/**
 * All money in Unibody is stored and transmitted as integer paise (₹1 = 100 paise).
 * These helpers convert and format without relying on Intl (Hermes on older devices
 * has partial Intl support), using Indian digit grouping (12,34,567).
 */
export const rupees = (r: number): number => Math.round(r * 100);
export const toRupees = (paise: number): number => paise / 100;

function groupIndian(intStr: string): string {
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
}

/** formatINR(1499900) -> "₹14,999"; formatINR(1499950, { decimals: true }) -> "₹14,999.50" */
export function formatINR(paise: number, opts: { decimals?: boolean; sign?: boolean } = {}): string {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  let out: string;
  if (opts.decimals) {
    const whole = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    out = groupIndian(String(whole)) + '.' + frac;
  } else {
    out = groupIndian(String(Math.round(abs / 100)));
  }
  const sign = neg ? '−' : opts.sign ? '+' : '';
  return `${sign}₹${out}`;
}

/** Percent off MRP, rounded down. */
export function percentOff(price: number, mrp?: number | null): number {
  if (!mrp || mrp <= price) return 0;
  return Math.floor(((mrp - price) / mrp) * 100);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')).trim();
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? ONES[h] + ' Hundred' : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}
/** Indian-system amount in words for invoices: 1741700 -> "Rupees Seventeen Thousand Four Hundred Seventeen Only" */
export function amountInWords(paise: number): string {
  let n = Math.round(paise / 100);
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (n) parts.push(threeDigits(n));
  return 'Rupees ' + parts.join(' ') + ' Only';
}
