'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Banknote, ChevronRight, Download, Package, PackageCheck, Percent, Plus, ReceiptText, ShoppingBag, Truck, UserX, Wallet } from 'lucide-react';
import { formatINR } from '@unibody/shared';
import { Badge, ButtonLink, Segmented, Skeleton, buttonClass, EmptyState } from '@/components/ui';
import { BarChart, Donut, HBarList } from '@/components/admin/charts';
import { DataTable, Delta, ErrorState, KpiCard, Panel, Thumb, ViewAll, changePct } from '@/components/admin/ui';
import { orderColumns } from '@/components/admin/badges';
import { adminApi, daysAgo, greeting, inrCompact, pct, useApi } from '@/lib/admin/api';
import { useAdmin, useLiveRefetch } from '@/lib/admin/session';
import { fmtDateShort, fmtWeekday } from '@/lib/format';
import { cn } from '@/lib/cn';

type Metric = 'revenue' | 'orders' | 'units';

export default function DashboardPage() {
  const router = useRouter();
  const { can, days, user, token } = useAdmin();
  const allowed = can('dashboard');
  useEffect(() => {
    if (!allowed) router.replace('/admin/orders');
  }, [allowed, router]);
  const { data: d, error, initial, refetch } = useApi(() => adminApi.admin.dashboard(days), [days], { enabled: allowed });
  useLiveRefetch(refetch);
  const [metric, setMetric] = useState<Metric>('revenue');
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    document.title = 'Dashboard · Unibody Admin';
  }, []);

  const series = useMemo(
    () =>
      (d?.daily ?? []).map((x) => {
        const v = metric === 'revenue' ? x.revenue : metric === 'orders' ? x.orders : x.units ?? 0;
        return {
          key: x.date,
          label: fmtDateShort(x.date + 'T12:00:00+05:30'),
          value: v,
          tooltip: (
            <div className="space-y-0.5">
              <p className="font-semibold">{fmtWeekday(x.date + 'T12:00:00+05:30')}</p>
              <p className="tabular-nums text-muted">
                {formatINR(x.revenue)} · {x.orders} order{x.orders === 1 ? '' : 's'}
                {x.units !== undefined ? ` · ${x.units} unit${x.units === 1 ? '' : 's'}` : ''}
              </p>
            </div>
          ),
        };
      }),
    [d, metric],
  );
  const stats = useMemo(() => {
    const vals = series.map((s) => s.value);
    const total = vals.reduce((a, b) => a + b, 0);
    const best = series.reduce<(typeof series)[number] | null>((a, b) => (!a || b.value > a.value ? b : a), null);
    return { total, avg: vals.length ? total / vals.length : 0, best };
  }, [series]);
  const fmt = (v: number) => (metric === 'revenue' ? formatINR(v) : Math.round(v).toLocaleString('en-IN'));

  if (!allowed) return null;
  const vs = `vs prev. ${days} days`;
  const exportHref = adminApi.admin.reportCsvUrl('sales', { from: daysAgo(days), token });

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
            {now ? greeting(now) : 'Hello'}, {user.name.split(' ')[0]} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">{now ? fmtWeekday(now) : ' '} · Live — updates in real time</p>
        </div>
        <div className="flex gap-2">
          <a href={exportHref} className={buttonClass('outline', 'md')}>
            <Download className="size-4" />
            Export
          </a>
          {can('productEdit') && (
            <ButtonLink href="/admin/products/new">
              <Plus className="size-4" />
              Add product
            </ButtonLink>
          )}
        </div>
      </div>

      {error && !d ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Revenue" color="blue" icon={<Banknote />} loading={initial} value={d && formatINR(d.revenue)} delta={d && <Delta value={changePct(d.revenue, d.revenuePrev)} label={vs} />} />
            <KpiCard label="Orders" color="green" icon={<ShoppingBag />} loading={initial} value={d?.orders.toLocaleString('en-IN')} delta={d && <Delta value={changePct(d.orders, d.ordersPrev)} label={vs} />} href="/admin/orders" />
            <KpiCard label="Avg. order value" color="purple" icon={<ReceiptText />} loading={initial} value={d && formatINR(d.aov)} delta={d && <Delta value={changePct(d.aov, d.aovPrev)} label={vs} />} />
            {can('cost') ? (
              <KpiCard label="Gross margin" color="orange" icon={<Percent />} loading={initial} value={d && pct(d.grossMargin)} delta={d && <Delta value={(d.grossMargin - d.grossMarginPrev) * 100} pts label={vs} />} />
            ) : (
              <KpiCard
                label="Prepaid share"
                color="orange"
                icon={<Wallet />}
                loading={initial}
                value={d && pct(d.paymentSplit.prepaidCount / Math.max(1, d.paymentSplit.prepaidCount + d.paymentSplit.codCount), 0)}
                hint="of orders paid online"
              />
            )}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Chart */}
            <Panel
              title={`${metric === 'revenue' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Units sold'} · last ${days} days`}
              action={
                <Segmented
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'revenue', label: 'Revenue' },
                    { value: 'orders', label: 'Orders' },
                    { value: 'units', label: 'Units' },
                  ]}
                />
              }
            >
              {initial ? (
                <Skeleton className="h-[290px] w-full" />
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap gap-x-10 gap-y-3">
                    <div>
                      <p className="text-[22px] font-semibold tracking-tight tabular-nums">{fmt(stats.total)}</p>
                      <p className="text-xs text-muted">Total</p>
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold tracking-tight tabular-nums">{metric === 'revenue' ? formatINR(stats.avg) : stats.avg.toFixed(1)}</p>
                      <p className="text-xs text-muted">Daily avg.</p>
                    </div>
                    {stats.best && stats.best.value > 0 && (
                      <div>
                        <p className="text-[22px] font-semibold tracking-tight text-success tabular-nums">{fmt(stats.best.value)}</p>
                        <p className="text-xs text-muted">{stats.best.label} (best day)</p>
                      </div>
                    )}
                  </div>
                  <BarChart data={series} height={220} format={metric === 'revenue' ? inrCompact : (v) => String(Math.round(v))} highlightLast={Math.min(7, Math.ceil(series.length / 4))} />
                </>
              )}
            </Panel>

            {/* Needs attention */}
            <Panel
              title="Needs attention"
              action={
                <Badge tone="success" dot>
                  Live
                </Badge>
              }
            >
              <ul className="space-y-2.5">
                {(
                  [
                    { k: 'codToConfirm', label: 'COD orders to confirm', icon: <Banknote className="text-warning" />, href: '/admin/orders?status=NEW&payment=COD' },
                    { k: 'toPack', label: 'Orders to pack', icon: <Package className="text-accent" />, href: '/admin/orders?status=CONFIRMED' },
                    { k: 'toShip', label: 'Ready to ship (AWB)', icon: <Truck className="text-purple" />, href: '/admin/orders?status=PACKED' },
                    { k: 'lowStock', label: 'Low-stock SKUs', icon: <AlertTriangle className="text-danger" />, href: '/admin/inventory?state=LOW' },
                    { k: 'abandoned', label: 'Abandoned checkouts', icon: <UserX className="text-vivid-indigo" />, href: '/admin/leads' },
                  ] as const
                ).map((a) => (
                  <li key={a.k}>
                    <Link href={a.href} className="flex h-12 items-center gap-3 rounded-xl border border-line-subtle px-3.5 text-sm transition hover:border-line hover:bg-surface-2/60 [&_svg]:size-[18px]">
                      {a.icon}
                      <span className="flex-1 font-medium">{a.label}</span>
                      {initial ? <Skeleton className="h-4 w-6" /> : <span className={cn('font-semibold tabular-nums', d && d.attention[a.k] === 0 && 'text-subtle')}>{d?.attention[a.k]}</span>}
                      <ChevronRight className="!size-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {/* Top parts */}
            <Panel title="Top parts" action={<ViewAll href="/admin/products" />}>
              {initial ? (
                <Skeleton className="h-60" />
              ) : d && d.topProducts.length ? (
                <div className="overflow-hidden rounded-xl border border-line-subtle">
                  <div className="flex justify-between bg-surface-2/70 px-4 py-2 text-xs font-medium text-muted">
                    <span>Part</span>
                    <span>Revenue</span>
                  </div>
                  <ul className="divide-y divide-line-subtle">
                    {d.topProducts.slice(0, 5).map((p) => (
                      <li key={p.productId}>
                        <Link href={`/admin/products/${p.productId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
                          <Thumb icon={p.icon} alt="" src={p.image} size="sm" />
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[13px] font-medium">{p.title}</span>
                            <span className="block truncate text-[11px] text-muted">
                              {p.sku} · {p.units} sold
                            </span>
                          </span>
                          <span className="text-[13px] font-medium tabular-nums">{formatINR(p.revenue)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState title="No sales yet" body="Top-selling parts appear here." />
              )}
            </Panel>

            {/* Payment split */}
            <Panel title="Payment split">
              {initial || !d ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <Donut
                    size={150}
                    thickness={22}
                    slices={[
                      { key: 'cod', value: d.paymentSplit.cod, color: '#5e5ce6' },
                      { key: 'pre', value: d.paymentSplit.prepaid, color: '#30d158' },
                    ]}
                    center={
                      <>
                        <span className="text-lg font-semibold tabular-nums">{d.paymentSplit.codCount + d.paymentSplit.prepaidCount}</span>
                        <span className="text-[11px] text-muted">orders</span>
                      </>
                    }
                  />
                  <div className="space-y-4 text-sm">
                    {[
                      { label: 'Cash on Delivery', color: 'bg-[#5e5ce6]', amt: d.paymentSplit.cod, n: d.paymentSplit.codCount },
                      { label: 'Prepaid', color: 'bg-[#30d158]', amt: d.paymentSplit.prepaid, n: d.paymentSplit.prepaidCount },
                    ].map((r) => {
                      const tot = d.paymentSplit.cod + d.paymentSplit.prepaid;
                      return (
                        <div key={r.label} className="flex gap-2.5">
                          <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-[3px]', r.color)} />
                          <div className="leading-tight">
                            <p className="font-medium">
                              {r.label} · {tot ? Math.round((r.amt / tot) * 100) : 0}%
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-muted">
                              {formatINR(r.amt)} · {r.n} orders
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs font-medium text-warning">COD RTO rate: {pct(d.paymentSplit.rtoRate)}</p>
                  </div>
                </div>
              )}
            </Panel>

            {/* Orders by city */}
            <Panel title="Orders by city" className="lg:col-span-2 xl:col-span-1">
              {initial || !d ? (
                <Skeleton className="h-60" />
              ) : d.byCity.length ? (
                <HBarList
                  items={d.byCity.slice(0, 6).map((c, i) => ({
                    key: c.city,
                    label: c.city,
                    value: c.orders,
                    valueLabel: i === 0 ? `${c.orders} orders` : c.orders,
                    title: `${c.city}: ${c.orders} orders · ${formatINR(c.revenue)}`,
                  }))}
                />
              ) : (
                <EmptyState title="No orders in this range" />
              )}
            </Panel>
          </div>

          <Panel title="Recent orders" action={<ViewAll href="/admin/orders">All orders</ViewAll>}>
            <DataTable
              className="rounded-xl"
              columns={orderColumns({ date: false, items: false })}
              rows={d?.recentOrders.slice(0, 8)}
              loading={initial}
              rowKey={(o) => o.id}
              rowHref={(o) => `/admin/orders/${o.id}`}
              skeletonRows={5}
              empty={<EmptyState icon={<PackageCheck />} title="No orders yet" />}
            />
          </Panel>
        </div>
      )}
    </>
  );
}
