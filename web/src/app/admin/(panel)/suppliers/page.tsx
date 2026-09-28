'use client';
import { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Phone, Plus, Truck } from 'lucide-react';
import { formatINR, type SupplierDTO } from '@unibody/shared';
import { Button, EmptyState } from '@/components/ui';
import { DataTable, ErrorState, PageHeader, SearchInput, StatMini, type Column } from '@/components/admin/ui';
import { SupplierModal } from '@/components/admin/supplier-modal';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, telLink, useApi, waLink } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';

export default function SuppliersPage() {
  const { can } = useAdmin();
  const allowed = can('suppliers');
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.suppliers(), [], { enabled: allowed });
  const [modal, setModal] = useState<{ item?: SupplierDTO } | null>(null);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data?.filter((s) => !t || s.name.toLowerCase().includes(t) || (s.city ?? '').toLowerCase().includes(t) || (s.gstin ?? '').toLowerCase().includes(t));
  }, [data, q]);
  if (!allowed) return <NoAccess />;

  const cols: Column<SupplierDTO>[] = [
    {
      key: 'n',
      header: 'Supplier',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint-peach text-sm font-semibold text-warning">{s.name.slice(0, 1)}</span>
          <div className="leading-tight">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-muted">{s.city ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'g', header: 'GSTIN', hide: 'md', cell: (s) => <span className="font-mono text-xs">{s.gstin ?? '—'}</span> },
    { key: 'c', header: 'POs', align: 'right', hide: 'sm', cell: (s) => <span className="tabular-nums">{s.purchaseCount}</span> },
    { key: 't', header: 'Total purchased', align: 'right', cell: (s) => <span className="tabular-nums">{formatINR(s.totalPurchased)}</span> },
    { key: 'p', header: 'Payable', align: 'right', cell: (s) => <span className={s.payable ? 'font-semibold tabular-nums text-warning' : 'tabular-nums text-subtle'}>{s.payable ? formatINR(s.payable) : '—'}</span> },
    {
      key: 'a',
      header: '',
      align: 'right',
      cell: (s) => (
        <span className="inline-flex">
          {s.phone && (
            <>
              <a href={telLink(s.phone)} aria-label={`Call ${s.name}`} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
                <Phone className="size-4" />
              </a>
              <a href={waLink(s.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${s.name}`} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-success">
                <MessageCircle className="size-4" />
              </a>
            </>
          )}
          <button type="button" aria-label="Edit" onClick={() => setModal({ item: s })} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
            <Pencil className="size-4" />
          </button>
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Who you buy parts and donor devices from."
        actions={
          <Button onClick={() => setModal({})}>
            <Plus className="size-4" />
            Add supplier
          </Button>
        }
      />
      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatMini label="Suppliers" value={data.length} />
          <StatMini label="Total purchased" value={formatINR(data.reduce((a, s) => a + s.totalPurchased, 0))} />
          <StatMini label="Payable" value={formatINR(data.reduce((a, s) => a + s.payable, 0))} tone="warning" />
        </div>
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Search name, city or GSTIN" className="mb-4 w-full sm:w-72" />
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable columns={cols} rows={rows} loading={loading} rowKey={(s) => s.id} onRowClick={(s) => setModal({ item: s })} empty={<EmptyState icon={<Truck className="size-6" />} title="No suppliers yet" />} />
      )}
      {modal && <SupplierModal item={modal.item} onClose={() => setModal(null)} onSaved={() => void refetch()} />}
    </>
  );
}
