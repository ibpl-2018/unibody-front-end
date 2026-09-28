import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONDITION_LABEL, type ProductDetailDTO } from '@unibody/shared';
import { orNull, serverApi } from '@/lib/api-server';
import { SITE_URL } from '@/lib/config';
import { categoryShort, modelHref } from '@/lib/store/catalog';
import { getCategories } from '@/lib/store/data';
import { Gallery } from '@/components/store/product/gallery';
import { BuyBox } from '@/components/store/product/buy-box';
import { ProductGrid } from '@/components/store/product-card';
import { Breadcrumbs, Container } from '@/components/store/section';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await orNull(serverApi.store.product(slug)).catch(() => null);
  if (!p) return { title: 'Part not found' };
  const desc = `${CONDITION_LABEL[p.condition]} · fits ${p.fitsLabel}. ${p.description}`.slice(0, 300);
  return {
    title: p.title,
    description: desc,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.title, description: desc, images: p.image ? [{ url: p.image }] : undefined },
  };
}

/** Category-aware "checked like new" talking points. */
function checks(p: ProductDetailDTO) {
  const first: Record<string, { t: string; b: string }> = {
    display: { t: 'Pixel & backlight test', b: 'Dead-pixel, bleed and True Tone checks under 5 lighting profiles.' },
    battery: { t: 'Cycle & health report', b: 'Cycle count and capacity measured — report included in the box.' },
    keyboard: { t: 'Every key, every light', b: 'Each key and the backlight tested on a live board.' },
    cpu: { t: 'Full diagnostics', b: 'Boot, stress and port tests on a bench rig before listing.' },
  };
  return [
    first[p.icon] ?? { t: 'Function tested', b: 'Fitted and tested on a working device before it is listed.' },
    { t: 'Connectors & flex', b: 'Connectors, flex cables and screws inspected for damage.' },
    { t: 'Serial tracked', b: 'Each unit is serial-tracked, so warranty claims are quick.' },
    { t: 'Packed to survive', b: 'Foam-cradled, double-boxed and sealed with a tamper tag.' },
  ];
}
const DOTS = ['bg-vivid-blue', 'bg-vivid-purple', 'bg-vivid-orange', 'bg-vivid-green'];

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await orNull(serverApi.store.product(slug));
  if (!p) notFound();
  const categories = await getCategories().catch(() => []);
  const cat = categories.find((c) => c.id === p.categoryId);
  const model = p.compatible[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    sku: p.sku,
    mpn: p.partNumber ?? undefined,
    image: p.images.length ? p.images : p.image ? [p.image] : undefined,
    description: p.description,
    itemCondition: p.condition === 'COMPATIBLE_NEW' || p.condition === 'GENUINE_NEW_PULL' ? 'https://schema.org/NewCondition' : 'https://schema.org/RefurbishedCondition',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (p.price / 100).toFixed(2),
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/p/${p.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Container className="pb-8 pt-5 sm:pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: p.familyName, href: model ? `/d/${model.familySlug}` : '/shop' },
            ...(model ? [{ label: `${model.name} (${model.yearLabel})`, href: modelHref(model) }] : []),
            ...(cat ? [{ label: categoryShort(cat), href: model ? `${modelHref(model)}?cat=${cat.slug}` : `/shop?cat=${cat.slug}` }] : []),
            { label: p.title.split(' for ')[0] },
          ]}
        />
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Gallery images={p.images} title={p.title} tint={p.icon} badge={p.condition === 'COMPATIBLE_NEW' ? undefined : 'Genuine Apple part'} />
            {p.description && (
              <div className="mt-6 hidden lg:block">
                <h2 className="text-[15px] font-semibold">About this part</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.description}</p>
              </div>
            )}
          </div>
          <BuyBox product={p} />
        </div>
        {p.description && (
          <div className="mt-8 lg:hidden">
            <h2 className="text-[15px] font-semibold">About this part</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.description}</p>
          </div>
        )}
      </Container>

      <section className="hero-glow mt-10 py-14 text-hero-fg sm:py-20" aria-labelledby="checked">
        <Container>
          <h2 id="checked" className="text-[28px] font-semibold tracking-tight sm:text-[40px]">
            Every unit, checked like new.
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {checks(p).map((c, i) => (
              <li key={c.t} className="rounded-[var(--radius-card)] bg-hero-surface/90 p-5">
                <span className={`block size-2 rounded-full ${DOTS[i]}`} aria-hidden />
                <h3 className="mt-4 text-[17px] font-semibold">{c.t}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-hero-muted">{c.b}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {p.compatible.length > 0 && (
        <Container className="pt-14">
          <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">Works with these models</h2>
          <div className="mt-5 overflow-x-auto rounded-[var(--radius-card)] border border-line-subtle">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-bg-2 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Model</th>
                  <th scope="col" className="px-4 py-3 font-medium">Year</th>
                  <th scope="col" className="px-4 py-3 font-medium">A-number</th>
                  <th scope="col" className="px-4 py-3 font-medium">EMC</th>
                  <th scope="col" className="px-4 py-3 font-medium">Chip</th>
                </tr>
              </thead>
              <tbody>
                {p.compatible.map((m) => (
                  <tr key={m.id} className="border-t border-line-subtle">
                    <td className="px-4 py-3">
                      <a href={modelHref(m)} className="hover:text-link hover:underline">
                        {m.fullName.replace(/ \(\d{4}.*\)$/, '')}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted">{m.yearLabel}</td>
                    <td className="px-4 py-3 font-medium">{m.aNumbers.join(' / ')}</td>
                    <td className="px-4 py-3 text-muted">{m.emc ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{m.chip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      )}

      {p.related.length > 0 && (
        <Container className="py-14">
          <h2 className="mb-5 text-[24px] font-semibold tracking-tight sm:text-[28px]">Often bought together</h2>
          <ProductGrid products={p.related} />
        </Container>
      )}
      <div className="h-16 sm:hidden" aria-hidden />
    </>
  );
}
