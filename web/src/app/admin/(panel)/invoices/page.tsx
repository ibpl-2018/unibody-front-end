'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileDown, FileText, MessageCircle, Printer } from 'lucide-react';
import { formatINR, type InvoiceDTO } from '@unibody/shared';
import { EmptyState, Skeleton, buttonClass } from '@/components/ui';
import { BulkAction, BulkBar, ErrorState, PageHeader, Pagination, SearchInput } from '@/components/admin/ui';
import { InvoiceDocument } from '@/components/admin/invoice-document';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, daysAgo, useApi, useDebounced, waLink } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { useResetPage } from '@/lib/admin/url';
import { cn } from '@/lib/cn';
import { fmtDate } from '@/lib/format';

type Row = { id: string; invoiceNo: string; orderNo: string; date: string; customerName: string; total: number };

/** Opens the A4 print view; `print=1` brings up the print dialog (which also saves as PDF). */
const printUrl = (id: string) => `/admin/invoices/${id}?print=1`;

function waMessage(inv: InvoiceDTO) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    `Hi ${inv.buyer.name}, here is your Unibody tax invoice ${inv.invoiceNo} for order ${inv.orderNo} — ${formatINR(inv.totals.total)}.\n` +
    `Track your order: ${origin}/track/${inv.orderNo}\nThank you for shopping with Unibody.`
  );
}

function Preview({ id, orderNo }: { id: string; orderNo?: string }) {
  const { data: inv, error, refetch } = useApi(() => adminApi.admin.invoice(id), [id]);
  if (error && !inv) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {orderNo && (
          <p className="mr-auto text-[13px] text-muted">
            Order{' '}
            <Link href={`/admin/orders/${orderNo}`} className="font-mono text-link hover:underline">
              #{orderNo}
            </Link>
          </p>
        )}
        <a
          href={inv ? waLink(inv.buyer.phone, waMessage(inv)) : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!inv}
          className={cn(buttonClass('outline', 'sm'), !inv && 'pointer-events-none opacity-50')}>
          <MessageCircle className="size-4" />
          Send on WhatsApp
        </a>
        <a href={printUrl(id)} target="_blank" rel="noreferrer" className={buttonClass('outline', 'sm')}>
          <Printer className="size-4" />
          Print
        </a>
        <a href={printUrl(id)} target="_blank" rel="noreferrer" className={buttonClass('dark', 'sm')} title="Opens the print dialog — choose “Save as PDF”">
          <FileDown className="size-4" />
          Save as PDF
        </a>
      </div>
      {inv ? (
        <div data-testid="invoice-preview" className="overflow-hidden rounded-2xl border border-line-subtle">
          <InvoiceDocument inv={inv} className="shadow-none" />
        </div>
      ) : (
        <Skeleton className="h-[760px] rounded-2xl" />
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const { can, token } = useAdmin();
  const allowed = can('invoices');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const dq = useDebounced(q.trim(), 300);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.invoices({ q: dq || undefined, page }), [dq, page], { enabled: allowed });
  useResetPage(setPage, [dq]);
  const rows = data?.items;
  // Keep a preview open: the first invoice on the page unless one is picked.
  useEffect(() => {
    if (rows?.length && !rows.some((r) => r.id === active)) setActive(rows[0].id);
  }, [rows, active]);
  if (!allowed) return <NoAccess what="invoices" />;
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });

  const pick = (r: Row) => {
    // Phones get the full-screen A4 view; wide screens preview beside the list.
    if (window.matchMedia('(min-width: 1024px)').matches) setActive(r.id);
    else window.open(`/admin/invoices/${r.id}`, '_blank');
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="GST tax invoices are generated automatically when an order ships."
        actions={
          <a className={buttonClass('outline')} href={adminApi.admin.reportCsvUrl('gst', { from: daysAgo(90), token })}>
            <Download className="size-4" />
            GST register (90 days)
          </a>
        }
      />
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <div className="space-y-3">
            <SearchInput value={q} onChange={setQ} placeholder="Invoice no., order no. or customer" className="w-full" />
            <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
              <BulkAction onClick={() => window.open(`/admin/invoices/batch?ids=${[...selected].join(',')}`, '_blank')}>Print {selected.size > 1 ? `${selected.size} invoices` : 'invoice'}</BulkAction>
            </BulkBar>
            {loading && !rows ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[62px] rounded-2xl" />)
            ) : !rows?.length ? (
              <EmptyState icon={<FileText className="size-6" />} title={dq ? 'No invoices match' : 'No invoices yet'} body="Invoices appear once orders are shipped." />
            ) : (
              <ul className="space-y-2" aria-label="Invoices">
                {rows.map((r) => {
                  const on = r.id === active;
                  return (
                    <li key={r.id} className={cn('flex items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 transition', on ? 'border-accent bg-accent-soft/40 ring-2 ring-accent/15' : 'border-line-subtle hover:border-line')}>
                      <input type="checkbox" aria-label={`Select ${r.invoiceNo}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 shrink-0 accent-[var(--accent)]" />
                      <button type="button" onClick={() => pick(r)} aria-current={on || undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <FileText className={cn('size-5 shrink-0', on ? 'text-accent' : 'text-subtle')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[13px] font-semibold">{r.invoiceNo}</span>
                          <span className="block truncate text-xs text-muted">
                            {r.customerName} · {fmtDate(r.date)}
                          </span>
                        </span>
                        <span className="text-[14px] font-semibold tabular-nums">{formatINR(r.total)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
          </div>
          <section className="hidden lg:sticky lg:top-20 lg:block" aria-label="Invoice preview">
            {active ? (
              <Preview id={active} orderNo={rows?.find((r) => r.id === active)?.orderNo} />
            ) : (
              !loading && <p className="py-20 text-center text-sm text-muted">Pick an invoice to preview it.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
