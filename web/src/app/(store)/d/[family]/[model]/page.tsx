import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { orNull, serverApi } from '@/lib/api-server';
import { loadListing, type SearchParams } from '@/lib/store/listing-data';
import { findModelBySlug, modelShort, modelSlug } from '@/lib/store/catalog';
import { getStoreConfig } from '@/lib/store/data';
import { ModelHero } from '@/components/store/listing/heroes';
import { Listing, HelpBand } from '@/components/store/listing/listing';
import { Breadcrumbs, Container } from '@/components/store/section';

type Params = Promise<{ family: string; model: string }>;

async function resolve(familySlug: string, modelParam: string) {
  const family = await orNull(serverApi.store.family(familySlug));
  if (!family) return null;
  const model = findModelBySlug(family.models ?? [], decodeURIComponent(modelParam));
  return model ? { family, model } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family, model } = await params;
  const r = await resolve(family, model).catch(() => null);
  if (!r) return { title: 'Model not found' };
  const name = r.model.fullName;
  return {
    title: `${name} parts · ${r.model.aNumbers.join(' / ')}`,
    description: `Displays, batteries, keyboards and more that fit the ${name} (${r.model.aNumbers.join(', ')}). Tested, graded, delivered in 1–3 days.`,
    alternates: { canonical: `/d/${r.family.slug}/${modelSlug(r.model)}` },
  };
}

export default async function ModelPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const p = await params;
  const r = await resolve(p.family, p.model);
  if (!r) notFound();
  const { family, model } = r;
  // Canonicalise /d/macbook-air/a2337 or a raw id to the readable slug
  if (decodeURIComponent(p.model).toLowerCase() !== modelSlug(model)) {
    const sp = new URLSearchParams(Object.entries(await searchParams).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])));
    permanentRedirect(`/d/${family.slug}/${modelSlug(model)}${sp.size ? `?${sp}` : ''}`);
  }
  const [{ list, filters, categories, key }, config] = await Promise.all([loadListing(searchParams, { model: model.id }), getStoreConfig()]);
  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: family.name, href: `/d/${family.slug}` }, { label: `${modelShort(model).replace(family.name, '').trim() || model.name} · ${model.aNumbers[0]}` }]} />
      <div className="mt-4">
        <ModelHero model={model} list={list} config={config} />
      </div>
      <div className="mt-6">
        <Listing key={key} initial={list} filters={filters} scope={{ model: model.id }} basePath={`/d/${family.slug}/${modelSlug(model)}`} categories={categories} />
      </div>
      <HelpBand />
    </Container>
  );
}
