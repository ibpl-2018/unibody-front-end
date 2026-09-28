'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CircleX, ExternalLink, MessageCircle, RotateCcw, Truck } from 'lucide-react';
import { ApiError, STATUS_LABEL, type OrderPublicDTO } from '@unibody/shared';
import { Button, Modal, Select, Skeleton, StatusBadge } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { fmtDateTime, fmtWeekday } from '@/lib/format';
import { useStoreConfig } from '@/lib/store/config';
import { waLink } from '@/lib/store/catalog';
import { rememberOrder } from '@/lib/store/recent-orders';
import { AddressBlock, OrderItems, Timeline } from './parts';
import { TrackForm } from './track-form';

type Live = 'connecting' | 'live' | 'offline';

/** Subscribes to the order's SSE stream with auto-reconnect; calls onEvent for each status change. */
function useOrderStream(orderNo: string, phone: string, enabled: boolean, onEvent: () => void) {
  const [live, setLive] = useState<Live>('connecting');
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const connect = () => {
      if (closed) return;
      setLive('connecting');
      es = new EventSource(api.store.trackStreamUrl(orderNo, phone));
      es.addEventListener('ready', () => {
        // Refetch after a reconnect in case we missed events
        if (retry > 0) cb.current();
        retry = 0;
        setLive('live');
      });
      es.addEventListener('order', () => cb.current());
      es.onerror = () => {
        es?.close();
        setLive('offline');
        const delay = Math.min(30_000, 2000 * 2 ** retry++);
        timer = setTimeout(connect, delay);
      };
    };
    connect();
    const onVis = () => {
      if (document.visibilityState === 'visible' && es?.readyState === EventSource.CLOSED) {
        if (timer) clearTimeout(timer);
        retry = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      closed = true;
      es?.close();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [orderNo, phone, enabled]);
  return live;
}

function heroTitle(o: OrderPublicDTO) {
  switch (o.status) {
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Order cancelled';
    case 'RETURNED':
      return 'Order returned';
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery today';
    default:
      return o.etaDate ? `Arriving ${fmtWeekday(o.etaDate)}` : 'Order received';
  }
}
function heroSub(o: OrderPublicDTO) {
  if (o.shipment) return `${o.shipment.courier} · AWB ${o.shipment.awb}`;
  switch (o.status) {
    case 'NEW':
      return o.paymentMethod === 'COD' ? 'We’ll confirm your COD order by call or WhatsApp shortly.' : o.paymentStatus === 'PAID' ? 'Payment received — confirming your order.' : 'Waiting for payment.';
    case 'CONFIRMED':
      return 'Your parts are being picked and bench-tested.';
    case 'PACKED':
      return 'Packed and quality-checked — handing to the courier.';
    case 'SHIPPED':
      return 'On its way with our courier partner.';
    case 'OUT_FOR_DELIVERY':
      return 'Keep your phone handy — the courier will call before arriving.';
    case 'DELIVERED':
      return 'Enjoy your repair! Warranty starts today.';
    case 'CANCELLED':
      return o.paymentStatus === 'REFUNDED' ? 'Your refund has been issued.' : 'No further action needed.';
    default:
      return '';
  }
}

export function TrackView({ orderNo, phone }: { orderNo: string; phone: string }) {
  const toast = useToast();
  const config = useStoreConfig();
  const [order, setOrder] = useState<OrderPublicDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('Ordered by mistake');
  const [cancelling, setCancelling] = useState(false);
  const statusRef = useRef<string | null>(null);

  const load = useCallback(
    async (fromEvent = false) => {
      try {
        const o = await api.store.track(orderNo, phone);
        if (fromEvent && statusRef.current && statusRef.current !== o.status) {
          setFlash(true);
          setTimeout(() => setFlash(false), 2000);
          toast(`Order update: ${STATUS_LABEL[o.status]}`, 'info');
        }
        statusRef.current = o.status;
        setOrder(o);
        setError(null);
        rememberOrder({ orderNo: o.orderNo, phone, status: o.status, total: o.totals.total });
      } catch (e) {
        setError(e instanceof ApiError ? (e.status === 404 || e.status === 403 ? 'We couldn’t find an order with that number and mobile. Please check and try again.' : e.message) : 'Couldn’t load your order. Check your connection.');
      }
    },
    [orderNo, phone, toast],
  );

  useEffect(() => {
    if (phone) void load();
    else setError('Enter the mobile number used for this order.');
  }, [load, phone]);

  const final = order && (order.status === 'DELIVERED' || order.status === 'CANCELLED' || order.status === 'RETURNED');
  const live = useOrderStream(orderNo, phone, !!order && !final, () => void load(true));

  const cancel = async () => {
    setCancelling(true);
    try {
      const o = await api.store.cancelOrder(orderNo, phone, reason);
      setOrder(o);
      setCancelOpen(false);
      toast('Your order has been cancelled');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Couldn’t cancel. Please WhatsApp us.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight sm:text-[40px]">Track your order</h1>
        <p className="mt-1 text-sm text-muted">No login needed — just your order number and mobile.</p>
      </div>
      <TrackForm defaultOrderNo={orderNo} defaultPhone={phone} compact />
    </div>
  );

  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <div className="flex items-start gap-3 rounded-[var(--radius-tile)] bg-warning-soft p-5 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="mt-1 text-muted">
              Need help?{' '}
              <a href={waLink(config.whatsapp, `Hi, I can't find my order ${orderNo}`)} target="_blank" rel="noreferrer" className="text-link hover:underline">
                WhatsApp us
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-60 rounded-[26px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const bad = order.status === 'CANCELLED' || order.status === 'RETURNED';
  const updates = order.events.filter((e) => !e.internal).slice().sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div className="space-y-6">
      {header}

      <section
        className={cn(
          'relative overflow-hidden rounded-[26px] p-5 transition-shadow sm:p-8',
          bad ? 'bg-danger-soft' : 'bg-tint-lavender',
          flash && 'ring-4 ring-accent/40',
        )}
        style={bad ? undefined : { backgroundImage: 'linear-gradient(120deg, var(--tint-sky), var(--tint-lavender) 55%, var(--tint-mint))' }}
        aria-live="polite"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              {!final && (
                <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium', live === 'live' ? 'text-success' : 'text-muted')} title={live === 'live' ? 'Updates appear instantly' : 'Reconnecting…'}>
                  <span className={cn('size-1.5 rounded-full', live === 'live' ? 'animate-pulse bg-success' : 'bg-subtle')} />
                  {live === 'live' ? 'Live' : live === 'connecting' ? 'Connecting' : 'Reconnecting'}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-[26px] font-bold tracking-tight sm:text-[32px]">{heroTitle(order)}</h2>
            <p className="mt-1 text-sm text-muted">{heroSub(order)}</p>
            {order.shipment?.trackingUrl && (
              <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-link hover:underline">
                <Truck className="size-4" /> Courier tracking <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[15px] font-semibold">Order #{order.orderNo}</p>
            <p className="text-xs text-muted">Placed {fmtDateTime(order.createdAt)}</p>
          </div>
        </div>
        {!bad && (
          <div className="mt-8">
            <Timeline order={order} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6" aria-labelledby="updates">
          <h2 id="updates" className="text-[19px] font-semibold">
            Updates
          </h2>
          <ol className="mt-5">
            {updates.map((e, i) => (
              <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                {i < updates.length - 1 && <span className="absolute left-[5px] top-4 h-full w-[2px] bg-line-subtle" aria-hidden />}
                <span className={cn('relative mt-1.5 size-3 shrink-0 rounded-full', i === 0 ? (bad ? 'bg-danger' : 'bg-success ring-4 ring-success/20') : 'bg-success')} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-[15px] font-medium">{e.label}</p>
                    <time className="text-xs text-muted" dateTime={e.at}>
                      {fmtDateTime(e.at)}
                    </time>
                  </div>
                  {e.note && <p className="mt-0.5 text-[13px] text-muted">{e.note}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line-subtle pt-5">
            <AddressBlock order={order} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6" aria-labelledby="items">
            <h2 id="items" className="mb-4 text-[17px] font-semibold">
              Items
            </h2>
            <OrderItems order={order} compact />
          </section>
          <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6" aria-labelledby="help">
            <h2 id="help" className="mb-4 text-[17px] font-semibold">
              Need help?
            </h2>
            <a
              href={waLink(config.whatsapp, `Hi Unibody, I need help with order ${order.orderNo}`)}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-fg text-sm font-medium text-bg hover:opacity-90"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
            {order.canCancel ? (
              <Button variant="outline" className="mt-2 w-full text-danger" onClick={() => setCancelOpen(true)}>
                <CircleX className="size-4" /> Cancel order
              </Button>
            ) : order.status === 'DELIVERED' ? (
              <a
                href={waLink(config.whatsapp, `Hi Unibody, I'd like to return an item from order ${order.orderNo}`)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-medium hover:bg-surface-2"
              >
                <RotateCcw className="size-4" /> Request return
              </a>
            ) : null}
            <p className="mt-3 text-center text-xs text-muted">
              {order.canCancel ? 'You can cancel until your order is packed.' : bad ? 'Questions about a refund? We reply within 15 minutes.' : (
                <>
                  Returns accepted within 7 days of delivery.{' '}
                  <Link href="/help/returns" className="text-link hover:underline">
                    Policy
                  </Link>
                </>
              )}
            </p>
          </section>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button variant="danger" onClick={cancel} loading={cancelling}>
              Cancel order
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{order.paymentStatus === 'PAID' ? 'Your payment will be refunded to the original method within 5–7 working days.' : 'Nothing has been charged, so there’s nothing to refund.'}</p>
        <label htmlFor="reason" className="mt-4 block text-[13px] font-medium text-muted">
          Reason
        </label>
        <Select id="reason" className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)}>
          {['Ordered by mistake', 'Found the wrong part', 'Found a better price', 'Delivery is too slow', 'Other'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
