import type { Metadata } from 'next';
import { BadgePercent, Banknote, Truck } from 'lucide-react';
import { formatINR, type ProductCardDTO } from '@unibody/shared';
import { serverApi } from '@/lib/api-server';
import { getStoreConfig } from '@/lib/store/data';
import { OfferBanner } from '@/components/store/home/sections';
import { ProductGrid } from '@/components/store/product-card';
import { Container, SectionHead } from '@/components/store/section';

export const metadata: Metadata = {
  title: 'Offers — festive discounts on Mac parts',
  description: 'Current Unibody offers: festive coupon codes, extra discount on prepaid orders and free delivery.',
  alternates: { canonical: '/offers' },
};

const pick = (p: Promise<{ items: ProductCardDTO[] }>) => p.then((r) => r.items).catch((): ProductCardDTO[] => []);

export default async function OffersPage() {
  const config = await getStoreConfig();
  const [batteries, keyboards, deals] = await Promise.all([
    pick(serverApi.store.products({ category: 'battery', inStock: true, pageSize: 4 })),
    pick(serverApi.store.products({ category: 'top-case', inStock: true, pageSize: 4 })),
    pick(serverApi.store.products({ featured: true, inStock: true, pageSize: 8 })),
  ]);
  const perks = [
    { icon: BadgePercent, tone: 'bg-vivid-purple', title: `Extra ${config.prepaidDiscountPct}% off`, body: 'on every prepaid order — UPI, card or net banking.' },
    { icon: Truck, tone: 'bg-vivid-blue', title: 'Free delivery', body: `on orders over ${formatINR(config.freeShippingOver)}.` },
    { icon: Banknote, tone: 'bg-vivid-green', title: 'Cash on Delivery', body: `up to ${formatINR(config.codMaxOrder)} in ${config.cities.length || 6} cities (${formatINR(config.codFee)} fee).` },
  ];
  return (
    <>
      <Container className="pt-8 sm:pt-12">
        <h1 className="text-[34px] font-bold tracking-tight sm:text-[48px]">Offers</h1>
        <p className="mt-1 text-[15px] text-muted">Savings that stack. Codes apply at checkout.</p>
      </Container>
      {config.banner && <OfferBanner banner={config.banner} />}
      <Container>
        <ul className="grid gap-3 sm:grid-cols-3">
          {perks.map((p) => (
            <li key={p.title} className="flex items-start gap-3 rounded-[var(--radius-card)] bg-bg-2 p-5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${p.tone}`}>
                <p.icon className="size-[18px]" />
              </span>
              <p className="text-sm">
                <strong className="block text-[15px] font-semibold">{p.title}</strong>
                <span className="text-muted">{p.body}</span>
              </p>
            </li>
          ))}
        </ul>
        {batteries.length > 0 && (
          <section className="pt-14">
            <SectionHead title="Batteries" href="/shop?cat=battery" />
            <ProductGrid products={batteries} />
          </section>
        )}
        {keyboards.length > 0 && (
          <section className="pt-14">
            <SectionHead title="Keyboards & top cases" href="/shop?cat=top-case" />
            <ProductGrid products={keyboards} />
          </section>
        )}
        {deals.length > 0 && (
          <section className="py-14">
            <SectionHead title="Bestsellers" href="/shop" />
            <ProductGrid products={deals} />
          </section>
        )}
      </Container>
    </>
  );
}
