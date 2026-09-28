import { PAYMENT_METHOD_LABEL, formatINR, formatPhone, type InvoiceDTO } from '@unibody/shared';
import { cn } from '@/lib/cn';
import { fmtDate } from '@/lib/format';

const m = (p: number) => formatINR(p, { decimals: true }).replace('₹', '');

/** One A4 GST tax invoice. Used by the single-invoice page and batch printing (one per printed page). */
export function InvoiceDocument({ inv, className }: { inv: InvoiceDTO; className?: string }) {
  return (
    <article className={cn('mx-auto max-w-[820px] bg-white p-8 text-[12px] leading-relaxed text-neutral-900 shadow-card sm:p-12 print:max-w-none print:p-0 print:shadow-none', className)}>
      <header className="flex flex-col justify-between gap-6 border-b-2 border-neutral-900 pb-5 sm:flex-row">
        <div>
          <div className="flex items-center gap-2">
            <span className="gradient-brand flex size-8 items-center justify-center rounded-lg text-white print:[print-color-adjust:exact]">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight">Unibody</span>
          </div>
          <p className="mt-3 text-[13px] font-semibold">{inv.seller.legalName}</p>
          <p className="max-w-[300px] text-neutral-600">{inv.seller.address}</p>
          <p className="mt-1">
            <span className="text-neutral-500">GSTIN:</span> <span className="font-mono font-semibold">{inv.seller.gstin}</span>
          </p>
          <p>
            <span className="text-neutral-500">State:</span> {inv.seller.state} ({inv.seller.stateCode})
          </p>
        </div>
        <div className="sm:text-right">
          <h1 className="text-[22px] font-bold tracking-tight">TAX INVOICE</h1>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Original for recipient</p>
          <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 sm:justify-end">
            <dt className="text-neutral-500">Invoice no.</dt>
            <dd className="font-mono font-semibold">{inv.invoiceNo}</dd>
            <dt className="text-neutral-500">Invoice date</dt>
            <dd>{fmtDate(inv.date)}</dd>
            <dt className="text-neutral-500">Order no.</dt>
            <dd className="font-mono">{inv.orderNo}</dd>
            <dt className="text-neutral-500">Payment</dt>
            <dd>{PAYMENT_METHOD_LABEL[inv.paymentMethod]}</dd>
          </dl>
        </div>
      </header>

      <section className="grid gap-6 border-b border-neutral-200 py-5 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">Bill to / Ship to</p>
          <p className="text-[13px] font-semibold">{inv.buyer.name}</p>
          <p className="text-neutral-700">{inv.buyer.address}</p>
          <p className="text-neutral-700">{formatPhone(inv.buyer.phone)}</p>
          {inv.buyer.gstin && (
            <p className="mt-1">
              <span className="text-neutral-500">GSTIN:</span> <span className="font-mono font-semibold">{inv.buyer.gstin}</span>
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">Place of supply</p>
          <p className="text-[13px] font-semibold">
            {inv.buyer.state} ({inv.buyer.stateCode})
          </p>
          <p className="text-neutral-600">{inv.intraState ? 'Intra-state supply · CGST + SGST' : 'Inter-state supply · IGST'}</p>
          <p className="text-neutral-600">Reverse charge: No</p>
        </div>
      </section>

      <table className="mt-5 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="border-y border-neutral-900 text-left text-[10.5px] uppercase tracking-wide text-neutral-600">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Description</th>
            <th className="py-2 pr-2 font-semibold">HSN/SAC</th>
            <th className="py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="py-2 pr-2 text-right font-semibold">Taxable ₹</th>
            {inv.intraState ? (
              <>
                <th className="py-2 pr-2 text-right font-semibold">CGST</th>
                <th className="py-2 pr-2 text-right font-semibold">SGST</th>
              </>
            ) : (
              <th className="py-2 pr-2 text-right font-semibold">IGST</th>
            )}
            <th className="py-2 text-right font-semibold">Total ₹</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i} className="border-b border-neutral-200 align-top">
              <td className="py-2.5 pr-2 text-neutral-500">{i + 1}</td>
              <td className="py-2.5 pr-2">{l.description}</td>
              <td className="py-2.5 pr-2 font-mono">{l.hsn}</td>
              <td className="py-2.5 pr-2 text-right tabular-nums">{l.qty}</td>
              <td className="py-2.5 pr-2 text-right tabular-nums">{m(l.taxable)}</td>
              {inv.intraState ? (
                <>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {m(l.cgst)}
                    <span className="block text-[10px] text-neutral-500">@{l.gstRate / 2}%</span>
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {m(l.sgst)}
                    <span className="block text-[10px] text-neutral-500">@{l.gstRate / 2}%</span>
                  </td>
                </>
              ) : (
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {m(l.igst)}
                  <span className="block text-[10px] text-neutral-500">@{l.gstRate}%</span>
                </td>
              )}
              <td className="py-2.5 text-right font-medium tabular-nums">{m(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 flex flex-col-reverse justify-between gap-6 sm:flex-row">
        <div className="max-w-[360px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">Amount in words</p>
          <p className="mt-0.5 text-[13px] font-semibold">{inv.amountInWords}</p>
          <p className="mt-4 text-[10.5px] text-neutral-500">{inv.notes}</p>
        </div>
        <dl className="grid min-w-[260px] grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
          <dt className="text-neutral-600">Taxable value</dt>
          <dd className="text-right">₹{m(inv.totals.taxable)}</dd>
          {inv.intraState ? (
            <>
              <dt className="text-neutral-600">CGST</dt>
              <dd className="text-right">₹{m(inv.totals.cgst)}</dd>
              <dt className="text-neutral-600">SGST</dt>
              <dd className="text-right">₹{m(inv.totals.sgst)}</dd>
            </>
          ) : (
            <>
              <dt className="text-neutral-600">IGST</dt>
              <dd className="text-right">₹{m(inv.totals.igst)}</dd>
            </>
          )}
          <dt className="mt-1 border-t border-neutral-900 pt-2 text-[14px] font-bold">Invoice total</dt>
          <dd className="mt-1 border-t border-neutral-900 pt-2 text-right text-[14px] font-bold">₹{m(inv.totals.total)}</dd>
        </dl>
      </section>

      <footer className="mt-12 flex items-end justify-between gap-6 border-t border-neutral-200 pt-5">
        <p className="text-[10px] text-neutral-500">This is a computer-generated invoice and does not require a physical signature.</p>
        <div className="text-right">
          <p className="text-[11px]">For {inv.seller.legalName}</p>
          <p className="mt-10 border-t border-neutral-400 pt-1 text-[10px] text-neutral-500">Authorised signatory</p>
        </div>
      </footer>
    </article>
  );
}
