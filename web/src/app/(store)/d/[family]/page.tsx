import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { orNull, serverApi } from '@/lib/api-server';
import { loadListing, type SearchParams } from '@/lib/store/listing-data';
import { FamilyHero } from '@/components/store/listing/heroes';
import { Listing, HelpBand } from '@/components/store/listing/listing';
import { Breadcrumbs, Container } from '@/components/store/section';

type Params = Promise<{ family: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family } = await params;
  const f = await orNull(serverApi.store.family(family)).catch(() => null);
  if (!f) return { title: 'Device not found' };
  return {
    title: `${f.name} parts — displays, batteries, keyboards & more`,
    description: `${f.productCount} tested parts for ${f.name} across ${f.modelCount} models. Genuine and compatible, 1–3 day delivery, Cash on Delivery available.`,
    alternates: { canonical: `/d/${f.slug}` },
  };
}

export default async function FamilyPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { family: slug } = await params;
  const family = await orNull(serverApi.store.family(slug));
  if (!family) notFound();
  const { list, filters, categories, key } = await loadListing(searchParams, { family: family.slug });
  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: family.name }]} />
      <div className="mt-4">
        <FamilyHero family={family} />
      </div>
      <h2 className="mb-4 mt-12 text-[22px] font-semibold tracking-tight">All {family.name} parts</h2>
      <Listing key={key} initial={list} filters={filters} scope={{ family: family.slug }} basePath={`/d/${family.slug}`} categories={categories} />
      <HelpBand />
    </Container>
  );
}
