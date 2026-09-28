import type { Metadata } from 'next';
import type { ProductCardDTO } from '@unibody/shared';
import { serverApi } from '@/lib/api-server';
import { getCategories, getFamiliesSafe, getStoreConfig } from '@/lib/store/data';
import { popularModels } from '@/lib/store/catalog';
import { Hero, type HeroStat } from '@/components/store/home/hero';
import { ShopByPart } from '@/components/store/home/shop-by-part';
import { PartFinder } from '@/components/store/home/part-finder';
import { ShopByDevice } from '@/components/store/home/shop-by-device';
import { ConditionGuide, OfferBanner, PopularModels, WhyBand } from '@/components/store/home/sections';
import { ProductGrid } from '@/components/store/product-card';
import { Container, SectionHead } from '@/components/store/section';

export const metadata: Metadata = {
  title: { absolute: 'Unibody — Every part. Every Mac. Tested parts for MacBook, iMac, iPhone & iPad' },
  description:
    'Genuine and compatible displays, keyboards, batteries and logic boards for MacBook Air, MacBook Pro, iMac, iPhone and iPad — 2012 to today. Tested before dispatch, delivered in 1–3 days, Cash on Delivery.',
  alternates: { canonical: '/' },
  openGraph: { title: 'Unibody — Every part. Every Mac.', description: 'Tested Apple device parts, delivered across India in 1–3 days.', type: 'website' },
};

export default async function HomePage() {
  const [config, families, categories, featured] = await Promise.all([
    getStoreConfig(),
    getFamiliesSafe(),
    getCategories().catch(() => []),
    serverApi.store
      .products({ featured: true, pageSize: 8, inStock: true })
      .then((r) => r.items)
      .catch((): ProductCardDTO[] => []),
  ]);

  const allModels = families.flatMap((f) => f.models ?? []);
  const years = allModels.map((m) => m.yearFrom);
  const parts = families.reduce((a, f) => a + f.productCount, 0);
  const stats: HeroStat[] = [
    { value: parts ? `${Math.floor(parts / 10) * 10}+` : '200+', label: 'parts listed', tone: 'text-vivid-blue' },
    { value: years.length ? `${Math.min(...years)} → ${Math.max(...years)}` : '2012 → 2025', label: 'models covered', tone: 'text-vivid-purple' },
    { value: '1–3 days', label: `delivery in ${config.cities.length || 6} cities`, tone: 'text-vivid-pink' },
    { value: '180 days', label: 'max warranty', tone: 'text-vivid-orange' },
  ];

  return (
    <>
      <Hero stats={stats} />
      <ShopByPart categories={categories} />
      {families.length > 0 && <PartFinder families={families} categories={categories} />}
      {families.length > 0 && <ShopByDevice families={families} />}
      {config.banner && <OfferBanner banner={config.banner} />}
      {featured.length > 0 && (
        <section className="py-12 sm:py-16" aria-labelledby="bestsellers">
          <Container>
            <SectionHead id="bestsellers" title="Bestselling parts." href="/shop" />
            <ProductGrid products={featured.slice(0, 8)} />
          </Container>
        </section>
      )}
      <WhyBand />
      <ConditionGuide />
      <PopularModels models={popularModels(families, 10)} />
    </>
  );
}
