/**
 * GST helpers. Selling prices are tax-inclusive. For an intra-state sale tax is split
 * CGST + SGST; for inter-state it is IGST. Discounts are spread across lines
 * proportionally before tax so the invoice reconciles to the rupee.
 */
export interface TaxLineInput {
  description: string;
  hsn: string;
  qty: number;
  /** tax-inclusive line amount after any line-level adjustments, paise */
  amount: number;
  gstRate: number;
}

export interface TaxLine extends TaxLineInput {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export function splitTax(amount: number, rate: number, intraState: boolean) {
  const taxable = Math.round((amount * 100) / (100 + rate));
  const tax = amount - taxable;
  if (intraState) {
    const cgst = Math.floor(tax / 2);
    return { taxable, cgst, sgst: tax - cgst, igst: 0 };
  }
  return { taxable, cgst: 0, sgst: 0, igst: tax };
}

/** Distribute a total discount across line amounts proportionally (largest remainder). */
export function distributeDiscount(amounts: number[], discount: number): number[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (!discount || !total) return amounts.slice();
  const raw = amounts.map((a) => (a * discount) / total);
  const floored = raw.map(Math.floor);
  let rem = discount - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rem <= 0) break;
    floored[i] += 1;
    rem -= 1;
  }
  return amounts.map((a, i) => a - floored[i]);
}

export function buildTaxLines(lines: TaxLineInput[], discount: number, intraState: boolean): { lines: TaxLine[]; totals: { taxable: number; cgst: number; sgst: number; igst: number; total: number } } {
  const adjusted = distributeDiscount(
    lines.map((l) => l.amount),
    discount,
  );
  const out = lines.map((l, i) => ({ ...l, amount: adjusted[i], ...splitTax(adjusted[i], l.gstRate, intraState) }));
  const totals = out.reduce(
    (a, l) => ({ taxable: a.taxable + l.taxable, cgst: a.cgst + l.cgst, sgst: a.sgst + l.sgst, igst: a.igst + l.igst, total: a.total + l.amount }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );
  return { lines: out, totals };
}

/** Indian financial year label for a date, e.g. 27 Sep 2026 -> "26-27". */
export function fyLabel(d: Date): string {
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

export const GST_STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', Punjab: '03', Chandigarh: '04', Uttarakhand: '05', Haryana: '06', Delhi: '07', Rajasthan: '08', 'Uttar Pradesh': '09', Bihar: '10', Sikkim: '11', 'Arunachal Pradesh': '12', Nagaland: '13', Manipur: '14', Mizoram: '15', Tripura: '16', Meghalaya: '17', Assam: '18', 'West Bengal': '19', Jharkhand: '20', Odisha: '21', Chhattisgarh: '22', 'Madhya Pradesh': '23', Gujarat: '24', 'Dadra and Nagar Haveli and Daman and Diu': '26', Maharashtra: '27', Karnataka: '29', Goa: '30', Lakshadweep: '31', Kerala: '32', 'Tamil Nadu': '33', Puducherry: '34', 'Andaman and Nicobar Islands': '35', Telangana: '36', 'Andhra Pradesh': '37', Ladakh: '38',
};
