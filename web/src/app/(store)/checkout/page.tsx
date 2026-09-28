import type { Metadata } from 'next';
import { CheckoutView } from '@/components/store/checkout/checkout-view';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="py-8 sm:py-10">
      <h1 className="mb-6 text-[34px] font-bold tracking-tight sm:text-[40px]">Checkout</h1>
      <CheckoutView />
    </Container>
  );
}
