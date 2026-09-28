import type { Metadata } from 'next';
import { normalizePhone } from '@unibody/shared';
import { Confirmation } from '@/components/store/order/confirmation';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const phone = typeof sp.phone === 'string' ? normalizePhone(sp.phone) : '';
  return (
    <Container className="py-8 sm:py-12">
      <Confirmation orderNo={decodeURIComponent(orderNo).toUpperCase()} phone={phone} fresh={sp.new === '1'} />
    </Container>
  );
}
