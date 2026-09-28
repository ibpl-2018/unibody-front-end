import type { Metadata } from 'next';
import { normalizePhone } from '@unibody/shared';
import { TrackView } from '@/components/store/order/track-view';
import { Container } from '@/components/store/section';

type Props = { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `Order ${decodeURIComponent(orderNo).toUpperCase()}`, robots: { index: false } };
}

export default async function TrackOrderPage({ params, searchParams }: Props) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const phone = typeof sp.phone === 'string' ? normalizePhone(sp.phone) : '';
  return (
    <Container className="max-w-[1000px] py-8 sm:py-12">
      <TrackView orderNo={decodeURIComponent(orderNo).toUpperCase()} phone={phone} />
    </Container>
  );
}
