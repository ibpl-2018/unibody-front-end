import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import type { DeviceModelDTO } from '@unibody/shared';
import { serverApi } from '@/lib/api-server';
import { loadListing, type SearchParams } from '@/lib/store/listing-data';
import { familyLook, isANumber, modelHref, modelShort } from '@/lib/store/catalog';
import { Listing, HelpBand } from '@/components/store/listing/listing';
import { MyDevicePill } from '@/components/store/listing/device-pill';
import { Breadcrumbs, Container } from '@/components/store/section';
import { cn } from '@/lib/cn';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = typeof q === 'string' ? q.trim() : '';
  return { title: term ? `“${term}” — search` : 'Search parts', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const aNum = q.split(/\s+/).find(isANumber);
  const [listing, models] = await Promise.all([
    q ? loadListing(searchParams, {}) : null,
    aNum ? serverApi.store.findModel(aNum).catch((): DeviceModelDTO[] => []) : Promise.resolve([] as DeviceModelDTO[]),
  ]);
  const matched = models.filter((m) => m.familySlug !== 'accessories' && m.aNumbers.includes(aNum!.toUpperCase()));

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
      <form action="/search" method="get" role="search" className="mt-4 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
        <label htmlFor="sq" className="sr-only">
          Search parts or model number
        </label>
        <input id="sq" name="q" defaultValue={q} placeholder="Search parts or model number — e.g. A2337" className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" />
        <button type="submit" className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-[13px] font-medium text-on-accent hover:bg-accent-hover">
          Search
        </button>
      </form>

      {q && (
        <h1 className="mt-8 text-[28px] font-bold tracking-tight sm:text-[36px]">
          {listing?.list.total ?? 0} result{listing?.list.total === 1 ? '' : 's'} for “{q}”
        </h1>
      )}

      {matched.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {matched.map((m) => {
            const look = familyLook(m.familySlug);
            return (
              <div key={m.id} className={cn('flex items-center gap-4 rounded-2xl p-4', look.dark ? 'bg-hero-surface text-hero-fg' : look.tint)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={look.render} alt="" className="h-16 w-24 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs', look.dark ? 'text-hero-muted' : 'text-muted')}>{aNum!.toUpperCase()} is</p>
                  <p className="truncate font-semibold">{m.fullName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <Link href={modelHref(m)} className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:underline">
                      All {m.productCount ?? 0} parts for {modelShort(m)} <ArrowRight className="size-3.5" />
                    </Link>
                    <MyDevicePill model={m} dark={look.dark} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {listing ? (
        <div className="mt-6">
          <Listing key={listing.key} initial={listing.list} filters={listing.filters} scope={{}} basePath="/search" categories={listing.categories} />
        </div>
      ) : (
        <div className="mt-10">
          <h1 className="text-[28px] font-bold tracking-tight">What are you looking for?</h1>
          <p className="mt-2 text-muted">Try a part name (“battery”, “display”) or your model number from the bottom case (“A2337”).</p>
        </div>
      )}
      <HelpBand />
    </Container>
  );
}
