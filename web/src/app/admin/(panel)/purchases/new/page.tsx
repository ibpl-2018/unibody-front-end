'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { formatINR } from '@unibody/shared';
import { Button, Field, Input, Segmented, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { FormGrid, MoneyInput, PageHeader, Panel } from '@/components/admin/ui';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { NoAccess } from '@/components/admin/no-access';
import { SupplierModal } from '@/components/admin/supplier-modal';
import { adminApi, errMsg, inputToPaise, isoDay, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';

interface Line {
  key: number;
  kind: 'PART' | 'DONOR';
  product: PickedProduct | null;
  description: string;
  qty: string;
  unitCost: string;
}
let k = 0;
const newLine = (kind: Line['kind'] = 'PART'): Line => ({ key: ++k, kind, product: null, description: '', qty: '1', unitCost: '' });

export default function NewPurchasePage() {
  const router = useRouter();
  const toast = useToast();
  const { can } = useAdmin();
  const suppliers = useApi(() => adminApi.admin.suppliers(), [], { enabled: can('purchases') });
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(isoDay(new Date()));
  const [notes, setNotes] = useState('');
  const [paid, setPaid] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [busy, setBusy] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!can('purchases')) return <NoAccess />;

  const upd = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (inputToPaise(l.unitCost) ?? 0), 0);

  async function submit() {
    const e: Record<string, string> = {};
    if (!supplierId) e.supplier = 'Choose a supplier';
    lines.forEach((l) => {
      if (l.kind === 'PART' && !l.product) e[`l${l.key}`] = 'Pick the product this line adds stock to';
      else if (l.kind === 'DONOR' && l.description.trim().length < 2) e[`l${l.key}`] = 'Describe the donor device (e.g. MacBook Air A2337, dead board)';
      else if (!(Number(l.qty) > 0)) e[`l${l.key}`] = 'Quantity must be at least 1';
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const p = await adminApi.admin.createPurchase({
        supplierId,
        reference: reference.trim() || null,
        date,
        notes: notes.trim() || null,
        amountPaid: inputToPaise(paid) ?? 0,
        lines: lines.map((l) => ({
          kind: l.kind,
          productId: l.kind === 'PART' ? l.product!.id : null,
          description: (l.description.trim() || l.product?.title || '').slice(0, 200),
          qty: Math.round(Number(l.qty)),
          unitCost: inputToPaise(l.unitCost) ?? 0,
        })),
      });
      toast(`${p.poNo} created`);
      router.replace(`/admin/purchases/${p.id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/admin/purchases', label: 'Purchases' }}
        title="New purchase"
        subtitle="Stock is added when you mark the purchase as received."
        actions={
          <Button onClick={submit} loading={busy}>
            Create purchase
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Lines" padded>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={l.key} className="rounded-2xl border border-line-subtle bg-surface-2/40 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-xs font-semibold text-subtle">#{i + 1}</span>
                  <Segmented
                    size="sm"
                    value={l.kind}
                    onChange={(v) => upd(l.key, { kind: v, product: null })}
                    options={[
                      { value: 'PART', label: 'Part' },
                      { value: 'DONOR', label: 'Donor device' },
                    ]}
                  />
                  <span className="ml-auto text-sm font-semibold tabular-nums">{formatINR((Number(l.qty) || 0) * (inputToPaise(l.unitCost) ?? 0))}</span>
                  {lines.length > 1 && (
                    <button type="button" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_140px]">
                  {l.kind === 'PART' ? (
                    <ProductPicker value={l.product} onChange={(p) => upd(l.key, { product: p, unitCost: l.unitCost || (p?.cost ? String(p.cost / 100) : '') })} invalid={!!errors[`l${l.key}`]} />
                  ) : (
                    <Input value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="e.g. MacBook Pro 16″ A2141, liquid-damaged board" invalid={!!errors[`l${l.key}`]} />
                  )}
                  <Input aria-label="Quantity" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Qty" />
                  <MoneyInput value={l.unitCost} onChange={(v) => upd(l.key, { unitCost: v })} placeholder="Unit cost" />
                </div>
                {l.kind === 'PART' && l.product && <Input className="mt-3" value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="Line note (optional), e.g. Grade A, tested" />}
                {errors[`l${l.key}`] && <p className="mt-2 text-xs text-danger">{errors[`l${l.key}`]}</p>}
                {l.kind === 'DONOR' && <p className="mt-2 text-xs text-muted">Donor devices don’t add stock directly — harvest them for parts after receiving.</p>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine('PART')])}>
              <Plus className="size-4" />
              Add part
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine('DONOR')])}>
              <Plus className="size-4" />
              Add donor device
            </Button>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Supplier">
            <div className="space-y-4">
              <Field label="Supplier" error={errors.supplier}>
                <div className="flex gap-2">
                  <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} invalid={!!errors.supplier}>
                    <option value="">Choose…</option>
                    {suppliers.data?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.city ? ` · ${s.city}` : ''}
                      </option>
                    ))}
                  </Select>
                  <Button variant="outline" className="h-11 shrink-0 px-3" aria-label="Add supplier" onClick={() => setSupplierModal(true)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </Field>
              <FormGrid>
                <Field label="Bill / reference">
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2291" />
                </Field>
                <Field label="Date">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </FormGrid>
              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />
              </Field>
            </div>
          </Panel>
          <Panel title="Payment">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{formatINR(total)}</span>
            </div>
            <Field label="Paid now" className="mt-4" hint={total && inputToPaise(paid) !== null ? `${formatINR(Math.max(0, total - (inputToPaise(paid) ?? 0)))} will be payable` : 'Leave empty if unpaid'}>
              <MoneyInput value={paid} onChange={setPaid} />
            </Field>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPaid(String(total / 100))}>
              Mark fully paid
            </Button>
          </Panel>
        </div>
      </div>
      {supplierModal && (
        <SupplierModal
          onClose={() => setSupplierModal(false)}
          onSaved={(s) => {
            void suppliers.refetch();
            setSupplierId(s.id);
          }}
        />
      )}
    </>
  );
}
