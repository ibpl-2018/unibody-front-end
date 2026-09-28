'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, LogOut, Package } from 'lucide-react';
import { ApiError, formatINR, formatPhone, type OrderPublicDTO } from '@unibody/shared';
import { Button, ButtonLink, EmptyState, ProductImage, Skeleton, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useSession } from '@/lib/store/session';
import { trackHref } from '@/lib/store/recent-orders';
import { OtpLogin } from '../otp';

export function MyOrders() {
  const { session, ready, signOut } = useSession();
  const [orders, setOrders] = useState<OrderPublicDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setOrders(null);
    try {
      setOrders(await api.store.myOrders());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut();
      else setError(e instanceof ApiError ? e.message : 'Couldn’t load your orders.');
    }
  }, [signOut]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  if (!ready) return <Skeleton className="h-64" />;
  if (!session) {
    return (
      <div className="py-6">
        <h1 className="mb-6 text-center text-[34px] font-bold tracking-tight">My orders</h1>
        <OtpLogin sub="We’ll text you a 6-digit code. No password, no account to create." />
        <p className="mt-6 text-center text-sm text-muted">
          Just want to check one order?{' '}
          <Link href="/track" className="text-link hover:underline">
            Track without signing in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight">My orders</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {session.name ? `${session.name} · ` : ''}
            {formatPhone(session.phone)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <div className="mt-6">
        {error ? (
          <div className="rounded-[var(--radius-card)] bg-danger-soft p-5 text-sm text-danger" role="alert">
            {error}{' '}
            <button className="underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : !orders ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[var(--radius-tile)] bg-bg-2">
            <EmptyState icon={<Package className="size-6" />} title="No orders yet" body="When you order, it’ll show up here with live tracking." action={<ButtonLink href="/shop">Shop parts</ButtonLink>} />
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.orderNo}>
                <Link href={trackHref(o.orderNo, session.phone)} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line-subtle bg-surface p-4 transition hover:border-line hover:shadow-card">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((it) => (
                      <ProductImage key={it.id} src={it.image} alt="" tint={it.icon} className="size-12 border-2 border-surface" rounded="rounded-xl" imgClassName="p-1" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold">#{o.orderNo}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {fmtDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'} · {o.items[0]?.title}
                    </p>
                  </div>
                  <span className="hidden text-[15px] font-semibold tabular-nums sm:block">{formatINR(o.totals.total)}</span>
                  <ChevronRight className="size-4 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
