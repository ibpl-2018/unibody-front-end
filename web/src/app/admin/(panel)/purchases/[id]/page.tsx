'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PackageCheck, Recycle, Wallet } from 'lucide-react';
import { formatINR, type PurchaseDTO, type PurchaseLineDTO } from '@unibody/shared';
import { Badge, Button, Field, Modal, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ErrorState, KeyVal, MoneyInput, PageHeader, Panel, useConfirm } from '@/components/admin/ui';
import { PayStateBadge, StockStateBadge } from '@/components/admin/purchase-badges';
import { HarvestForm } from '@/components/admin/harvest-form';
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

function HarvestModal({ p, line, onClose, onSaved }: { p: PurchaseDTO; line: PurchaseLineDTO; onClose: () => void; onSaved: (p: PurchaseDTO) => void }) {
  return (
    <Modal open wide onClose={onClose} title="Harvest a donor device">
      <HarvestForm p={p} line={line} onCancel={onClose} onSaved={(np) => (onSaved(np), onClose())} />
    </Modal>
  );
}
