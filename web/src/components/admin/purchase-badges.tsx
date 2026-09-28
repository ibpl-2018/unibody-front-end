'use client';
import type { PurchaseDTO } from '@unibody/shared';
import { Badge } from '@/components/ui';

export const PayStateBadge = ({ s }: { s: PurchaseDTO['paymentState'] }) => (
  <Badge tone={s === 'PAID' ? 'success' : s === 'PARTLY_PAID' ? 'warning' : 'danger'} dot>
    {s === 'PAID' ? 'Paid' : s === 'PARTLY_PAID' ? 'Part paid' : 'Unpaid'}
  </Badge>
);
export const StockStateBadge = ({ s }: { s: PurchaseDTO['stockState'] }) => (
  <Badge tone={s === 'RECEIVED' ? 'success' : s === 'HARVESTING' ? 'purple' : s === 'PARTIAL' ? 'info' : 'warning'}>
    {s === 'RECEIVED' ? 'Received' : s === 'HARVESTING' ? 'Harvesting' : s === 'PARTIAL' ? 'Partly received' : 'Awaiting delivery'}
  </Badge>
);
