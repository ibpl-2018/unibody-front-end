'use client';
import { formatPhone, type CouponDTO, type LeadStage, type PaymentMethod, type PaymentStatus, type ProductStatus, type Tone } from '@unibody/shared';
import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmtDateTime, formatINR } from '@/lib/format';
import type { AdminOrderListItem } from '@unibody/shared';
import type { Column } from './ui';

const PAY: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PAID: { label: 'Paid', tone: 'success' },
  PENDING: { label: 'Pending', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'purple' },
  COD_PENDING: { label: 'COD', tone: 'neutral' },
  COD_COLLECTED: { label: 'COD · collected', tone: 'success' },
};
export function PaymentBadge({ status, method }: { status: PaymentStatus; method?: PaymentMethod }) {
  const p = PAY[status];
  return (
    <Badge tone={p.tone} dot>
      {status === 'PENDING' && method && method !== 'COD' ? `${method === 'UPI' ? 'UPI' : method === 'CARD' ? 'Card' : 'Netbanking'} · pending` : p.label}
    </Badge>
  );
}

export function StockPill({ available, alert }: { available: number; alert: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className={cn('font-semibold', available <= 0 ? 'text-danger' : available <= alert ? 'text-warning' : 'text-fg')}>{available}</span>
      {available <= 0 ? (
        <Badge tone="danger" dot>
          Out
        </Badge>
      ) : available <= alert ? (
        <Badge tone="warning" dot>
          Low
        </Badge>
      ) : null}
    </span>
  );
}

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'neutral'}>{status === 'ACTIVE' ? 'Live' : status === 'DRAFT' ? 'Draft' : 'Hidden'}</Badge>
);

export const CouponStateBadge = ({ state }: { state: CouponDTO['state'] }) => (
  <Badge tone={state === 'ACTIVE' ? 'success' : state === 'SCHEDULED' ? 'info' : state === 'PAUSED' ? 'warning' : 'neutral'} dot>
    {state === 'ACTIVE' ? 'Active' : state === 'SCHEDULED' ? 'Scheduled' : state === 'PAUSED' ? 'Paused' : 'Ended'}
  </Badge>
);

export const LEAD_LABEL: Record<LeadStage, string> = { ABANDONED: 'Abandoned', CONTACTED: 'Contacted', CONVERTED: 'Converted', LOST: 'Lost' };
export const LEAD_TONE: Record<LeadStage, Tone> = { ABANDONED: 'warning', CONTACTED: 'info', CONVERTED: 'success', LOST: 'neutral' };
export const LeadStageBadge = ({ stage }: { stage: LeadStage }) => (
  <Badge tone={LEAD_TONE[stage]} dot>
    {LEAD_LABEL[stage]}
  </Badge>
);

/** Shared order table columns (dashboard, orders list, customer detail). */
export function orderColumns(opts: { date?: boolean; items?: boolean; compact?: boolean } = {}): Column<AdminOrderListItem>[] {
  const cols: Column<AdminOrderListItem>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (o) => (
        <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-semibold tabular-nums hover:text-accent">
          #{o.orderNo}
        </Link>
      ),
    },
  ];
  if (opts.date !== false) cols.push({ key: 'date', header: 'Date', hide: 'md', cell: (o) => <span className="whitespace-nowrap text-[13px] text-muted">{fmtDateTime(o.createdAt)}</span> });
  cols.push({
    key: 'customer',
    header: 'Customer',
    cell: (o) => (
      <div className="min-w-[140px] leading-tight">
        <p className="font-medium">{o.customerName}</p>
        <p className="mt-0.5 text-xs tabular-nums text-muted">{formatPhone(o.phone)}</p>
      </div>
    ),
  });
  cols.push({ key: 'city', header: 'City', hide: 'lg', cell: (o) => <span className="whitespace-nowrap">{o.city}</span> });
  if (opts.items !== false) cols.push({ key: 'items', header: 'Items', align: 'center', hide: 'xl', cell: (o) => <span className="tabular-nums">{o.itemCount}</span> });
  cols.push({ key: 'payment', header: 'Payment', hide: 'sm', cell: (o) => <PaymentBadge status={o.paymentStatus} method={o.paymentMethod} /> });
  cols.push({ key: 'total', header: 'Total', align: 'right', cell: (o) => <span className="font-medium tabular-nums">{formatINR(o.total)}</span> });
  cols.push({ key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} admin /> });
  return cols;
}
