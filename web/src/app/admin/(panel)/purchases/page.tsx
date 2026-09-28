'use client';
import { useEffect, useState } from 'react';
import { ClipboardList, Download, IndianRupee, Plus, Recycle, Wallet, X } from 'lucide-react';
import { formatINR, type PurchaseDTO, type PurchaseLineDTO } from '@unibody/shared';
import { Button, ButtonLink, EmptyState, buttonClass } from '@/components/ui';
import { DataTable, ErrorState, KpiCard, PageHeader, Pagination, Panel, type Column } from '@/components/admin/ui';
import { HarvestForm } from '@/components/admin/harvest-form';
import { PayStateBadge, StockStateBadge } from '@/components/admin/purchase-badges';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, daysAgo, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDate } from '@/lib/format';

/** Donor devices received but not yet stripped for parts. */
const harvestable = (p: PurchaseDTO) => p.lines.filter((l) => l.kind === 'DONOR' && l.received > l.harvested);

export default function PurchasesPage() {
  const { can, token } = useAdmin();
  const allowed = can('purchases');
  const [page, setPage] = useState(1);
  const { data, error, loading, refetch, setData } = useApi(() => adminApi.admin.purchases({ page }), [page], { enabled: allowed });
  // Harvest side panel (wide screens): one donor unit at a time, parts go straight to stock.
  const [harvest, setHarvest] = useState<{ poId: string; lineId: string } | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!wide || harvest || !data) return;
    const po = data.items.find((p) => harvestable(p).length);
    if (po) setHarvest({ poId: po.id, lineId: harvestable(po)[0].id });
  }, [wide, data, harvest]);
  if (!allowed) return <NoAccess />;
  const hpo = harvest && data?.items.find((p) => p.id === harvest.poId);
  const hline = hpo?.lines.find((l) => l.id === harvest?.lineId);
  const openHarvest = (p: PurchaseDTO, l: PurchaseLineDTO) => (wide ? setHarvest({ poId: p.id, lineId: l.id }) : (window.location.href = `/admin/purchases/${p.id}`));
  const saved = (np: PurchaseDTO) => {
    setData((d) => d && { ...d, items: d.items.map((x) => (x.id === np.id ? np : x)), summary: { ...d.summary, donorsInHarvest: Math.max(0, d.summary.donorsInHarvest - 1) } });
    const next = harvestable(np)[0];
    setHarvest(next ? { poId: np.id, lineId: next.id } : null);
  };
  const s = data?.summary;
  const cols: Column<PurchaseDTO>[] = [
    { key: 'po', header: 'PO', cell: (p) => <span className="whitespace-nowrap font-mono font-semibold">{p.poNo}</span> },
    {
      key: 's',
      header: 'Supplier & items',
      cell: (p) => {
        const donors = p.lines.filter((l) => l.kind === 'DONOR').reduce((a, l) => a + l.qty, 0);
        const parts = p.lines.filter((l) => l.kind === 'PART').reduce((a, l) => a + l.qty, 0);
        return (
          <div className="min-w-[160px] leading-tight">
            <p className="font-medium">
              {p.supplierName}
              {p.supplierCity && <span className="font-normal text-muted"> · {p.supplierCity}</span>}
            </p>
            <p className="text-xs text-muted">{[fmtDate(p.date), parts && `${parts} parts`, donors && `${donors} donor device${donors > 1 ? 's' : ''}`, p.reference && `Ref ${p.reference}`].filter(Boolean).join(' · ')}</p>
          </div>
        );
      },
    },
    { key: 'a', header: 'Amount', align: 'right', cell: (p) => <span className="font-medium tabular-nums">{formatINR(p.amount)}</span> },
    { key: 'due', header: 'Payable', align: 'right', hide: 'lg', cell: (p) => <span className="tabular-nums text-muted">{p.amount - p.amountPaid ? formatINR(p.amount - p.amountPaid) : '—'}</span> },
    { key: 'pay', header: 'Payment', cell: (p) => <PayStateBadge s={p.paymentState} /> },
    { key: 'st', header: 'Stock', hide: 'md', cell: (p) => <StockStateBadge s={p.stockState} /> },
    {
      key: 'h',
      header: '',
      align: 'right',
      cell: (p) => {
        const l = harvestable(p)[0];
        return l ? (
          <Button
            size="sm"
            variant={harvest?.poId === p.id ? 'dark' : 'outline'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openHarvest(p, l);
            }}>
            <Recycle className="size-4" />
            Harvest
          </Button>
        ) : null;
      },
    },
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
      <div className={hline ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]' : ''}>
        <div className="min-w-0">
          {error && !data ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : (
            <>
              <DataTable
                columns={hline ? cols.filter((c) => c.key !== 'due') : cols}
                rows={data?.items}
                loading={loading}
                rowKey={(p) => p.id}
                rowHref={(p) => `/admin/purchases/${p.id}`}
                empty={<EmptyState icon={<ClipboardList className="size-6" />} title="No purchases yet" body="Record stock you buy so costs and margins stay accurate." action={<ButtonLink href="/admin/purchases/new" size="sm">New purchase</ButtonLink>} />}
              />
              {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
            </>
          )}
        </div>
        {hpo && hline && (
          <Panel
            className="xl:sticky xl:top-20"
            title={
              <span>
                Harvest · <span className="font-mono">{hpo.poNo}</span>
              </span>
            }
            action={
              <button type="button" aria-label="Close harvest" onClick={() => setHarvest(null)} className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-4" />
              </button>
            }>
            <p className="-mt-2 mb-4 text-[13px] text-muted" data-testid="harvest-unit">
              Donor unit #{hline.harvested + 1} of {hline.qty} · {hline.description} · cost {formatINR(hline.unitCost)}
            </p>
            <HarvestForm key={`${hline.id}-${hline.harvested}`} p={hpo} line={hline} compact onCancel={() => setHarvest(null)} onSaved={saved} />
          </Panel>
        )}
      </div>
    </>
  );
}
