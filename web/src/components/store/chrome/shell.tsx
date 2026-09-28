'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, MessageCircle, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui';
import { useStoreConfig } from '@/lib/store/config';
import { waLink } from '@/lib/store/catalog';
import { StoreHeader } from './header';

/** Routes that use the distraction-free chrome (D05 checkout header). */
const FOCUS = ['/checkout', '/pay'];

export function AnnouncementBar() {
  const config = useStoreConfig();
  const b = config.banner;
  return (
    <div className="bg-hero text-hero-fg">
      <div className="mx-auto flex h-9 max-w-[1200px] items-center justify-center gap-2 px-4 text-center text-xs">
        {b ? (
          <>
            <Sparkles className="size-3.5 shrink-0 text-vivid-yellow" aria-hidden />
            <span className="truncate">
              <span className="font-medium">{b.title.replace(/\.$/, '')}</span>
              <span className="hidden text-hero-muted md:inline"> · {config.announcement.split('·')[0].trim()}</span>
            </span>
            <Link href="/offers" className="shrink-0 font-medium text-accent hover:underline">
              Shop the offer ›
            </Link>
          </>
        ) : (
          <span className="truncate text-hero-muted">{config.announcement}</span>
        )}
      </div>
    </div>
  );
}

function FocusHeader() {
  const config = useStoreConfig();
  return (
    <header className="border-b border-line-subtle bg-bg">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Unibody home">
          <Logo />
        </Link>
        <p className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
          <Lock className="size-3.5" /> Secure checkout · No account needed
        </p>
        <a href={waLink(config.whatsapp, 'Hi Unibody, I need help with checkout.')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">Help: {config.supportPhone}</span>
          <span className="sm:hidden">Help</span>
        </a>
      </div>
    </header>
  );
}

export function StoreShell({ children, footer, focusFooter }: { children: React.ReactNode; footer: React.ReactNode; focusFooter: React.ReactNode }) {
  const pathname = usePathname();
  const focus = FOCUS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      {focus ? (
        <FocusHeader />
      ) : (
        <>
          <AnnouncementBar />
          <StoreHeader />
        </>
      )}
      <main id="main" className="flex-1">
        {children}
      </main>
      {focus ? focusFooter : footer}
    </div>
  );
}
