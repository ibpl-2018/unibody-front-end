import { one, type SP } from '@/lib/admin/params';
import { OrdersView } from './orders-view';

export const metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const initial = { status: one(sp.status), q: one(sp.q), payment: one(sp.payment), city: one(sp.city), page: Number(one(sp.page)) || 1 };
  return <OrdersView key={JSON.stringify(initial)} initial={initial} />;
}
