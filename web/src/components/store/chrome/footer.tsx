import Link from 'next/link';
import { MessageCircle, Phone } from 'lucide-react';
import type { StoreConfigDTO } from '@unibody/shared';
import { Logo, ThemeToggle } from '@/components/ui';
import { NAV_FAMILIES, waLink } from '@/lib/store/catalog';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  { title: 'Shop by device', links: NAV_FAMILIES.map((f) => ({ label: f.label, href: `/d/${f.slug}` })) },
  {
    title: 'Popular parts',
    links: [
      { label: 'Displays', href: '/shop?cat=display-assembly' },
      { label: 'Batteries', href: '/shop?cat=battery' },
      { label: 'Keyboards & top cases', href: '/shop?cat=top-case' },
      { label: 'Logic boards', href: '/shop?cat=logic-board' },
      { label: 'Chargers', href: '/shop?cat=chargers' },
      { label: 'Trackpads', href: '/shop?cat=trackpad' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track your order', href: '/track' },
      { label: 'My orders', href: '/orders' },
      { label: 'Find your model number', href: '/help/find-your-model' },
      { label: 'Shipping & COD', href: '/help/shipping' },
      { label: 'Returns & warranty', href: '/help/returns' },
      { label: 'Condition grades', href: '/help/grades' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Unibody', href: '/help/about' },
      { label: 'Contact us', href: '/help/contact' },
      { label: 'Privacy policy', href: '/help/privacy' },
      { label: 'Terms of sale', href: '/help/terms' },
    ],
  },
];

export function StoreFooter({ config }: { config: StoreConfigDTO }) {
  return (
    <footer className="mt-auto border-t border-line-subtle bg-bg-2 text-[13px]">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-muted">Tested, graded parts for every Mac, iPhone and iPad since 2012. Delivered across India in 1–3 days.</p>
            <div className="mt-4 flex flex-col gap-2">
              <a href={waLink(config.whatsapp, 'Hi Unibody, I need help.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-success hover:underline">
                <MessageCircle className="size-4" /> WhatsApp us
              </a>
              <a href={`tel:${config.supportPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-muted hover:text-fg">
                <Phone className="size-4" /> {config.supportPhone}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <h2 className="font-semibold text-fg">{c.title}</h2>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-muted transition hover:text-fg">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-line-subtle pt-6 text-xs leading-relaxed text-muted">{config.disclaimer}</p>
        <div className="mt-6 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-subtle">Copyright © {new Date().getFullYear()} Unibody. All rights reserved. Prices include GST.</p>
          <ThemeToggle withAuto />
        </div>
      </div>
    </footer>
  );
}

/** Slim footer for focused flows (checkout, payment). */
export function FocusFooter({ config }: { config: StoreConfigDTO }) {
  return (
    <footer className="mt-auto border-t border-line-subtle bg-bg-2">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-3xl leading-relaxed">{config.disclaimer}</p>
        <ThemeToggle withAuto />
      </div>
    </footer>
  );
}
