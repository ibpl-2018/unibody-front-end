import type { Metadata } from 'next';
import { BagView } from '@/components/store/bag-view';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'Your bag', robots: { index: false } };

export default function BagPage() {
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="mb-6 text-[34px] font-bold tracking-tight sm:text-[44px]">Your bag.</h1>
      <BagView />
    </Container>
  );
}
