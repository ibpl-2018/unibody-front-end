'use client';
import { useState } from 'react';
import { Banknote, Boxes, Download, FileSpreadsheet, Landmark, LineChart, Receipt, ShoppingBag, TrendingUp, Truck, Wallet } from 'lucide-react';
import { fyLabel, formatINR } from '@unibody/shared';
import { EmptyState, Input, Skeleton } from '@/components/ui';
import { BarChart } from '@/components/admin/charts';
import { DataTable, ErrorState, KpiCard, PageHeader, Panel, type Column } from '@/components/admin/ui';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, daysAgo, inrCompact, isoDay, pct, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/cn';

type Preset = '30d' | 'month' | 'fy' | 'lastfy' | '12m' | 'custom';
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const fyStart = m >= 3 ? y : y - 1;
  switch (p) {
    case 'month':
      return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: isoDay(now) };
    case 'fy':
      return { from: `${fyStart}-04-01`, to: isoDay(now) };
    case 'lastfy':
      return { from: `${fyStart - 1}-04-01`, to: `${fyStart}-03-31` };
    case '12m':
      return { from: daysAgo(365), to: isoDay(now) };
    default:
      return { from: daysAgo(30), to: isoDay(now) };
  }
}
const monthLabel = (ym: string) => new Date(`${ym}-15T00:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

const CSVS = [
  { kind: 'sales', title: 'Sales register', body: 'Every invoice with taxable value and tax split.', icon: Receipt },
  { kind: 'gst', title: 'GST (GSTR-1 ready)', body: 'Invoice-wise CGST / SGST / IGST by place of supply.', icon: Landmark },
  { kind: 'pnl', title: 'Profit & loss', body: 'Monthly revenue, cost of goods and gross profit.', icon: TrendingUp },
  { kind: 'cod', title: 'COD reconciliation', body: 'Cash-on-delivery orders and collection status.', icon: Banknote },
  { kind: 'purchases', title: 'Purchases', body: 'Supplier bills, payments and payables.', icon: Truck },
  { kind: 'inventory', title: 'Stock valuation', body: 'Current on-hand, reserved and value at cost.', icon: Boxes },
] as const;

export default function ReportsPage() {
  const { can, token } = useAdmin();
  const allowed = can('reports');
  const owner = can('cost');
  const [preset, setPreset] = useState<Preset>('fy');
  const [range, setRange] = useState(presetRange('fy'));
  const { data: r, error, loading, refetch } = useApi(() => adminApi.admin.reportSummary(range), [range.from, range.to], { enabled: allowed });
  if (!allowed) return <NoAccess what="reports" />;
  const pick = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  };
  const fyNow = fyLabel(new Date());
  const monthly = r?.monthly ?? [];
  const catCols: Column<NonNullable<typeof r>['byCategory'][number]>[] = [
    { key: 'n', header: 'Category', cell: (c) => <span className="whitespace-nowrap font-medium">{c.name}</span> },
    { key: 'r', header: 'Revenue', align: 'right', cell: (c) => <span className="tabular-nums">{formatINR(c.revenue)}</span> },
    ...(owner
      ? [
          { key: 'p', header: 'Gross profit', align: 'right' as const, cell: (c: { profit: number }) => <span className="tabular-nums">{formatINR(c.profit)}</span> },
          { key: 'm', header: 'Margin', align: 'right' as const, cell: (c: { margin: number }) => <span className={cn('tabular-nums', c.margin < 0.2 ? 'text-warning' : 'text-success')}>{pct(c.margin)}</span> },
        ]
      : []),
  ];
  const monCols: Column<(typeof monthly)[number]>[] = [
    { key: 'm', header: 'Month', cell: (m) => <span className="font-medium">{monthLabel(m.month)}</span> },
    { key: 'o', header: 'Orders', align: 'right', cell: (m) => <span className="tabular-nums">{m.orders}</span> },
    { key: 'r', header: 'Net sales', align: 'right', cell: (m) => <span className="tabular-nums">{formatINR(m.revenue)}</span> },
    ...(owner
      ? [
          { key: 'c', header: 'COGS', align: 'right' as const, hide: 'sm' as const, cell: (m: { cogs: number }) => <span className="tabular-nums text-muted">{formatINR(m.cogs)}</span> },
          { key: 'g', header: 'Gross profit', align: 'right' as const, cell: (m: { revenue: number; cogs: number }) => <span className="font-medium tabular-nums">{formatINR(m.revenue - m.cogs)}</span> },
          { key: 'gm', header: 'Margin', align: 'right' as const, hide: 'sm' as const, cell: (m: { revenue: number; cogs: number }) => <span className="tabular-nums text-muted">{m.revenue ? pct((m.revenue - m.cogs) / m.revenue) : '—'}</span> },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, GST and profit for your accountant. All amounts include GST unless noted." />
      <div className="mb-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-line-subtle bg-surface p-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {(
            [
              ['30d', 'Last 30 days'],
              ['month', 'This month'],
              ['fy', `FY ${fyNow}`],
              ['lastfy', 'Last FY'],
              ['12m', '12 months'],
            ] as [Preset, string][]
          ).map(([p, l]) => (
            <button key={p} type="button" onClick={() => pick(p)} className={cn('whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition', preset === p ? 'bg-fg text-bg' : 'text-muted hover:bg-surface-2 hover:text-fg')}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <Input type="date" aria-label="From" value={range.from} max={range.to} onChange={(e) => (setPreset('custom'), setRange((x) => ({ ...x, from: e.target.value })))} className="h-10 w-auto text-sm" />
          <span className="text-muted">→</span>
          <Input type="date" aria-label="To" value={range.to} min={range.from} onChange={(e) => (setPreset('custom'), setRange((x) => ({ ...x, to: e.target.value })))} className="h-10 w-auto text-sm" />
        </div>
      </div>

      {error && !r ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          <div className={cn('grid gap-4 sm:grid-cols-2', owner ? 'xl:grid-cols-5' : 'xl:grid-cols-3')}>
            <KpiCard label="Net sales" color="blue" icon={<LineChart />} loading={!r || loading} value={r && formatINR(r.netSales)} hint="Excl. cancelled & returned" />
            {owner && <KpiCard label="Cost of goods" color="pink" icon={<Wallet />} loading={!r || loading} value={r && formatINR(r.cogs)} />}
            {owner && <KpiCard label="Gross profit" color="green" icon={<TrendingUp />} loading={!r || loading} value={r && formatINR(r.grossProfit)} hint={r && r.netSales ? `${pct(r.grossProfit / r.netSales)} margin` : undefined} />}
            <KpiCard label="GST output" color="orange" icon={<Landmark />} loading={!r || loading} value={r && formatINR(r.gstOutput)} hint="Tax collected on invoices" />
            <KpiCard label="Orders" color="purple" icon={<ShoppingBag />} loading={!r || loading} value={r?.orders.toLocaleString('en-IN')} hint={r && r.orders ? `${formatINR(Math.round(r.netSales / r.orders))} average` : undefined} />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            <Panel title="Net sales by month">
              {!r ? (
                <Skeleton className="h-60" />
              ) : monthly.length ? (
                <BarChart
                  height={220}
                  highlightLast={1}
                  format={inrCompact}
                  data={monthly.map((m) => ({
                    key: m.month,
                    label: monthLabel(m.month),
                    value: m.revenue,
                    tooltip: (
                      <div>
                        <p className="font-semibold">{monthLabel(m.month)}</p>
                        <p className="tabular-nums text-muted">
                          {formatINR(m.revenue)} · {m.orders} orders
                          {owner && ` · ${formatINR(m.revenue - m.cogs)} profit`}
                        </p>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <EmptyState title="No sales in this period" />
              )}
            </Panel>
            <Panel title="By category" padded={false}>
              <DataTable className="rounded-none border-0" columns={catCols} rows={r?.byCategory} loading={!r} rowKey={(c) => c.categoryId} dense skeletonRows={6} empty={<EmptyState title="No sales" />} />
            </Panel>
          </div>

          <Panel title="Monthly summary" padded={false}>
            <DataTable className="rounded-none border-0" columns={monCols} rows={r && [...monthly].reverse()} loading={!r} rowKey={(m) => m.month} dense skeletonRows={4} empty={<EmptyState title="No sales in this period" />} />
          </Panel>

          <Panel title="Downloads" action={<span className="text-xs text-muted">CSV · opens in Excel / Google Sheets · uses the dates above</span>}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CSVS.filter((c) => owner || c.kind !== 'pnl').map((c) => (
                <a
                  key={c.kind}
                  href={adminApi.admin.reportCsvUrl(c.kind, { ...range, token })}
                  className="group flex items-start gap-3 rounded-2xl border border-line-subtle p-4 transition hover:border-line hover:bg-surface-2/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <c.icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{c.title}</span>
                    <span className="block text-xs text-muted">{c.body}</span>
                  </span>
                  <Download className="size-4 shrink-0 text-subtle transition group-hover:text-accent" />
                </a>
              ))}
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-subtle">
              <FileSpreadsheet className="size-3.5" />
              Amounts are in rupees with two decimals. Dates are in IST.
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
