'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Lock, RefreshCcw } from 'lucide-react';
import { ApiError, formatINR, PAYMENT_METHOD_LABEL, type PaymentInfoDTO } from '@unibody/shared';
import { Button, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useStoreConfig } from '@/lib/store/config';
import { waLink } from '@/lib/store/catalog';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (evt: string, cb: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

const RZP_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RZP_SRC}"]`);
    const s = existing ?? document.createElement('script');
    s.src = RZP_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    if (!existing) document.body.appendChild(s);
  });
}

/** Only allow deep links back into the app or same-site paths. */
function safeReturn(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (/^(unibody|exp|exps):\/\//i.test(url)) return url;
  return null;
}

type Phase = 'loading' | 'ready' | 'processing' | 'paid' | 'failed' | 'error';

export function PayView({ orderNo, phone, returnUrl }: { orderNo: string; phone: string; returnUrl: string | null }) {
  const router = useRouter();
  const config = useStoreConfig();
  const [info, setInfo] = useState<PaymentInfoDTO | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const autoOpened = useRef(false);
  const ret = safeReturn(returnUrl);

  const finish = useCallback(() => {
    if (ret) {
      const sep = ret.includes('?') ? '&' : '?';
      window.location.href = `${ret}${sep}status=paid&orderNo=${encodeURIComponent(orderNo)}`;
    } else router.replace(`/order/${orderNo}?phone=${phone}&new=1`);
  }, [ret, router, orderNo, phone]);

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const r = await api.store.paymentInfo(orderNo, phone);
      setInfo(r);
      if (r.paymentStatus === 'PAID') {
        setPhase('paid');
        setTimeout(finish, 1200);
      } else if (r.paymentMethod === 'COD') {
        router.replace(`/order/${orderNo}?phone=${phone}`);
      } else if (r.status === 'CANCELLED') {
        setMessage('This order was cancelled.');
        setPhase('error');
      } else setPhase('ready');
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'We couldn’t load this payment.');
      setPhase('error');
    }
  }, [orderNo, phone, finish, router]);

  useEffect(() => {
    if (!phone) {
      setMessage('This payment link is missing the mobile number.');
      setPhase('error');
      return;
    }
    void load();
  }, [load, phone]);

  const verify = async (r: RazorpayResponse) => {
    setPhase('processing');
    try {
      await api.store.verifyPayment({ orderNo, ...r });
      setPhase('paid');
      setTimeout(finish, 1200);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Payment could not be verified.');
      setPhase('failed');
    }
  };

  const payMock = (ok: boolean) => {
    if (!info) return;
    if (!ok) {
      setMessage('The test payment was declined.');
      setPhase('failed');
      return;
    }
    void verify({ razorpay_order_id: info.razorpay?.orderId ?? `order_mock_${orderNo}`, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock_signature' });
  };

  const openRazorpay = useCallback(async () => {
    if (!info?.razorpay) {
      setMessage('Online payment isn’t set up for this order.');
      setPhase('failed');
      return;
    }
    setPhase('processing');
    const ok = await loadRazorpay();
    if (!ok || !window.Razorpay) {
      setMessage('Couldn’t reach Razorpay. Check your connection and try again.');
      setPhase('failed');
      return;
    }
    const rz = info.razorpay;
    const rzp = new window.Razorpay({
      key: rz.keyId,
      order_id: rz.orderId,
      amount: rz.amount,
      currency: rz.currency,
      name: rz.name,
      description: `Order ${orderNo}`,
      prefill: rz.prefill,
      theme: { color: '#0071e3' },
      handler: (resp: RazorpayResponse) => void verify(resp),
      modal: { ondismiss: () => setPhase('ready'), confirm_close: true },
    });
    rzp.on('payment.failed', (r) => {
      setMessage(r.error?.description ?? 'Payment failed.');
      setPhase('failed');
    });
    rzp.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, orderNo]);

  // Real gateway: open automatically once
  useEffect(() => {
    if (phase === 'ready' && info && !info.mock && !autoOpened.current) {
      autoOpened.current = true;
      void openRazorpay();
    }
  }, [phase, info, openRazorpay]);

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-8 text-center">
        <AlertTriangle className="mx-auto size-10 text-warning" />
        <h1 className="mt-4 text-xl font-semibold">Payment unavailable</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/track" className="inline-flex h-10 items-center rounded-full bg-surface-2 px-5 text-sm font-medium">
            Track an order
          </Link>
          <a href={waLink(config.whatsapp, `Hi, I need help paying for order ${orderNo}`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent">
            WhatsApp us
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'paid') {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h1 className="mt-4 text-2xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted">{ret ? 'Taking you back to the app…' : 'Opening your order…'}</p>
      </div>
    );
  }

  const amount = info ? formatINR(info.total) : '';
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
        <p className="text-[13px] text-muted">Order {orderNo}</p>
        <p className="mt-1 text-[40px] font-bold tracking-tight">{amount}</p>
        <p className="text-sm text-muted">{info ? PAYMENT_METHOD_LABEL[info.paymentMethod] : ''} · Secured by Razorpay</p>

        {phase === 'failed' && (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {message} Your order is saved — you can try again. No money was taken.
            </span>
          </div>
        )}

        {info?.mock ? (
          <div className="mt-6 rounded-2xl border border-dashed border-warning/60 bg-warning-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning">
              <FlaskConical className="size-4" /> Test payment
            </p>
            <p className="mt-1 text-xs text-muted">Payments are in test mode. No real money moves — choose an outcome to simulate.</p>
            <div className="mt-4 grid gap-2">
              <Button size="lg" onClick={() => payMock(true)} loading={phase === 'processing'}>
                Pay {amount} (success)
              </Button>
              <Button variant="outline" onClick={() => payMock(false)} disabled={phase === 'processing'}>
                Simulate failure
              </Button>
            </div>
          </div>
        ) : (
          <Button size="lg" className="mt-6 w-full" onClick={() => void openRazorpay()} loading={phase === 'processing'}>
            {phase === 'failed' ? <RefreshCcw className="size-4" /> : <Lock className="size-4" />} {phase === 'failed' ? 'Try again' : `Pay ${amount}`}
          </Button>
        )}
        <p className="mt-4 text-center text-xs text-subtle">
          Having trouble?{' '}
          <a href={waLink(config.whatsapp, `Hi, I need help paying for order ${orderNo}`)} target="_blank" rel="noreferrer" className="text-link hover:underline">
            WhatsApp us
          </a>
        </p>
      </div>
    </div>
  );
}
