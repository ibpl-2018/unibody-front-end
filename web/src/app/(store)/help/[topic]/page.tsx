import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HELP_TOPICS } from '@/components/store/help-content';
import { Breadcrumbs, Container } from '@/components/store/section';
import { getStoreConfig } from '@/lib/store/data';

type Params = Promise<{ topic: string }>;

export function generateStaticParams() {
  return HELP_TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { topic } = await params;
  const t = HELP_TOPICS.find((x) => x.slug === topic);
  return t ? { title: t.title, description: t.summary, alternates: { canonical: `/help/${t.slug}` } } : { title: 'Help' };
}

export default async function HelpTopicPage({ params }: { params: Params }) {
  const { topic } = await params;
  const t = HELP_TOPICS.find((x) => x.slug === topic);
  if (!t) notFound();
  const config = await getStoreConfig();
  return (
    <Container className="max-w-[760px] py-10 sm:py-14">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Help', href: '/help' }, { label: t.title }]} />
      <article className="mt-5">
        <h1 className="text-[32px] font-bold tracking-tight sm:text-[40px]">{t.title}</h1>
        {t.body(config)}
      </article>
      <nav aria-label="More help" className="mt-14 border-t border-line-subtle pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">More help</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {HELP_TOPICS.filter((x) => x.slug !== t.slug).map((x) => (
            <li key={x.slug}>
              <Link href={`/help/${x.slug}`} className="inline-flex rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] hover:bg-line-subtle">
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
