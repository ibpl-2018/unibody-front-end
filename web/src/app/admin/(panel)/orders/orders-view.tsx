'use client';
import { useEffect, useState } from 'react';
import { Download, Inbox, Printer } from 'lucide-react';
import { ADMIN_STATUS_LABEL, type OrderStatus } from '@unibody/shared';
import { buttonClass, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { BulkAction, BulkBar, DataTable, Dropdown, ErrorState, FilterSelect, MenuItem, PageHeader, Pagination, PillTabs, SearchInput, useConfirm, type Column } from '@/components/admin/ui';
import { orderColumns } from '@/components/admin/badges';
import { adminApi, daysAgo, errMsg, useApi, useDebounced } from '@/lib/admin/api';
import { useAdmin, useLiveRefetch } from '@/lib/admin/session';
import { syncQuery, useResetPage } from '@/lib/admin/url';
import type { AdminOrderListItem } from '@unibody/shared';

type Tab = OrderStatus | 'ALL';
const TABS: Tab[] = ['ALL', 'NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const BULK: { to: OrderStatus; label: string }[] = [
  { to: 'CONFIRMED', label: 'Confirm (COD call done)' },
  { to: 'PACKED', label: 'Mark packed' },
  { to: 'SHIPPED', label: 'Mark shipped' },
  { to: 'DELIVERED', label: 'Mark delivered' },
];

export function OrdersView({ initial }: { initial: { status: string; q: string; payment: string; city: string; page: number } }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { can, token, refreshCounts } = useAdmin();
  const [status, setStatus] = useState<Tab>((TABS as string[]).includes(initial.status) ? (initial.status as Tab) : 'ALL');
  const [q, setQ] = useState(initial.q);
  const [payment, setPayment] = useState<'' | 'COD' | 'PREPAID'>(initial.payment === 'COD' || initial.payment === 'PREPAID' ? initial.payment : '');
  const [city, setCity] = useState(initial.city);
  const [page, setPage] = useState(initial.page || 1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const dq = useDebounced(q.trim(), 300);
  const pageSize = 20;

  const { data, error, loading, refetch } = useApi(() => adminApi.admin.orders({ status, q: dq, payment: payment || undefined, city: city || undefined, page, pageSize }), [status, dq, payment, city, page]);
  useLiveRefetch(refetch);

  useEffect(() => syncQuery({ status, q: dq, payment, city, page }), [status, dq, payment, city, page]);
  useResetPage(setPage, [status, dq, payment, city]);
  useEffect(() => setSelected(new Set()), [status, dq, payment, city, page]);

  const counts = data?.counts ?? {};
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));
  const toggleAll = (ids: string[], on: boolean) => setSelected(on ? new Set(ids) : new Set());

  async function bulk(to: OrderStatus) {
    const ids = [...selected];
    if (to === 'CANCELLED' && !(await confirm({ title: `Cancel ${ids.length} order${ids.length > 1 ? 's' : ''}?`, body: 'Reserved stock is released and customers are notified. Prepaid orders are marked for refund.', confirmLabel: 'Cancel orders', danger: true }))) return;
    setBulkBusy(true);
    try {
      const r = await adminApi.admin.bulkStatus(ids, to);
      if (r.updated) toast(`${r.updated} order${r.updated > 1 ? 's' : ''} → ${ADMIN_STATUS_LABEL[to]}`);
      if (r.failed.length) toast(`${r.failed.length} skipped: ${r.failed[0].message}`, 'error');
      setSelected(new Set());
      await refetch();
      refreshCounts();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<AdminOrderListItem>[] = [
    ...orderColumns(),
    {
      key: 'menu',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (o) => (
        <Dropdown>
          {(close) => (
            <>
              <MenuItem href={`/admin/orders/${o.id}`} onClick={close}>
                Open order
              </MenuItem>
              <MenuItem href={`/admin/labels?ids=${o.id}`} target="_blank" icon={<Printer />} onClick={close}>
                Print shipping label
              </MenuItem>
              <MenuItem href={`/track?order=${o.orderNo}&phone=${o.phone}`} target="_blank" onClick={close}>
                Customer tracking page
              </MenuItem>
            </>
          )}
        </Dropdown>
      ),
    },
  ];

  const tabLabel = (t: Tab) => (t === 'ALL' ? 'All' : ADMIN_STATUS_LABEL[t]);
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order updates the customer’s tracking page instantly."
        actions={
          can('reports') && (
            <a className={buttonClass('outline')} href={adminApi.admin.reportCsvUrl('sales', { from: daysAgo(90), token })}>
              <Download className="size-4" />
              Export CSV
            </a>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <PillTabs value={status} onChange={setStatus} tabs={TABS.filter((t) => t === 'ALL' || counts[t] || t === status || ['NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(t)).map((t) => ({ value: t, label: tabLabel(t), count: data ? counts[t] ?? 0 : undefined }))} />
        <div className="flex flex-wrap gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search order no., name or phone" className="w-full sm:w-72" />
          <FilterSelect
            label="Payment"
            value={payment}
            onChange={setPayment}
            options={[
              { value: '', label: 'All' },
              { value: 'COD', label: 'COD' },
              { value: 'PREPAID', label: 'Prepaid' },
            ]}
          />
          <FilterSelect label="City" value={city} onChange={setCity} options={[{ value: '', label: 'All' }, ...[...new Set([...(data?.cities ?? []), ...(city ? [city] : [])])].map((c) => ({ value: c, label: c }))]} />
        </div>
      </div>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        {BULK.map((b) => (
          <BulkAction key={b.to} disabled={bulkBusy} onClick={() => bulk(b.to)}>
            {b.label}
          </BulkAction>
        ))}
        <BulkAction onClick={() => window.open(`/admin/labels?ids=${[...selected].join(',')}`, '_blank')}>Print labels</BulkAction>
        <BulkAction disabled={bulkBusy} onClick={() => bulk('CANCELLED')}>
          <span className="text-[#ff6961]">Cancel</span>
        </BulkAction>
      </BulkBar>

      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            rowKey={(o) => o.id}
            rowHref={(o) => `/admin/orders/${o.id}`}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            className={loading && data ? 'opacity-70 transition-opacity' : undefined}
            empty={<EmptyState icon={<Inbox className="size-6" />} title={dq || payment || city ? 'No orders match these filters' : `No ${status === 'ALL' ? '' : tabLabel(status).toLowerCase() + ' '}orders`} body="New orders show up here the moment they’re placed." />}
          />
          {data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
