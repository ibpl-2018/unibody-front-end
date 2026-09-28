'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, Download, IndianRupee, PackageX, Plus, ScanBarcode, SlidersHorizontal, Warehouse } from 'lucide-react';
import { CONDITIONS, CONDITION_SHORT, MOVEMENT_TYPES, UNIT_STATUSES, formatINR, type Condition, type InventoryRowDTO, type MovementType, type StockMovementDTO, type StockUnitDTO, type UnitStatus } from '@unibody/shared';
import { Badge, Button, ConditionBadge, EmptyState, Field, Input, Modal, Segmented, Select, buttonClass } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, FilterSelect, FormGrid, KpiCard, LineTabs, MoneyInput, PageHeader, Pagination, SearchInput, Thumb, type Column } from '@/components/admin/ui';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { adminApi, errMsg, fieldErrors, inputToPaise, useApi, useDebounced } from '@/lib/admin/api';
import { useAdmin, useLiveRefetch } from '@/lib/admin/session';
import { syncQuery, useResetPage } from '@/lib/admin/url';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'stock' | 'units' | 'movements';
type State = '' | 'OK' | 'LOW' | 'OUT';

const MOVE_TONE: Record<MovementType, 'success' | 'info' | 'danger' | 'warning' | 'purple' | 'neutral'> = {
  PURCHASE: 'success',
  HARVEST: 'purple',
  SALE: 'info',
  RETURN: 'warning',
  ADJUSTMENT: 'neutral',
  CANCEL: 'danger',
};
const UNIT_TONE: Record<UnitStatus, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = { IN_STOCK: 'success', RESERVED: 'warning', SOLD: 'info', RETURNED: 'neutral', SCRAPPED: 'danger' };
const lower = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

export function InventoryView({ initial }: { initial: { q: string; state: string; tab: string; adjust: boolean } }) {
  const { can, token } = useAdmin();
  const [tab, setTab] = useState<Tab>(initial.tab === 'units' || initial.tab === 'movements' ? initial.tab : 'stock');
  const [adjust, setAdjust] = useState<{ product: PickedProduct | null } | null>(initial.adjust && can('stockEdit') ? { product: null } : null);
  const [unitModal, setUnitModal] = useState<{ product: PickedProduct | null } | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="On hand = physically in the store room. Reserved = in open orders. Available = what the store can sell."
        actions={
          <>
            {can('reports') && (
              <a className={buttonClass('outline')} href={adminApi.admin.reportCsvUrl('inventory', { token })}>
                <Download className="size-4" />
                Export
              </a>
            )}
            {can('stockEdit') && (
              <>
                <Button variant="outline" onClick={() => setUnitModal({ product: null })}>
                  <ScanBarcode className="size-4" />
                  Add serial unit
                </Button>
                <Button onClick={() => setAdjust({ product: null })}>
                  <SlidersHorizontal className="size-4" />
                  Adjust stock
                </Button>
              </>
            )}
          </>
        }
      />
      <LineTabs
        value={tab}
        onChange={(t) => {
          setTab(t);
          syncQuery({ tab: t === 'stock' ? '' : t });
        }}
        tabs={[
          { value: 'stock', label: 'Stock levels' },
          { value: 'units', label: 'Serial units' },
          { value: 'movements', label: 'Movements ledger' },
        ]}
      />
      {tab === 'stock' && <StockTab initial={initial} version={version} onAdjust={(p) => setAdjust({ product: p })} onUnit={(p) => setUnitModal({ product: p })} />}
      {tab === 'units' && <UnitsTab version={version} />}
      {tab === 'movements' && <MovementsTab version={version} />}

      {adjust && <AdjustModal initial={adjust.product} onClose={() => setAdjust(null)} onDone={bump} />}
      {unitModal && <UnitModal initial={unitModal.product} onClose={() => setUnitModal(null)} onDone={bump} />}
    </>
  );
}

function StockTab({ initial, version, onAdjust, onUnit }: { initial: { q: string; state: string }; version: number; onAdjust: (p: PickedProduct) => void; onUnit: (p: PickedProduct) => void }) {
  const { can } = useAdmin();
  const owner = can('cost');
  const edit = can('stockEdit');
  const [q, setQ] = useState(initial.q);
  const [state, setState] = useState<State>(['OK', 'LOW', 'OUT'].includes(initial.state) ? (initial.state as State) : '');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const pageSize = 50;
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.inventory({ q: dq || undefined, state: state || undefined, page, pageSize }), [dq, state, page, version]);
  useLiveRefetch(refetch);
  useResetPage(setPage, [dq, state]);
  useEffect(() => syncQuery({ q: dq, state }), [dq, state]);
  const s = data?.summary;
  const pick = (r: InventoryRowDTO): PickedProduct => ({ id: r.productId, title: r.title, sku: r.sku, icon: r.icon, cost: r.unitCost });

  const cols: Column<InventoryRowDTO>[] = [
    {
      key: 'p',
      header: 'Product',
      cell: (r) => (
        <Link href={`/admin/products/${r.productId}`} className="flex min-w-[240px] items-center gap-3">
          <Thumb src={null} icon={r.icon} alt="" size="sm" />
          <span className="min-w-0 leading-tight">
            <span className="line-clamp-1 font-medium hover:text-accent">{r.title}</span>
            <span className="font-mono text-[11px] text-muted">{r.sku}</span>
          </span>
        </Link>
      ),
    },
    { key: 'c', header: 'Condition', hide: 'lg', cell: (r) => <ConditionBadge condition={r.condition} /> },
    { key: 'bin', header: 'Bin', hide: 'md', cell: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.bin ?? '—'}</span> },
    { key: 'on', header: 'On hand', align: 'right', cell: (r) => <span className="tabular-nums">{r.onHand}</span> },
    { key: 'res', header: 'Reserved', align: 'right', hide: 'sm', cell: (r) => <span className={cn('tabular-nums', r.reserved ? 'text-warning' : 'text-subtle')}>{r.reserved}</span> },
    {
      key: 'av',
      header: 'Available',
      align: 'right',
      cell: (r) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          <span className={cn('font-semibold tabular-nums', r.state === 'OUT' ? 'text-danger' : r.state === 'LOW' ? 'text-warning' : '')}>{r.available}</span>
          {r.state !== 'OK' && (
            <Badge tone={r.state === 'OUT' ? 'danger' : 'warning'} dot>
              {r.state === 'OUT' ? 'Out' : 'Low'}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'vel',
      header: 'Sold 30d',
      align: 'right',
      hide: 'xl',
      cell: (r) => (
        <span className="text-[13px] tabular-nums text-muted">
          {r.velocity30d}
          {r.daysLeft !== null && r.velocity30d > 0 && <span className="text-subtle"> · {r.daysLeft}d left</span>}
        </span>
      ),
    },
    ...(owner
      ? [
          { key: 'cost', header: 'Unit cost', align: 'right' as const, hide: 'lg' as const, cell: (r: InventoryRowDTO) => <span className="tabular-nums text-muted">{formatINR(r.unitCost)}</span> },
          { key: 'val', header: 'Value', align: 'right' as const, hide: 'md' as const, cell: (r: InventoryRowDTO) => <span className="font-medium tabular-nums">{formatINR(r.value)}</span> },
        ]
      : []),
    ...(edit
      ? [
          {
            key: 'act',
            header: '',
            align: 'right' as const,
            cell: (r: InventoryRowDTO) => (
              <span className="inline-flex gap-1">
                <Button size="sm" variant="outline" onClick={() => onAdjust(pick(r))}>
                  Adjust
                </Button>
                <button type="button" title="Add serial unit" aria-label="Add serial unit" onClick={() => onUnit(pick(r))} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
                  <ScanBarcode className="size-4" />
                </button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className={cn('mb-5 grid gap-4 sm:grid-cols-2', owner ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
        {owner && <KpiCard label="Stock valuation (at cost)" color="blue" icon={<IndianRupee />} loading={!s} value={s && formatINR(s.stockValue)} hint={s && `${s.units.toLocaleString('en-IN')} units · ${s.skus} SKUs in stock`} />}
        {!owner && <KpiCard label="Units on hand" color="blue" icon={<Warehouse />} loading={!s} value={s?.units.toLocaleString('en-IN')} hint={s && `${s.skus} SKUs in stock · ${s.reserved} reserved`} />}
        {owner && <KpiCard label="Reserved in open orders" color="purple" icon={<Boxes />} loading={!s} value={s?.reserved} hint="Released when shipped or cancelled" />}
        <button type="button" className="text-left" onClick={() => setState(state === 'LOW' ? '' : 'LOW')}>
          <KpiCard label="Low stock" color="orange" icon={<AlertTriangle />} loading={!s} value={s?.lowStock} hint={state === 'LOW' ? 'Showing low-stock SKUs · tap to clear' : 'At or below alert level · tap to filter'} />
        </button>
        <button type="button" className="text-left" onClick={() => setState(state === 'OUT' ? '' : 'OUT')}>
          <KpiCard label="Out of stock" color="pink" icon={<PackageX />} loading={!s} value={s?.outOfStock} hint={state === 'OUT' ? 'Showing out-of-stock · tap to clear' : 'Live products you can’t sell · tap to filter'} />
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search title, SKU or bin" className="w-full sm:w-72" />
        <FilterSelect
          label="Stock"
          value={state}
          onChange={setState}
          options={[
            { value: '', label: 'All' },
            { value: 'OK', label: 'Healthy' },
            { value: 'LOW', label: 'Low' },
            { value: 'OUT', label: 'Out' },
          ]}
        />
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(r) => r.productId} dense empty={<EmptyState icon={<Warehouse className="size-6" />} title="Nothing matches" body="Try a different search or stock filter." />} />
          {data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}

function UnitsTab({ version }: { version: number }) {
  const { can } = useAdmin();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.units({ q: dq || undefined, status: status || undefined, page }), [dq, status, page, version]);
  useResetPage(setPage, [dq, status]);
  const cols: Column<StockUnitDTO>[] = [
    { key: 's', header: 'Serial', cell: (u) => <span className="font-mono text-[13px] font-semibold">{u.serial}</span> },
    {
      key: 'p',
      header: 'Product',
      cell: (u) => (
        <Link href={`/admin/products/${u.productId}`} className="line-clamp-1 max-w-[320px] hover:text-accent">
          {u.productTitle}
        </Link>
      ),
    },
    { key: 'g', header: 'Grade', hide: 'md', cell: (u) => (u.grade ? <ConditionBadge condition={u.grade} /> : '—') },
    { key: 'b', header: 'Bin', hide: 'md', cell: (u) => <span className="font-mono text-xs">{u.bin ?? '—'}</span> },
    ...(can('cost') ? [{ key: 'c', header: 'Cost', align: 'right' as const, hide: 'lg' as const, cell: (u: StockUnitDTO) => <span className="tabular-nums">{formatINR(u.cost)}</span> }] : []),
    { key: 'st', header: 'Status', cell: (u) => <Badge tone={UNIT_TONE[u.status]} dot>{lower(u.status)}</Badge> },
    { key: 'po', header: 'Source', hide: 'lg', cell: (u) => <span className="font-mono text-xs text-muted">{u.purchaseRef ?? 'Manual'}</span> },
    { key: 'at', header: 'Added', hide: 'xl', cell: (u) => <span className="text-[13px] text-muted">{fmtDateTime(u.createdAt)}</span> },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search serial number" className="w-full sm:w-72" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...UNIT_STATUSES.map((s) => ({ value: s, label: lower(s) }))]} />
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(u) => u.id} dense empty={<EmptyState icon={<ScanBarcode className="size-6" />} title="No serial units" body="Serialised parts (logic boards, displays…) are tracked one by one here." />} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}

function MovementsTab({ version }: { version: number }) {
  const { can } = useAdmin();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.movements({ type: type || undefined, page }), [type, page, version]);
  useLiveRefetch(refetch);
  useResetPage(setPage, [type]);
  const cols: Column<StockMovementDTO>[] = [
    { key: 'at', header: 'When', cell: (m) => <span className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(m.at)}</span> },
    {
      key: 'p',
      header: 'Product',
      cell: (m) => (
        <Link href={`/admin/products/${m.productId}`} className="block max-w-[300px] leading-tight">
          <span className="line-clamp-1 font-medium hover:text-accent">{m.productTitle}</span>
          <span className="font-mono text-[11px] text-muted">{m.sku}</span>
        </Link>
      ),
    },
    { key: 't', header: 'Type', cell: (m) => <Badge tone={MOVE_TONE[m.type]}>{lower(m.type)}</Badge> },
    { key: 'q', header: 'Qty', align: 'right', cell: (m) => <span className={cn('font-semibold tabular-nums', m.qty > 0 ? 'text-success' : 'text-danger')}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span> },
    ...(can('cost') ? [{ key: 'c', header: 'Unit cost', align: 'right' as const, hide: 'lg' as const, cell: (m: StockMovementDTO) => <span className="tabular-nums text-muted">{m.unitCost ? formatINR(m.unitCost) : '—'}</span> }] : []),
    { key: 'r', header: 'Reason', hide: 'md', cell: (m) => <span className="line-clamp-1 max-w-[220px] text-[13px]">{m.reason ?? '—'}</span> },
    { key: 'ref', header: 'Ref', hide: 'lg', cell: (m) => (m.ref ? m.ref.startsWith('UB-') ? <Link href={`/admin/orders/${m.ref}`} className="font-mono text-xs text-link">{m.ref}</Link> : <span className="font-mono text-xs">{m.ref}</span> : '—') },
    { key: 'by', header: 'By', hide: 'xl', cell: (m) => <span className="text-[13px] text-muted">{m.by ?? 'System'}</span> },
  ];
  return (
    <>
      <div className="mb-4">
        <FilterSelect label="Type" value={type} onChange={setType} options={[{ value: '', label: 'All' }, ...MOVEMENT_TYPES.map((t) => ({ value: t, label: lower(t) }))]} />
      </div>
      {error && !data ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable columns={cols} rows={data?.items} loading={loading} rowKey={(m) => m.id} dense empty={<EmptyState title="No stock movements yet" />} />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}

const REASONS = ['Stock count correction', 'Received from supplier', 'Damaged / failed testing', 'Returned by customer', 'Used for repair', 'Other'];

function AdjustModal({ initial, onClose, onDone }: { initial: PickedProduct | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { can } = useAdmin();
  const [product, setProduct] = useState<PickedProduct | null>(initial);
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [cost, setCost] = useState(initial?.cost ? String(initial.cost / 100) : '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.round(Number(qty));
    if (!product) return setErrors({ productId: 'Pick a product' });
    if (!n) return setErrors({ qty: 'Enter a quantity' });
    setBusy(true);
    try {
      const r = await adminApi.admin.adjustStock({
        productId: product.id,
        qty: dir === 'in' ? n : -n,
        reason: [reason, note.trim()].filter(Boolean).join(' — '),
        unitCost: dir === 'in' && can('cost') ? inputToPaise(cost) ?? undefined : undefined,
      });
      toast(`${product.sku}: ${r.available} available now`);
      onDone();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="adjust" loading={busy}>
            {dir === 'in' ? 'Add to stock' : 'Remove from stock'}
          </Button>
        </>
      }
    >
      <form id="adjust" onSubmit={submit} className="space-y-4">
        <Field label="Product" error={errors.productId}>
          <ProductPicker value={product} onChange={(p) => (setProduct(p), p?.cost && setCost(String(p.cost / 100)))} invalid={!!errors.productId} autoFocus={!initial} />
        </Field>
        <FormGrid>
          <Field label="Direction">
            <Segmented
              className="w-full [&>button]:flex-1"
              value={dir}
              onChange={setDir}
              options={[
                { value: 'in', label: '+ Add' },
                { value: 'out', label: '− Remove' },
              ]}
            />
          </Field>
          <Field label="Quantity" error={errors.qty}>
            <Input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          </Field>
        </FormGrid>
        <Field label="Reason" error={errors.reason}>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Recount on 28 Sep, shelf A3" />
        </Field>
        {dir === 'in' && can('cost') && (
          <Field label="Unit cost" hint="Used for stock valuation and COGS">
            <MoneyInput value={cost} onChange={setCost} />
          </Field>
        )}
      </form>
    </Modal>
  );
}

function UnitModal({ initial, onClose, onDone }: { initial: PickedProduct | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [product, setProduct] = useState<PickedProduct | null>(initial);
  const [serial, setSerial] = useState('');
  const [grade, setGrade] = useState<Condition | ''>('');
  const [bin, setBin] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(e: React.FormEvent, again = false) {
    e.preventDefault();
    if (!product) return setErrors({ productId: 'Pick a product' });
    if (serial.trim().length < 3) return setErrors({ serial: 'Enter the serial number' });
    setBusy(true);
    try {
      await adminApi.admin.addUnit({ productId: product.id, serial: serial.trim().toUpperCase(), grade: grade || undefined, bin: bin.trim() || undefined });
      toast(`Unit ${serial.trim().toUpperCase()} added`);
      onDone();
      if (again) {
        setSerial('');
        setErrors({});
      } else onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Add serial unit"
      footer={
        <>
          <Button variant="secondary" onClick={(e) => submit(e as unknown as React.FormEvent, true)} disabled={busy}>
            Save & add another
          </Button>
          <Button type="submit" form="unit" loading={busy}>
            <Plus className="size-4" />
            Add unit
          </Button>
        </>
      }
    >
      <form id="unit" onSubmit={submit} className="space-y-4">
        <p className="-mt-2 text-sm text-muted">Track an individual part (e.g. a logic board) by serial so packers can assign the exact unit to an order.</p>
        <Field label="Product" error={errors.productId}>
          <ProductPicker value={product} onChange={setProduct} invalid={!!errors.productId} autoFocus={!initial} />
        </Field>
        <Field label="Serial number" error={errors.serial}>
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="C02XK1ABJG5J" className="font-mono uppercase" autoFocus={!!initial} invalid={!!errors.serial} />
        </Field>
        <FormGrid>
          <Field label="Grade" hint="Defaults to the product’s condition">
            <Select value={grade} onChange={(e) => setGrade(e.target.value as Condition | '')}>
              <option value="">Same as product</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_SHORT[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bin">
            <Input value={bin} onChange={(e) => setBin(e.target.value)} placeholder="Product bin" />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
}
