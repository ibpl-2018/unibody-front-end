import type { Metadata } from 'next';
import { loadListing, type SearchParams } from '@/lib/store/listing-data';
import { categoryShort } from '@/lib/store/catalog';
import { Listing, HelpBand } from '@/components/store/listing/listing';
import { Breadcrumbs, Container } from '@/components/store/section';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = typeof sp.cat === 'string' ? sp.cat : null;
  const label = cat ? cat.replace(/-/g, ' ') : null;
  return {
    title: label ? `${label[0].toUpperCase()}${label.slice(1)} for MacBook, iMac, iPhone & iPad` : 'Shop all parts',
    description: 'Browse tested genuine and compatible parts for every Mac, iPhone and iPad. Filter by condition, colour and price. Cash on Delivery available.',
    alternates: { canonical: cat ? `/shop?cat=${cat}` : '/shop' },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { list, filters, categories, key } = await loadListing(searchParams, {});
  const cat = filters.cat ? categories.find((c) => c.slug === filters.cat) : undefined;
  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: cat ? '/shop' : undefined }, ...(cat ? [{ label: categoryShort(cat) }] : [])]} />
      <div className="mb-6 mt-4">
        <h1 className="text-[34px] font-bold tracking-tight sm:text-[44px]">{cat ? categoryShort(cat) : 'All parts'}</h1>
        <p className="mt-1 text-[15px] text-muted">Every part is tested and graded before dispatch. Prices include GST.</p>
      </div>
      <Listing key={key} initial={list} filters={filters} scope={{}} basePath="/shop" categories={categories} />
      <HelpBand />
    </Container>
  );
}
