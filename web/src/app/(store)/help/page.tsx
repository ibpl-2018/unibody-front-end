import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { HELP_TOPICS } from '@/components/store/help-content';
import { Container } from '@/components/store/section';
import { getStoreConfig } from '@/lib/store/data';
import { waLink } from '@/lib/store/catalog';

export const metadata: Metadata = { title: 'Help', description: 'Shipping, Cash on Delivery, returns, warranty and how to find your model number.', alternates: { canonical: '/help' } };

export default async function HelpIndex() {
  const config = await getStoreConfig();
  return (
    <Container className="max-w-[860px] py-12 sm:py-16">
      <h1 className="text-[34px] font-bold tracking-tight sm:text-[44px]">How can we help?</h1>
      <p className="mt-1 text-[15px] text-muted">
        Quick answers below — or{' '}
        <a href={waLink(config.whatsapp, 'Hi Unibody')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
          <MessageCircle className="size-4" /> WhatsApp a technician
        </a>
        .
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {HELP_TOPICS.map((t) => (
          <li key={t.slug}>
            <Link href={`/help/${t.slug}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line-subtle bg-surface p-5 transition hover:border-line hover:shadow-card">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.title}</span>
                <span className="block text-sm text-muted">{t.summary}</span>
              </span>
              <ChevronRight className="size-4 text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
