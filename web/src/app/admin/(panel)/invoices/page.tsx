'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { formatINR } from '@unibody/shared';
import { EmptyState, buttonClass } from '@/components/ui';
import { DataTable, ErrorState, PageHeader, Pagination, SearchInput, type Column } from '@/components/admin/ui';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, daysAgo, useApi, useDebounced } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { useResetPage } from '@/lib/admin/url';
import { fmtDate } from '@/lib/format';

type Row = { id: string; invoiceNo: string; orderNo: string; date: string; customerName: string; total: number };

export default function InvoicesPage() {
  const { can, token } = useAdmin();
  const allowed = can('invoices');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.invoices({ q: dq || undefined, page }), [dq, page], { enabled: allowed });
  useResetPage(setPage, [dq]);
  if (!allowed) return <NoAccess what="invoices" />;
  const cols: Column<Row>[] = [
    { key: 'n', header: 'Invoice', cell: (r) => <span className="font-mono text-[13px] font-semibold">{r.invoiceNo}</span> },
    { key: 'd', header: 'Date', cell: (r) => <span className="text-[13px] text-muted">{fmtDate(r.date)}</span> },
    {
      key: 'o',
      header: 'Order',
      hide: 'sm',
      cell: (r) => (
        <Link href={`/admin/orders/${r.orderNo}`} className="font-mono text-[13px] text-link hover:underline">
          #{r.orderNo}
        </Link>
      ),
    },
    { key: 'c', header: 'Customer', cell: (r) => <span className="font-medium">{r.customerName}</span> },
    { key: 't', header: 'Total', align: 'right', cell: (r) => <span className="font-medium tabular-nums">{formatINR(r.total)}</span> },
    {
      key: 'a',
      header: '',
      align: 'right',
      cell: (r) => (
        <a href={`/admin/invoices/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-link">
          Open <ExternalLink className="size-3.5" />
        </a>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="GST tax invoices are generated automatically when an order ships."
        actions={
          <>
            <a className={buttonClass('outline')} href={adminApi.admin.reportCsvUrl('gst', { from: daysAgo(90), token })}>
              <Download className="size-4" />
              GST register (90 days)
            </a>
          </>
        }
      />
      <SearchInput value={q} onChange={setQ} placeholder="Invoice no., order no. or customer" className="mb-4 w-full sm:w-80" />
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(r) => r.id} onRowClick={(r) => window.open(`/admin/invoices/${r.id}`, '_blank')} empty={<EmptyState icon={<FileText className="size-6" />} title={dq ? 'No invoices match' : 'No invoices yet'} body="Invoices appear once orders are shipped." />} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
