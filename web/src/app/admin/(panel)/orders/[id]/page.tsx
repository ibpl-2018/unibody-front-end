'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Banknote, Check, Copy, ExternalLink, FileText, MapPin, MessageCircle, Phone, Printer, Send, ShieldCheck, Truck, User } from 'lucide-react';
import { ADMIN_STATUS_LABEL, CONDITION_SHORT, ORDER_FLOW, PAYMENT_METHOD_LABEL, formatINR, formatPhone, isHeld, type AdminOrderDetail, type HeldResponseDTO, type OrderStatus } from '@unibody/shared';
import { Badge, Button, ConditionBadge, Field, Input, Modal, Select, Skeleton, StatusBadge, Textarea, buttonClass } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { ErrorState, KeyVal, PageHeader, Panel, Thumb } from '@/components/admin/ui';
import { beep, ScanInput } from '@/components/admin/scan-input';
import { PaymentBadge } from '@/components/admin/badges';
import { adminApi, errMsg, fieldErrors, telLink, useAction, useApi, waLink } from '@/lib/admin/api';
import { useAdmin, useLiveRefetch } from '@/lib/admin/session';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const ACTION_LABEL: Record<OrderStatus, string> = {
  NEW: 'Reopen',
  CONFIRMED: 'Confirm order',
  PACKED: 'Mark packed',
  SHIPPED: 'Mark shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
  RETURNED: 'Mark returned',
};
const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'Ekart', 'Xpressbees', 'Shadowfax', 'India Post', 'Shiprocket', 'Own rider'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { can, refreshCounts } = useAdmin();
  const { data: o, error, refetch, setData } = useApi(() => adminApi.admin.order(id), [id]);
  useLiveRefetch(refetch);
  const { busy, run } = useAction();
  const [statusModal, setStatusModal] = useState<OrderStatus | null>(null);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (o) document.title = `#${o.orderNo} · Unibody Admin`;
  }, [o]);

  const act = async (key: string, fn: () => Promise<AdminOrderDetail | HeldResponseDTO>, ok: string) => {
    try {
      const r = await run(key, fn);
      if (isHeld(r)) {
        toast(r.message); // held for the Super Admin's approval
        void refetch();
      } else if (r) {
        setData(r);
        toast(ok);
        refreshCounts();
      }
      return true;
    } catch (e) {
      toast(errMsg(e), 'error');
      return false;
    }
  };

  if (error && !o) return <ErrorState message={error} onRetry={refetch} />;
  if (!o)
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );

  const flowIdx = ORDER_FLOW.indexOf(o.status);
  const forward = o.nextStatuses.filter((s) => s !== 'CANCELLED' && s !== 'RETURNED');
  const backward = o.nextStatuses.filter((s) => s === 'CANCELLED' || s === 'RETURNED');
  const trackUrl = `/track?order=${o.orderNo}&phone=${o.phone}`;
  const codConfirmText = `Hi ${o.customerName.split(' ')[0]}, this is Unibody. Confirming your Cash on Delivery order ${o.orderNo} — ${o.items.map((i) => i.title).join(', ')} — ${formatINR(o.totals.total)} to pay on delivery. Reply YES to confirm and we’ll pack it today.`;
  const waText = `Hi ${o.customerName.split(' ')[0]}, this is Unibody about your order ${o.orderNo} (${formatINR(o.totals.total)}).`;

  const changeStatus = async (to: OrderStatus, note?: string) => {
    const done = await act('status', () => adminApi.admin.setStatus(o.id, to, note || undefined), `Order → ${ADMIN_STATUS_LABEL[to]}`);
    if (done) {
      setStatusModal(null);
      setStatusNote('');
    }
  };
  const onStatusClick = (to: OrderStatus) => {
    if (to === 'CANCELLED' || to === 'RETURNED' || (to === 'SHIPPED' && !o.shipment)) setStatusModal(to);
    else void changeStatus(to);
  };

  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            #{o.orderNo}
            <StatusBadge status={o.status} admin />
            <PaymentBadge status={o.paymentStatus} method={o.paymentMethod} />
          </span>
        }
        subtitle={
          <>
            Placed {fmtDateTime(o.createdAt)} · via {o.source.toLowerCase()}
            {o.etaDate && ` · ETA ${fmtDate(o.etaDate)}`}
          </>
        }
        actions={
          <>
            <a href={`/admin/labels?ids=${o.id}`} target="_blank" rel="noreferrer" className={buttonClass('outline', 'md')}>
              <Printer className="size-4" />
              Label
            </a>
            {o.invoiceId ? (
              <a href={`/admin/invoices/${o.invoiceId}`} target="_blank" rel="noreferrer" className={buttonClass('outline', 'md')}>
                <FileText className="size-4" />
                Invoice
              </a>
            ) : (
              can('invoiceGenerate') &&
              o.status !== 'CANCELLED' && (
                <Button variant="outline" loading={busy === 'invoice'} onClick={() => act('invoice', () => adminApi.admin.generateInvoice(o.id), 'GST invoice generated')}>
                  <FileText className="size-4" />
                  Generate invoice
                </Button>
              )
            )}
            {backward.map((s) => (
              <Button key={s} variant="outline" className="text-danger" onClick={() => onStatusClick(s)}>
                {ACTION_LABEL[s]}
              </Button>
            ))}
            {forward.map((s, i) => (
              <Button key={s} variant={i === 0 ? 'primary' : 'secondary'} loading={busy === 'status' && statusModal === null} onClick={() => onStatusClick(s)}>
                {i === 0 && <Check className="size-4" />}
                {ACTION_LABEL[s]}
              </Button>
            ))}
          </>
        }
      />

      {/* progress */}
      {flowIdx >= 0 && (
        <ol className="no-scrollbar mb-5 flex overflow-x-auto rounded-[var(--radius-card)] border border-line-subtle bg-surface p-1.5">
          {ORDER_FLOW.map((s, i) => (
            <li key={s} className={cn('flex min-w-[120px] flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium', i < flowIdx ? 'text-success' : i === flowIdx ? 'bg-accent-soft text-accent' : 'text-subtle')}>
              <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]', i < flowIdx ? 'bg-success text-white' : i === flowIdx ? 'bg-accent text-white' : 'bg-surface-2')}>{i < flowIdx ? <Check className="size-3" /> : i + 1}</span>
              <span className="whitespace-nowrap">{ADMIN_STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}

      {/* A03: COD orders are confirmed with the customer before anything is picked. */}
      {o.paymentMethod === 'COD' && o.status === 'NEW' && (
        <div data-testid="cod-confirm" className="mb-5 flex flex-col gap-3 rounded-[var(--radius-card)] bg-warning-soft px-5 py-4 sm:flex-row sm:items-center">
          <Phone className="hidden size-5 shrink-0 text-warning sm:block" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Cash on Delivery order</span> — call or WhatsApp {o.customerName.split(' ')[0]} to confirm before packing ({formatINR(o.totals.total)} to collect).
          </p>
          <div className="flex shrink-0 gap-2">
            <a href={waLink(o.phone, codConfirmText)} target="_blank" rel="noreferrer" className={buttonClass('dark', 'sm')}>
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <a href={telLink(o.phone)} className={buttonClass('outline', 'sm')}>
              <Phone className="size-4" />
              Call
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ItemsCard
            o={o}
            canPick={can('security')}
            onAssign={(itemId, unitId) => act('assign', () => adminApi.admin.assignUnit(o.id, itemId, unitId), 'Unit assigned')}
            onScan={async (code) => {
              try {
                setData(await adminApi.admin.scanUnit(o.id, code));
                beep(true);
              } catch (e) {
                beep(false);
                toast(errMsg(e), 'error');
              }
            }}
            onUnscan={(code) => act('unscan', () => adminApi.admin.unscanUnit(o.id, code), `${code} removed`)}
          />
          <ShipmentCard o={o} onSaved={setData} />
          <TimelineCard o={o} onSaved={setData} />
        </div>

        <div className="space-y-5">
          <Panel title="Customer" action={o.customerRegistered ? <Badge tone="info">Registered</Badge> : <Badge>Guest</Badge>}>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-tint-lavender text-[15px] font-semibold text-purple">{o.customerName.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 leading-tight">
                {can('customers') ? (
                  <Link href={`/admin/customers/${o.customerId}`} className="font-semibold hover:text-accent">
                    {o.customerName}
                  </Link>
                ) : (
                  <p className="font-semibold">{o.customerName}</p>
                )}
                <p className="mt-0.5 text-[13px] text-muted">
                  {o.customerOrderCount} order{o.customerOrderCount === 1 ? '' : 's'} {o.customerOrderCount > 1 && '· repeat customer'}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1 border-t border-line-subtle pt-3">
              <KeyVal k="Phone">{formatPhone(o.phone)}</KeyVal>
              {o.email && <KeyVal k="Email">{o.email}</KeyVal>}
              {o.gstin && <KeyVal k="GSTIN">{o.gstin}</KeyVal>}
              <KeyVal k="WhatsApp updates">{o.whatsappOptIn ? 'Opted in' : 'No'}</KeyVal>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={telLink(o.phone)} className={buttonClass('secondary', 'sm')}>
                <Phone className="size-3.5" />
                Call
              </a>
              <a href={waLink(o.phone, waText)} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm', 'text-success')}>
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            </div>
          </Panel>

          <Panel title="Delivery address" action={<MapPin className="size-4 text-muted" />}>
            <address className="text-sm not-italic leading-relaxed">
              <span className="font-medium">{o.customerName}</span>
              <br />
              {o.address.line1}
              <br />
              {o.address.line2}
              {o.address.landmark && (
                <>
                  <br />
                  <span className="text-muted">Near {o.address.landmark}</span>
                </>
              )}
              <br />
              {o.address.city}, {o.address.state} — <span className="font-medium tabular-nums">{o.address.pincode}</span>
            </address>
            <div className="mt-3 flex items-center gap-2">
              <Badge>{o.address.label}</Badge>
              <CopyBtn text={`${o.customerName}\n${o.address.line1}\n${o.address.line2}${o.address.landmark ? `\nNear ${o.address.landmark}` : ''}\n${o.address.city}, ${o.address.state} ${o.address.pincode}\n${formatPhone(o.phone)}`} />
            </div>
          </Panel>

          <Panel title="Payment">
            <div className="space-y-1">
              <KeyVal k="Method">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</KeyVal>
              <KeyVal k="Status">
                <PaymentBadge status={o.paymentStatus} method={o.paymentMethod} />
              </KeyVal>
              {o.razorpayOrderId && (
                <KeyVal k="Razorpay order">
                  <span className="font-mono text-xs">{o.razorpayOrderId}</span>
                </KeyVal>
              )}
              {o.razorpayPaymentId && (
                <KeyVal k="Payment ID">
                  <span className="font-mono text-xs">{o.razorpayPaymentId}</span>
                </KeyVal>
              )}
            </div>
            {o.paymentMethod === 'COD' && o.paymentStatus === 'COD_PENDING' && can('codCollect') && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3">
                <p className="text-[13px] text-muted">
                  Collect <span className="font-semibold text-fg">{formatINR(o.totals.total)}</span> in cash on delivery.
                </p>
                <Button size="sm" className="mt-2.5 w-full" variant="dark" disabled={o.status !== 'DELIVERED'} loading={busy === 'cod'} onClick={() => act('cod', () => adminApi.admin.markCodCollected(o.id), 'COD marked as collected')}>
                  <Banknote className="size-4" />
                  Mark COD collected
                </Button>
                {o.status !== 'DELIVERED' && <p className="mt-1.5 text-center text-[11px] text-subtle">Available once the order is delivered</p>}
              </div>
            )}
          </Panel>

          <Panel title="Totals">
            <div className="space-y-0.5 tabular-nums">
              <KeyVal k="Subtotal">{formatINR(o.totals.subtotal)}</KeyVal>
              {o.totals.couponDiscount > 0 && (
                <KeyVal k={<>Coupon {o.couponCode && <Badge tone="purple">{o.couponCode}</Badge>}</>}>
                  <span className="text-success">−{formatINR(o.totals.couponDiscount)}</span>
                </KeyVal>
              )}
              {o.totals.prepaidDiscount > 0 && (
                <KeyVal k="Prepaid discount">
                  <span className="text-success">−{formatINR(o.totals.prepaidDiscount)}</span>
                </KeyVal>
              )}
              <KeyVal k="Shipping">{o.totals.shipping ? formatINR(o.totals.shipping) : 'Free'}</KeyVal>
              {o.totals.codFee > 0 && <KeyVal k="COD fee">{formatINR(o.totals.codFee)}</KeyVal>}
              <div className="mt-2 flex items-baseline justify-between border-t border-line-subtle pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold">{formatINR(o.totals.total)}</span>
              </div>
              <p className="pt-1 text-right text-[11px] text-subtle">Prices include GST</p>
            </div>
            {o.invoiceNo && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" />
                  GST invoice {o.invoiceNo}
                </span>
                {o.invoiceId && (
                  <a href={`/admin/invoices/${o.invoiceId}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-link">
                    Open
                  </a>
                )}
              </div>
            )}
            <a href={trackUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-link">
              Customer tracking page <ExternalLink className="size-3.5" />
            </a>
          </Panel>
        </div>
      </div>

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={statusModal ? `${ACTION_LABEL[statusModal]}?` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModal(null)}>
              Back
            </Button>
            <Button variant={statusModal === 'CANCELLED' || statusModal === 'RETURNED' ? 'danger' : 'primary'} loading={busy === 'status'} onClick={() => statusModal && changeStatus(statusModal, statusNote)}>
              {statusModal && ACTION_LABEL[statusModal]}
            </Button>
          </>
        }
      >
        {statusModal === 'SHIPPED' ? (
          <p className="text-sm text-muted">No courier / AWB has been added yet. The customer won’t get a tracking link. You can still mark it shipped and add the AWB later.</p>
        ) : (
          <p className="mb-4 text-sm text-muted">
            {statusModal === 'CANCELLED'
              ? 'Reserved stock goes back on the shelf and the customer is notified. Prepaid orders are marked for refund.'
              : 'Stock is added back and the payment is marked for refund.'}
          </p>
        )}
        {statusModal !== 'SHIPPED' && (
          <Field label="Reason (shown to the customer)">
            <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder={statusModal === 'CANCELLED' ? 'e.g. Customer asked to cancel on call' : 'e.g. Wrong part ordered'} className="min-h-20" />
          </Field>
        )}
      </Modal>
    </>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-link"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? 'Copied' : 'Copy address'}
    </button>
  );
}

function ItemsCard({ o, onAssign, onScan, onUnscan, canPick }: { o: AdminOrderDetail; onAssign: (itemId: string, unitId: string) => void; onScan: (code: string) => Promise<void>; onUnscan: (code: string) => void; canPick: boolean }) {
  const scanning = ['NEW', 'CONFIRMED'].includes(o.status);
  const canAssign = canPick && scanning;
  const needed = o.items.reduce((a, i) => a + i.qty, 0);
  const scanned = o.items.reduce((a, i) => a + i.unitSerials.length, 0);
  return (
    <Panel title={`Items · ${needed}`} padded={false}>
      {scanning && (
        <div className="border-b border-line-subtle px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Scan each unit as you pick it</p>
            <Badge tone={scanned === needed ? 'success' : 'warning'} >
              {scanned}/{needed} scanned
            </Badge>
          </div>
          <ScanInput onScan={onScan} disabled={scanned === needed} placeholder={scanned === needed ? 'All units scanned — ready to pack' : undefined} />
          <p className="mt-2 text-xs text-muted">The order can’t be marked packed until every unit’s barcode is scanned — so each piece that leaves is on record.</p>
        </div>
      )}
      <ul className="divide-y divide-line-subtle">
        {o.items.map((it) => {
          const units = o.availableUnits[it.productId] ?? [];
          return (
            <li key={it.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
              <div className="flex min-w-0 flex-1 gap-3.5">
                <Thumb src={it.image} icon={it.icon} alt={it.title} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${it.productId}`} className="line-clamp-2 text-sm font-semibold hover:text-accent">
                    {it.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-mono">{it.sku}</span>
                    <ConditionBadge condition={it.condition} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {it.unitSerials.map((s) => (
                      <Badge key={s} tone="success">
                        <Check className="size-3" />
                        {s}
                        {scanning && (
                          <button type="button" aria-label={`Remove ${s}`} onClick={() => onUnscan(s)} className="-mr-1 ml-0.5 rounded-full px-1 hover:bg-success/20">
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                    {scanning && it.unitSerials.length < it.qty && <span className="text-[11px] font-medium text-warning">{it.qty - it.unitSerials.length} to scan</span>}
                    {canAssign && it.unitSerials.length < it.qty && units.length > 0 && (
                      <Select
                        aria-label="Assign serial unit"
                        className="h-8 w-auto rounded-full py-0 pl-3 text-xs"
                        value=""
                        onChange={(e) => e.target.value && onAssign(it.id, e.target.value)}
                      >
                        <option value="">Pick without scanning ({units.length} in stock)…</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.serial}
                            {u.grade ? ` · ${CONDITION_SHORT[u.grade]}` : ''}
                            {u.bin ? ` · bin ${u.bin}` : ''}
                          </option>
                        ))}
                      </Select>
                    )}
                    {scanning && it.unitSerials.length < it.qty && units.length === 0 && <span className="text-[11px] text-danger">No units of this part in stock</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-6 pl-[70px] text-sm tabular-nums sm:block sm:pl-0 sm:text-right">
                <p className="text-muted">
                  {it.qty} × {formatINR(it.unitPrice)}
                </p>
                <p className="font-semibold">{formatINR(it.lineTotal)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function ShipmentCard({ o, onSaved }: { o: AdminOrderDetail; onSaved: (d: AdminOrderDetail) => void }) {
  const toast = useToast();
  const [courier, setCourier] = useState(o.shipment?.courier ?? 'Delhivery');
  const [awb, setAwb] = useState(o.shipment?.awb ?? '');
  const [url, setUrl] = useState(o.shipment?.trackingUrl ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!o.shipment);
  const disabled = o.status === 'CANCELLED';

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const r = await adminApi.admin.setShipment(o.id, { courier: courier.trim(), awb: awb.trim(), trackingUrl: url.trim() || undefined });
      onSaved(r);
      setEditing(false);
      toast('Shipment saved — customer can now track it');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Shipment"
      action={
        o.shipment && !editing ? (
          <button type="button" className="text-[13px] font-medium text-link" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : (
          <Truck className="size-4 text-muted" />
        )
      }
    >
      {o.shipment && !editing ? (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted">Courier</p>
            <p className="font-medium">{o.shipment.courier}</p>
          </div>
          <div>
            <p className="text-xs text-muted">AWB</p>
            <p className="font-mono font-medium">{o.shipment.awb}</p>
          </div>
          {o.shipment.shippedAt && (
            <div>
              <p className="text-xs text-muted">Shipped</p>
              <p className="font-medium">{fmtDateTime(o.shipment.shippedAt)}</p>
            </div>
          )}
          {o.shipment.trackingUrl && (
            <a href={o.shipment.trackingUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-link">
              Courier tracking <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      ) : disabled ? (
        <p className="text-sm text-muted">This order was cancelled.</p>
      ) : (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
          <Field label="Courier" error={errors.courier}>
            <Select value={courier} onChange={(e) => setCourier(e.target.value)}>
              {[...new Set([courier, ...COURIERS])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="AWB number" error={errors.awb}>
            <Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="e.g. 1490 2231 8876" invalid={!!errors.awb} />
          </Field>
          <Field label="Tracking URL (optional)" error={errors.trackingUrl}>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" type="url" invalid={!!errors.trackingUrl} />
          </Field>
          <Button type="submit" loading={busy} disabled={awb.trim().length < 4} className="h-11">
            Save
          </Button>
        </form>
      )}
    </Panel>
  );
}

function TimelineCard({ o, onSaved }: { o: AdminOrderDetail; onSaved: (d: AdminOrderDetail) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const events = [...o.events].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      onSaved(await adminApi.admin.addNote(o.id, note.trim()));
      setNote('');
      toast('Note added');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Timeline & notes">
      <form onSubmit={add} className="mb-5 flex gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note (e.g. customer asked for evening delivery)" />
        <Button type="submit" variant="dark" loading={busy} disabled={!note.trim()} aria-label="Add note" className="h-11 shrink-0 px-4">
          <Send className="size-4" />
        </Button>
      </form>
      <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-line-subtle">
        {events.map((ev) => (
          <li key={ev.id} className="relative flex gap-3.5">
            <span className={cn('relative z-[1] mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full ring-4 ring-surface', ev.internal ? 'bg-surface-2 text-muted' : ev.status ? 'bg-accent text-white' : 'bg-tint-lavender text-purple')}>
              {ev.internal ? <User className="size-3" /> : <Check className="size-3" />}
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {ev.label}
                {ev.internal && <Badge>Internal</Badge>}
              </p>
              {ev.note && <p className="mt-0.5 text-[13px] text-muted">{ev.note}</p>}
              <p className="mt-0.5 text-xs text-subtle">
                {fmtDateTime(ev.at)}
                {ev.by && ` · ${ev.by}`}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

