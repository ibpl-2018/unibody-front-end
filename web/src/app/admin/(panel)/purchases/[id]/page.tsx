'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PackageCheck, Plus, Recycle, Trash2, Wallet } from 'lucide-react';
import { formatINR, type PurchaseDTO, type PurchaseLineDTO } from '@unibody/shared';
import { Badge, Button, Field, Input, Modal, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ErrorState, KeyVal, MoneyInput, PageHeader, Panel, useConfirm } from '@/components/admin/ui';
import { PayStateBadge, StockStateBadge } from '@/components/admin/purchase-badges';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, inputToPaise, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: p, error, refetch, setData } = useApi(() => adminApi.admin.purchase(id), [id], { enabled: can('purchases') });
  const [busy, setBusy] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [harvestLine, setHarvestLine] = useState<PurchaseLineDTO | null>(null);

  if (!can('purchases')) return <NoAccess />;
  if (error && !p) return <ErrorState message={error} onRetry={refetch} />;
  if (!p) return <Skeleton className="h-[500px]" />;

  const due = p.amount - p.amountPaid;
  async function receive() {
    if (!p) return;
    if (!(await confirm({ title: `Receive ${p.poNo}?`, body: 'Part lines are added to stock at their unit cost. Donor devices become available to harvest.', confirmLabel: 'Receive stock' }))) return;
    setBusy('receive');
    try {
      setData(await adminApi.admin.receivePurchase(p.id));
      toast('Stock received');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/admin/purchases', label: 'Purchases' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {p.poNo}
            <StockStateBadge s={p.stockState} />
            <PayStateBadge s={p.paymentState} />
          </span>
        }
        subtitle={
          <>
            {p.supplierName}
            {p.supplierCity && ` · ${p.supplierCity}`} · {fmtDate(p.date)}
            {p.reference && ` · Ref ${p.reference}`}
          </>
        }
        actions={
          <>
            {due > 0 && (
              <Button variant="outline" onClick={() => setPayOpen(true)}>
                <Wallet className="size-4" />
                Record payment
              </Button>
            )}
            {p.stockState === 'PENDING' && (
              <Button onClick={receive} loading={busy === 'receive'}>
                <PackageCheck className="size-4" />
                Receive stock
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Lines" padded={false}>
          <ul className="divide-y divide-line-subtle">
            {p.lines.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={l.kind === 'DONOR' ? 'purple' : 'info'}>{l.kind === 'DONOR' ? 'Donor device' : 'Part'}</Badge>
                    {l.productId ? (
                      <Link href={`/admin/products/${l.productId}`} className="font-medium hover:text-accent">
                        {l.productTitle}
                      </Link>
                    ) : (
                      <span className="font-medium">{l.description}</span>
                    )}
                  </div>
                  {l.productId && l.description && l.description !== l.productTitle && <p className="mt-1 text-[13px] text-muted">{l.description}</p>}
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {l.qty} × {formatINR(l.unitCost)} · received {l.received}/{l.qty}
                    {l.kind === 'DONOR' && (
                      <>
                        {' '}
                        · harvested {l.harvested}/{l.qty}
                        {l.harvestedValue > 0 && ` · ${formatINR(l.harvestedValue)} of parts recovered`}
                      </>
                    )}
                  </p>
                  {l.kind === 'DONOR' && (
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#af52de,#5856d6)]" style={{ width: `${(l.harvested / l.qty) * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:text-right">
                  <span className="font-semibold tabular-nums">{formatINR(l.qty * l.unitCost)}</span>
                  {l.kind === 'DONOR' && l.received > 0 && l.harvested < l.qty && (
                    <Button size="sm" variant="dark" onClick={() => setHarvestLine(l)}>
                      <Recycle className="size-3.5" />
                      Harvest
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {p.stockState === 'PENDING' && p.lines.some((l) => l.kind === 'DONOR') && <p className="border-t border-line-subtle px-6 py-3 text-xs text-muted">Receive this purchase to start harvesting donor devices.</p>}
        </Panel>
        <div className="space-y-5">
          <Panel title="Summary">
            <KeyVal k="Amount">{formatINR(p.amount)}</KeyVal>
            <KeyVal k="Paid">{formatINR(p.amountPaid)}</KeyVal>
            <div className="mt-2 flex items-baseline justify-between border-t border-line-subtle pt-3">
              <span className="font-semibold">Payable</span>
              <span className={cn('text-xl font-semibold tabular-nums', due > 0 && 'text-warning')}>{formatINR(due)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-success" style={{ width: `${p.amount ? (p.amountPaid / p.amount) * 100 : 0}%` }} />
            </div>
          </Panel>
          {p.notes && (
            <Panel title="Notes">
              <p className="whitespace-pre-line text-sm text-muted">{p.notes}</p>
            </Panel>
          )}
        </div>
      </div>
      {payOpen && <PaymentModal p={p} onClose={() => setPayOpen(false)} onSaved={setData} />}
      {harvestLine && <HarvestModal p={p} line={harvestLine} onClose={() => setHarvestLine(null)} onSaved={setData} />}
    </>
  );
}

function PaymentModal({ p, onClose, onSaved }: { p: PurchaseDTO; onClose: () => void; onSaved: (p: PurchaseDTO) => void }) {
  const toast = useToast();
  const due = p.amount - p.amountPaid;
  const [amt, setAmt] = useState(String(due / 100));
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = inputToPaise(amt);
    if (!v || v < 1) return;
    setBusy(true);
    try {
      onSaved(await adminApi.admin.recordPurchasePayment(p.id, Math.min(v, due)));
      toast(`Payment of ${formatINR(Math.min(v, due))} recorded`);
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Record supplier payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="pay" loading={busy}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="pay" onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">
          {formatINR(due)} is outstanding to {p.supplierName}.
        </p>
        <Field label="Amount paid">
          <MoneyInput value={amt} onChange={setAmt} />
        </Field>
      </form>
    </Modal>
  );
}

interface HPart {
  key: number;
  product: PickedProduct | null;
  qty: string;
  cost: string;
  serial: string;
}
let hk = 0;
function HarvestModal({ p, line, onClose, onSaved }: { p: PurchaseDTO; line: PurchaseLineDTO; onClose: () => void; onSaved: (p: PurchaseDTO) => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(`Unit ${line.harvested + 1} of ${line.qty} — ${line.description}`);
  const [parts, setParts] = useState<HPart[]>([{ key: ++hk, product: null, qty: '1', cost: '', serial: '' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upd = (key: number, patch: Partial<HPart>) => setParts((ps) => ps.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const allocated = parts.reduce((a, x) => a + (Number(x.qty) || 0) * (inputToPaise(x.cost) ?? 0), 0);
  const unitCost = line.unitCost;
  const splitEvenly = () => {
    const units = parts.reduce((a, x) => a + (Number(x.qty) || 0), 0) || 1;
    const each = Math.floor(unitCost / units / 100);
    setParts((ps) => ps.map((x) => ({ ...x, cost: String(each) })));
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (parts.some((x) => !x.product)) return setErr('Pick a product for every harvested part');
    setBusy(true);
    setErr(null);
    try {
      onSaved(
        await adminApi.admin.harvest(p.id, {
          lineId: line.id,
          label: label.trim() || undefined,
          parts: parts.map((x) => ({ productId: x.product!.id, qty: Math.max(1, Math.round(Number(x.qty) || 1)), cost: inputToPaise(x.cost) ?? 0, serial: x.serial.trim() || null })),
        }),
      );
      toast(`${parts.length} part${parts.length > 1 ? 's' : ''} added to stock`);
      onClose();
    } catch (e2) {
      setErr(errMsg(e2));
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Harvest a donor device"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="harvest" loading={busy}>
            <Recycle className="size-4" />
            Add parts to stock
          </Button>
        </>
      }
    >
      <form id="harvest" onSubmit={submit} className="space-y-4">
        <p className="-mt-2 text-sm text-muted">
          Record every usable part you pulled from one unit of <span className="font-medium text-fg">{line.description}</span>. Assign cost so the donor price ({formatINR(unitCost)}) is spread across the parts.
        </p>
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <div className="space-y-2.5">
          <div className="hidden grid-cols-[minmax(0,1fr)_70px_120px_150px_36px] gap-2 px-1 text-xs font-medium text-muted sm:grid">
            <span>Part produced</span>
            <span>Qty</span>
            <span>Cost each</span>
            <span>Serial (optional)</span>
            <span />
          </div>
          {parts.map((x) => (
            <div key={x.key} className="grid gap-2 rounded-xl border border-line-subtle p-2.5 sm:grid-cols-[minmax(0,1fr)_70px_120px_150px_36px] sm:border-0 sm:p-0">
              <ProductPicker value={x.product} onChange={(pp) => upd(x.key, { product: pp })} placeholder="Search the part you pulled" />
              <Input aria-label="Quantity" value={x.qty} onChange={(e) => upd(x.key, { qty: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
              <MoneyInput value={x.cost} onChange={(v) => upd(x.key, { cost: v })} />
              <Input aria-label="Serial" value={x.serial} onChange={(e) => upd(x.key, { serial: e.target.value.toUpperCase() })} placeholder="Serial" className="font-mono" />
              <button type="button" aria-label="Remove part" disabled={parts.length === 1} onClick={() => setParts((ps) => ps.filter((y) => y.key !== x.key))} className="flex h-11 items-center justify-center rounded-full text-muted hover:text-danger disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setParts((ps) => [...ps, { key: ++hk, product: null, qty: '1', cost: '', serial: '' }])}>
            <Plus className="size-4" />
            Add part
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={splitEvenly}>
            Split donor cost evenly
          </Button>
          <span className={cn('ml-auto text-sm tabular-nums', allocated > unitCost ? 'text-warning' : 'text-muted')}>
            Allocated {formatINR(allocated)} of {formatINR(unitCost)}
          </span>
        </div>
        {err && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{err}</p>}
      </form>
    </Modal>
  );
}
