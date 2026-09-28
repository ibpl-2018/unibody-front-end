import type { Metadata } from 'next';
import { normalizePhone } from '@unibody/shared';
import { PayView } from '@/components/store/pay-view';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'Secure payment', robots: { index: false } };

export default async function PayPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const phone = typeof sp.phone === 'string' ? normalizePhone(sp.phone) : '';
  const ret = typeof sp.return === 'string' ? sp.return : null;
  return (
    <Container className="py-10 sm:py-16">
      <PayView orderNo={decodeURIComponent(orderNo).toUpperCase()} phone={phone} returnUrl={ret} />
    </Container>
  );
}
