import type { Metadata } from 'next';
import { PackageSearch } from 'lucide-react';
import { TrackForm, RecentOrders } from '@/components/store/order/track-form';
import { Container } from '@/components/store/section';

export const metadata: Metadata = { title: 'Track your order', description: 'Track your Unibody order live with your order number and mobile — no login needed.', alternates: { canonical: '/track' } };

export default function TrackPage() {
  return (
    <Container className="max-w-[760px] py-12 sm:py-20">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <PackageSearch className="size-6" />
      </span>
      <h1 className="mt-5 text-[34px] font-bold tracking-tight sm:text-[44px]">Track your order</h1>
      <p className="mt-1 text-[15px] text-muted">No login needed — just your order number and the mobile you used. You’ll find the order number in your SMS / WhatsApp confirmation.</p>
      <TrackForm className="mt-6" />
      <RecentOrders />
    </Container>
  );
}
