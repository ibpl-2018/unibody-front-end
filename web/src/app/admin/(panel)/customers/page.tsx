'use client';
import { useState } from 'react';
import { Users } from 'lucide-react';
import { formatINR, formatPhone, type CustomerDTO } from '@unibody/shared';
import { Badge, EmptyState } from '@/components/ui';
import { DataTable, ErrorState, FilterSelect, PageHeader, Pagination, SearchInput, StatMini, type Column } from '@/components/admin/ui';
import { CrmTabs } from '@/components/admin/crm-tabs';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, pct, useApi, useDebounced } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { useResetPage } from '@/lib/admin/url';
import { fmtDate } from '@/lib/format';

type T = '' | 'guest' | 'registered' | 'b2b';

export default function CustomersPage() {
  const { can, counts } = useAdmin();
  const allowed = can('customers');
  const [q, setQ] = useState('');
  const [type, setType] = useState<T>('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.customers({ q: dq || undefined, type: type || undefined, page }), [dq, type, page], { enabled: allowed });
  useResetPage(setPage, [dq, type]);
  if (!allowed) return <NoAccess what="customers" />;
  const s = data?.summary;
  const cols: Column<CustomerDTO>[] = [
    {
      key: 'n',
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-sm font-semibold text-purple">{(c.name ?? '?').slice(0, 1).toUpperCase()}</span>
          <div className="leading-tight">
            <p className="font-medium">{c.name ?? 'Unnamed'}</p>
            <p className="text-xs tabular-nums text-muted">{formatPhone(c.phone)}</p>
          </div>
        </div>
      ),
    },
    { key: 'city', header: 'City', hide: 'md', cell: (c) => c.city ?? <span className="text-subtle">—</span> },
    {
      key: 't',
      header: 'Type',
      hide: 'sm',
      cell: (c) => (
        <span className="inline-flex gap-1">
          {c.isB2B && <Badge tone="purple">B2B</Badge>}
          <Badge tone={c.registered ? 'info' : 'neutral'}>{c.registered ? 'Registered' : 'Guest'}</Badge>
        </span>
      ),
    },
    { key: 'o', header: 'Orders', align: 'right', cell: (c) => <span className="tabular-nums">{c.orderCount}</span> },
    { key: 'ltv', header: 'Lifetime value', align: 'right', cell: (c) => <span className="font-medium tabular-nums">{formatINR(c.lifetimeValue)}</span> },
    { key: 'l', header: 'Last order', hide: 'lg', cell: (c) => <span className="text-[13px] text-muted">{c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—'}</span> },
  ];
  return (
    <>
      <PageHeader title="Customers & Leads" subtitle="Everyone who has ordered or verified their phone. Sorted by lifetime value." />
      <CrmTabs value="customers" openLeads={counts.openLeads} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatMini label="Customers" value={s ? s.total.toLocaleString('en-IN') : '—'} />
        <StatMini label="Checked out as guest" value={s ? pct(s.guestPct, 0) : '—'} />
        <StatMini label="Repeat purchase rate" value={s ? pct(s.repeatRate, 0) : '—'} tone="success" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Name or phone" className="w-full sm:w-72" />
        <FilterSelect
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'All' },
            { value: 'guest', label: 'Guest' },
            { value: 'registered', label: 'Registered' },
            { value: 'b2b', label: 'B2B / repair shops' },
          ]}
        />
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(c) => c.id} rowHref={(c) => `/admin/customers/${c.id}`} empty={<EmptyState icon={<Users className="size-6" />} title="No customers match" />} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
