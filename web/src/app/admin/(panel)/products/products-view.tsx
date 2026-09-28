'use client';
import { useEffect, useState } from 'react';
import { Copy, ExternalLink, PackageSearch, Pencil, Plus, Trash2 } from 'lucide-react';
import { CONDITIONS, CONDITION_SHORT, formatINR, isHeld, type AdminProductListItem, type Condition } from '@unibody/shared';
import { Button, ButtonLink, ConditionBadge, EmptyState, Switch } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { BulkAction, BulkBar, DataTable, Dropdown, ErrorState, FilterSelect, MenuItem, PageHeader, Pagination, SearchInput, Thumb, useConfirm, type Column } from '@/components/admin/ui';
import { StockPill } from '@/components/admin/badges';
import { adminApi, errMsg, useApi, useDebounced } from '@/lib/admin/api';
import { useCatalog } from '@/lib/admin/catalog';
import { useAdmin } from '@/lib/admin/session';
import { syncQuery, useResetPage } from '@/lib/admin/url';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';

type Stock = '' | 'low' | 'out';
export interface ProductFilters {
  q: string;
  family: string;
  category: string;
  condition: string;
  status: string;
  stock: string;
  page: number;
}

export function ProductsView({ initial }: { initial: ProductFilters }) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { can } = useAdmin();
  const edit = can('productEdit');
  const { data: cat } = useCatalog();
  const [q, setQ] = useState(initial.q);
  const [family, setFamily] = useState(initial.family);
  const [category, setCategory] = useState(initial.category);
  const [condition, setCondition] = useState(initial.condition);
  const [status, setStatus] = useState(initial.status);
  const [stock, setStock] = useState<Stock>(initial.stock === 'low' || initial.stock === 'out' ? initial.stock : '');
  const [page, setPage] = useState(initial.page || 1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const dq = useDebounced(q.trim(), 300);
  const pageSize = 25;

  const { data, error, loading, refetch, setData } = useApi(
    () => adminApi.admin.products({ q: dq, family: family || undefined, category: category || undefined, condition: condition || undefined, status: status || undefined, stock: stock || undefined, page, pageSize }),
    [dq, family, category, condition, status, stock, page],
  );
  const totals = useApi(() => Promise.all([adminApi.admin.products({ pageSize: 1 }), adminApi.admin.products({ pageSize: 1, status: 'ACTIVE' })]), []);
  useResetPage(setPage, [dq, family, category, condition, status, stock]);
  useEffect(() => syncQuery({ q: dq, family, category, condition, status, stock, page }), [dq, family, category, condition, status, stock, page]);
  useEffect(() => setSelected(new Set()), [dq, family, category, condition, status, stock, page]);

  const patchRow = (id: string, patch: Partial<AdminProductListItem>) => setData((d) => d && { ...d, items: d.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  async function setLive(p: AdminProductListItem, on: boolean) {
    setPending((s) => new Set(s).add(p.id));
    patchRow(p.id, { status: on ? 'ACTIVE' : 'HIDDEN' });
    try {
      await adminApi.admin.setProductStatus(p.id, on ? 'ACTIVE' : 'HIDDEN');
      toast(on ? 'Live on the store' : 'Hidden from the store');
    } catch (e) {
      patchRow(p.id, { status: p.status });
      toast(errMsg(e), 'error');
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  }
  async function bulkStatus(to: 'ACTIVE' | 'HIDDEN') {
    const ids = [...selected];
    const res = await Promise.allSettled(ids.map((id) => adminApi.admin.setProductStatus(id, to)));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    toast(`${ok} product${ok === 1 ? '' : 's'} ${to === 'ACTIVE' ? 'now live' : 'hidden'}`);
    setSelected(new Set());
    void refetch();
  }
  async function duplicate(p: AdminProductListItem) {
    try {
      const c = await adminApi.admin.duplicateProduct(p.id);
      toast('Duplicated as a draft');
      router.push(`/admin/products/${c.id}`);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }
  async function remove(p: AdminProductListItem) {
    if (!(await confirm({ title: 'Delete this product?', body: <>“{p.title}” will be removed permanently. Products that have orders can’t be deleted — hide them instead.</>, confirmLabel: 'Delete', danger: true }))) return;
    try {
      const r = await adminApi.admin.deleteProduct(p.id);
      toast(isHeld(r) ? r.message : 'Product deleted');
      void refetch();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  }

  const columns: Column<AdminProductListItem>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (p) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <Thumb src={p.image} icon={p.icon} alt="" />
          <div className="min-w-0 leading-tight">
            <p className="line-clamp-1 font-medium">{p.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'fits', header: 'Fits', hide: 'xl', cell: (p) => <span className="line-clamp-1 max-w-[220px] text-[13px] text-muted">{p.fitsLabel}</span> },
    { key: 'cond', header: 'Condition', hide: 'md', cell: (p) => <ConditionBadge condition={p.condition} /> },
    { key: 'stock', header: 'Stock', cell: (p) => <StockPill available={p.stock} alert={p.lowStockAlert} /> },
    { key: 'price', header: 'Price', align: 'right', cell: (p) => <span className="font-medium tabular-nums">{formatINR(p.price)}</span> },
    ...(can('cost')
      ? [
          {
            key: 'margin',
            header: 'Margin',
            align: 'right' as const,
            hide: 'lg' as const,
            cell: (p: AdminProductListItem) => {
              const m = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
              return <span className={cn('text-[13px] tabular-nums', m < 15 ? 'text-danger' : m < 30 ? 'text-warning' : 'text-success')}>{p.cost ? `${m.toFixed(0)}%` : '—'}</span>;
            },
          },
        ]
      : []),
    {
      key: 'live',
      header: 'Live',
      align: 'center',
      cell: (p) => (
        <span data-stop className="inline-flex" title={p.status === 'DRAFT' ? 'Draft — switch on to publish' : undefined}>
          <Switch checked={p.status === 'ACTIVE'} onChange={(v) => setLive(p, v)} disabled={!edit || pending.has(p.id)} label={`Show ${p.title} on the store`} />
        </span>
      ),
    },
    {
      key: 'menu',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (p) => (
        <Dropdown>
          {(close) => (
            <>
              <MenuItem href={`/admin/products/${p.id}`} icon={<Pencil />} onClick={close}>
                {edit ? 'Edit' : 'View'}
              </MenuItem>
              <MenuItem href={`/p/${p.slug}`} target="_blank" icon={<ExternalLink />} onClick={close}>
                View on store
              </MenuItem>
              {edit && (
                <>
                  <MenuItem
                    icon={<Copy />}
                    onClick={() => {
                      close();
                      void duplicate(p);
                    }}
                  >
                    Duplicate
                  </MenuItem>
                  <MenuItem
                    danger
                    icon={<Trash2 />}
                    onClick={() => {
                      close();
                      void remove(p);
                    }}
                  >
                    Delete
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Dropdown>
      ),
    },
  ];

  const [all, active] = totals.data ?? [];
  const filtered = !!(dq || family || category || condition || status || stock);
  return (
    <>
      <PageHeader
        title="Products"
        subtitle={all && active ? `${all.total.toLocaleString('en-IN')} SKUs · ${active.total.toLocaleString('en-IN')} live · toggle to show/hide on the store instantly` : 'Toggle to show/hide on the store instantly'}
        actions={
          edit && (
            <ButtonLink href="/admin/products/new">
              <Plus className="size-4" />
              Add product
            </ButtonLink>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, SKU, part no. or A-number" className="w-full md:w-72" />
        <FilterSelect label="Device" value={family} onChange={setFamily} options={[{ value: '', label: 'All' }, ...(cat?.families ?? []).map((f) => ({ value: f.slug, label: f.name }))]} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: '', label: 'All' }, ...(cat?.categories ?? []).map((c) => ({ value: c.slug, label: c.name }))]} />
        <FilterSelect label="Condition" value={condition} onChange={setCondition} options={[{ value: '', label: 'All' }, ...CONDITIONS.map((c: Condition) => ({ value: c, label: CONDITION_SHORT[c] }))]} />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Live' },
            { value: 'HIDDEN', label: 'Hidden' },
            { value: 'DRAFT', label: 'Draft' },
          ]}
        />
        <FilterSelect
          label="Stock"
          value={stock}
          onChange={setStock}
          options={[
            { value: '', label: 'All' },
            { value: 'low', label: 'Low' },
            { value: 'out', label: 'Out' },
          ]}
        />
      </div>

      {edit && (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <BulkAction onClick={() => bulkStatus('ACTIVE')}>Make live</BulkAction>
          <BulkAction onClick={() => bulkStatus('HIDDEN')}>Hide from store</BulkAction>
        </BulkBar>
      )}

      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            rowKey={(p) => p.id}
            rowHref={(p) => `/admin/products/${p.id}`}
            selected={edit ? selected : undefined}
            onToggle={edit ? (id) => setSelected((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id)))) : undefined}
            onToggleAll={(ids, on) => setSelected(on ? new Set(ids) : new Set())}
            className={loading && data ? 'opacity-70 transition-opacity' : undefined}
            dense
            empty={
              <EmptyState
                icon={<PackageSearch className="size-6" />}
                title={filtered ? 'No products match' : 'No products yet'}
                body={filtered ? 'Try a different search or clear the filters.' : 'Add your first part to start selling.'}
                action={
                  filtered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQ('');
                        setFamily('');
                        setCategory('');
                        setCondition('');
                        setStatus('');
                        setStock('');
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
          {data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
