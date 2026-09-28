import type { Metadata } from 'next';
import { MyOrders } from '@/components/store/order/my-orders';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'My orders', robots: { index: false } };

export default function OrdersPage() {
  return (
    <Container className="max-w-[860px] py-10 sm:py-14">
      <MyOrders />
    </Container>
  );
}
