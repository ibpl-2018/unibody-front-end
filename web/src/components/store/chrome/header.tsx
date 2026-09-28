'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, X, Smartphone, Package, MessageCircle } from 'lucide-react';
import { Logo, ThemeToggle, IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCart } from '@/lib/store/cart';
import { useMyDevice } from '@/lib/store/device';
import { useStoreConfig } from '@/lib/store/config';
import { NAV_FAMILIES, modelHref, waLink } from '@/lib/store/catalog';
import { SearchOverlay } from './search-overlay';
import { AddedPopover } from './added-popover';

export function StoreHeader() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const { device } = useMyDevice();
  const config = useStoreConfig();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  // Close menus on navigation
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menu]);

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-line-subtle">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          <Link href="/" aria-label="Unibody home" className="shrink-0 rounded-lg">
            <Logo />
          </Link>

          <nav aria-label="Shop by device" className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV_FAMILIES.map((f) => (
              <Link
                key={f.slug}
                href={`/d/${f.slug}`}
                className={cn('rounded-full px-3 py-1.5 text-[13px] transition hover:text-fg', active(`/d/${f.slug}`) ? 'font-semibold text-fg' : 'text-muted')}
              >
                {f.label}
              </Link>
            ))}
            <Link href="/offers" className={cn('rounded-full px-3 py-1.5 text-[13px] font-medium text-danger transition hover:opacity-80', active('/offers') && 'font-semibold')}>
              Offers
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
            <Link href="/track" className="mr-1 hidden rounded-full px-3 py-1.5 text-[13px] text-muted transition hover:text-fg md:inline-flex">
              Track order
            </Link>
            <IconButton label="Search parts" onClick={() => setSearch(true)}>
              <Search className="size-[18px]" />
            </IconButton>
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="relative">
              <Link href="/bag" aria-label={`Bag, ${count} item${count === 1 ? '' : 's'}`} className="relative inline-flex size-9 items-center justify-center rounded-full text-fg transition hover:bg-surface-2">
                <ShoppingBag className="size-[18px]" />
                {ready && count > 0 && (
                  <span className="absolute -right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent">{count}</span>
                )}
              </Link>
              <AddedPopover />
            </div>
            <IconButton label={menu ? 'Close menu' : 'Open menu'} className="lg:hidden" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-menu">
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </IconButton>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <div
          id="mobile-menu"
          className={cn('overflow-hidden border-line-subtle bg-bg transition-[max-height,opacity] duration-300 lg:hidden', menu ? 'max-h-[calc(100dvh-56px)] border-t opacity-100' : 'pointer-events-none max-h-0 opacity-0')}
          aria-hidden={!menu}
        >
          <div className="h-[calc(100dvh-56px)] overflow-y-auto px-6 pb-10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Shop by device</p>
            <ul className="mt-2">
              {NAV_FAMILIES.map((f) => (
                <li key={f.slug}>
                  <Link href={`/d/${f.slug}`} tabIndex={menu ? 0 : -1} className="block py-2.5 text-[26px] font-semibold tracking-tight">
                    {f.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/offers" tabIndex={menu ? 0 : -1} className="block py-2.5 text-[26px] font-semibold tracking-tight text-danger">
                  Offers
                </Link>
              </li>
            </ul>
            <div className="mt-6 grid gap-1 border-t border-line-subtle pt-4 text-[15px]">
              {device && (
                <Link href={modelHref(device)} tabIndex={menu ? 0 : -1} className="flex items-center gap-3 py-2">
                  <Smartphone className="size-[18px] text-muted" /> Parts for my {device.short}
                </Link>
              )}
              <Link href="/track" tabIndex={menu ? 0 : -1} className="flex items-center gap-3 py-2">
                <Package className="size-[18px] text-muted" /> Track order
              </Link>
              <Link href="/orders" tabIndex={menu ? 0 : -1} className="flex items-center gap-3 py-2">
                <ShoppingBag className="size-[18px] text-muted" /> My orders
              </Link>
              <a href={waLink(config.whatsapp, 'Hi Unibody, I need help finding a part.')} target="_blank" rel="noreferrer" tabIndex={menu ? 0 : -1} className="flex items-center gap-3 py-2">
                <MessageCircle className="size-[18px] text-muted" /> WhatsApp help
              </a>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-line-subtle pt-4">
              <span className="text-sm text-muted">Appearance</span>
              <ThemeToggle withAuto />
            </div>
          </div>
        </div>
      </header>
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  );
}
