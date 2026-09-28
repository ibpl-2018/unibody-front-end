'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { Badge, Button, EmptyState, Field, Input, Modal, Segmented, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { DataTable, ErrorState, PageHeader } from '@/components/admin/ui';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { adminApi, errMsg, useApi } from '@/lib/admin/api';
import { fmtDateTime } from '@/lib/format';

const TONE = { OPEN: 'info', SUBMITTED: 'warning', CLOSED: 'success' } as const;

/** Stock counts: staff scan what's physically on the shelf; the system finds what's missing. */
export default function StockCountsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, refetch } = useApi(() => adminApi.admin.stockCounts(), []);
  const cats = useApi(() => adminApi.admin.categories(), []);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'ALL' | 'CATEGORY' | 'PRODUCT'>('PRODUCT');
  const [categoryId, setCategoryId] = useState('');
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const c = await adminApi.admin.startStockCount({
        productIds: scope === 'PRODUCT' && product ? [product.id] : undefined,
        categoryId: scope === 'CATEGORY' && categoryId ? categoryId : undefined,
        note: note.trim() || undefined,
      });
      router.push(`/admin/stock-counts/${c.id}`);
    } catch (e) {
      toast(errMsg(e), 'error');
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <>
      <PageHeader
        title="Stock counts"
        subtitle="Scan every piece on the shelf. Anything the system expects but nobody scans is flagged to the Super Admin as missing."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Start a count
          </Button>
        }
      />
      <DataTable
        rows={data}
        loading={loading && !data}
        rowKey={(c) => c.id}
        rowHref={(c) => `/admin/stock-counts/${c.id}`}
        empty={<EmptyState icon={<ClipboardList className="size-6" />} title="No counts yet" body="Start with one high-value product — e.g. a display assembly — and scan every unit you can find." />}
        columns={[
          { key: 'c', header: 'Count', cell: (c) => <span className="font-mono font-semibold">{c.code}</span> },
          { key: 's', header: 'What', cell: (c) => <span>{c.scopeLabel}</span> },
          { key: 'b', header: 'Started', hide: 'sm', cell: (c) => <span className="text-[13px] text-muted">{c.startedBy} · {fmtDateTime(c.startedAt)}</span> },
          { key: 'n', header: 'Scanned', align: 'right', cell: (c) => <span className="tabular-nums">{c.scanned}</span> },
          {
            key: 'm',
            header: 'Missing',
            align: 'right',
            cell: (c) => (c.result ? <span className={c.result.missing.length ? 'font-semibold text-danger' : 'text-success'}>{c.result.missing.length}</span> : <span className="text-subtle">—</span>),
          },
          { key: 't', header: 'Status', cell: (c) => <Badge tone={TONE[c.status]}>{c.status.toLowerCase()}</Badge> },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start a stock count"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={start} loading={busy} disabled={(scope === 'PRODUCT' && !product) || (scope === 'CATEGORY' && !categoryId)}>
              Start scanning
            </Button>
          </>
        }
      >
        <Segmented
          className="mb-4"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'PRODUCT', label: 'One product' },
            { value: 'CATEGORY', label: 'A category' },
            { value: 'ALL', label: 'Everything' },
          ]}
        />
        {scope === 'PRODUCT' && <ProductPicker value={product} onChange={setProduct} autoFocus />}
        {scope === 'CATEGORY' && (
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Choose…</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {scope === 'ALL' && <p className="text-sm text-muted">Counts every unit in the store. Best done after hours, shelf by shelf.</p>}
        <Field label="Note (optional)" className="mt-4">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly count, shelf B" />
        </Field>
      </Modal>
    </>
  );
}
