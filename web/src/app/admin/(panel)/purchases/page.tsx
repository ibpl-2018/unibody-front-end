'use client';
import { useState } from 'react';
import { ClipboardList, Download, IndianRupee, Plus, Recycle, Wallet } from 'lucide-react';
import { formatINR, type PurchaseDTO } from '@unibody/shared';
import { ButtonLink, EmptyState, buttonClass } from '@/components/ui';
import { DataTable, ErrorState, KpiCard, PageHeader, Pagination, type Column } from '@/components/admin/ui';
import { PayStateBadge, StockStateBadge } from '@/components/admin/purchase-badges';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, daysAgo, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDate } from '@/lib/format';

export default function PurchasesPage() {
  const { can, token } = useAdmin();
  const allowed = can('purchases');
  const [page, setPage] = useState(1);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.purchases({ page }), [page], { enabled: allowed });
  if (!allowed) return <NoAccess />;
  const s = data?.summary;
  const cols: Column<PurchaseDTO>[] = [
    { key: 'po', header: 'PO', cell: (p) => <span className="font-mono font-semibold">{p.poNo}</span> },
    { key: 'd', header: 'Date', hide: 'md', cell: (p) => <span className="text-[13px] text-muted">{fmtDate(p.date)}</span> },
    {
      key: 's',
      header: 'Supplier',
      cell: (p) => (
        <div className="leading-tight">
          <p className="font-medium">{p.supplierName}</p>
          <p className="text-xs text-muted">{[p.supplierCity, p.reference && `Ref ${p.reference}`].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    {
      key: 'l',
      header: 'Lines',
      hide: 'lg',
      cell: (p) => {
        const donors = p.lines.filter((l) => l.kind === 'DONOR').reduce((a, l) => a + l.qty, 0);
        const parts = p.lines.filter((l) => l.kind === 'PART').reduce((a, l) => a + l.qty, 0);
        return <span className="text-[13px] text-muted">{[parts && `${parts} parts`, donors && `${donors} donor device${donors > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</span>;
      },
    },
    { key: 'a', header: 'Amount', align: 'right', cell: (p) => <span className="font-medium tabular-nums">{formatINR(p.amount)}</span> },
    { key: 'due', header: 'Payable', align: 'right', hide: 'sm', cell: (p) => <span className="tabular-nums text-muted">{p.amount - p.amountPaid ? formatINR(p.amount - p.amountPaid) : '—'}</span> },
    { key: 'pay', header: 'Payment', cell: (p) => <PayStateBadge s={p.paymentState} /> },
    { key: 'st', header: 'Stock', hide: 'md', cell: (p) => <StockStateBadge s={p.stockState} /> },
  ];
  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Parts bought from suppliers and donor devices you harvest for parts."
        actions={
          <>
            {can('reports') && (
              <a className={buttonClass('outline')} href={adminApi.admin.reportCsvUrl('purchases', { from: daysAgo(365), token })}>
                <Download className="size-4" />
                Export
              </a>
            )}
            <ButtonLink href="/admin/purchases/new">
              <Plus className="size-4" />
              New purchase
            </ButtonLink>
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Purchased · last 30 days" color="blue" icon={<IndianRupee />} loading={!s} value={s && formatINR(s.last30)} />
        <KpiCard label="Payable to suppliers" color="orange" icon={<Wallet />} loading={!s} value={s && formatINR(s.payable)} hint="Outstanding across all POs" />
        <KpiCard label="Donor devices to harvest" color="purple" icon={<Recycle />} loading={!s} value={s?.donorsInHarvest} hint="Received, not yet stripped for parts" />
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={cols}
            rows={data?.items}
            loading={loading}
            rowKey={(p) => p.id}
            rowHref={(p) => `/admin/purchases/${p.id}`}
            empty={<EmptyState icon={<ClipboardList className="size-6" />} title="No purchases yet" body="Record stock you buy so costs and margins stay accurate." action={<ButtonLink href="/admin/purchases/new" size="sm">New purchase</ButtonLink>} />}
          />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
