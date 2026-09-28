'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  ChevronDown,
  Clock,
  FileText,
  LayoutGrid,
  LineChart,
  LogOut,
  Laptop,
  Menu,
  Package,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Warehouse,
  X,
  ClipboardList,
} from 'lucide-react';
import { formatINR, type AdminOrderListItem, type AdminProductListItem } from '@unibody/shared';
import { Logo, StatusBadge, ThemeToggle } from '@/components/ui';
import { cn } from '@/lib/cn';
import { adminApi, useDebounced, type Perm } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';
import { fmtDateTime } from '@/lib/format';
import { Dropdown, MenuItem, Thumb } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: Perm;
  badge?: 'ordersToAct' | 'openLeads' | 'lowStock';
  match?: string[];
}
const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: LayoutGrid, perm: 'dashboard' }] },
  {
    section: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: 'ordersToAct' },
      { href: '/admin/invoices', label: 'Invoices', icon: FileText, perm: 'invoices' },
      { href: '/admin/customers', label: 'Customers & Leads', icon: Users, perm: 'customers', badge: 'openLeads', match: ['/admin/customers', '/admin/leads'] },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/catalog', label: 'Devices & Categories', icon: Laptop },
    ],
  },
  {
    section: 'Stock',
    items: [
      { href: '/admin/inventory', label: 'Inventory', icon: Warehouse, badge: 'lowStock' },
      { href: '/admin/purchases', label: 'Purchases', icon: ClipboardList, perm: 'purchases' },
      { href: '/admin/suppliers', label: 'Suppliers', icon: Truck, perm: 'suppliers' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/admin/offers', label: 'Offers & Coupons', icon: Tag, perm: 'coupons' },
      { href: '/admin/reports', label: 'Reports', icon: LineChart, perm: 'reports' },
    ],
  },
  { section: 'System', items: [{ href: '/admin/settings', label: 'Settings', icon: Settings2 }] },
];

function isActive(pathname: string, item: NavItem) {
  const m = item.match ?? [item.href];
  return m.some((h) => (h === '/admin' ? pathname === '/admin' : pathname === h || pathname.startsWith(h + '/')));
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, can, counts, logout } = useAdmin();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href={can('dashboard') ? '/admin' : '/admin/orders'} onClick={onNavigate}>
          <Logo admin />
        </Link>
      </div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {NAV.map((sec) => {
          const items = sec.items.filter((i) => !i.perm || can(i.perm));
          if (!items.length) return null;
          return (
            <div key={sec.section} className="mt-3 first:mt-0">
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">{sec.section}</p>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = isActive(pathname, it);
                  const n = it.badge ? counts[it.badge] : 0;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition',
                          active ? 'bg-accent-soft font-semibold text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                        )}
                      >
                        <it.icon className={cn('size-[17px] shrink-0', active ? 'text-accent' : '')} />
                        <span className="flex-1 truncate">{it.label}</span>
                        {n > 0 && (
                          <span
                            className={cn(
                              'min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums',
                              it.badge === 'lowStock' ? 'bg-warning-soft text-warning' : 'bg-accent text-on-accent',
                            )}
                          >
                            {n > 99 ? '99+' : n}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-line-subtle bg-surface p-2.5 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-semibold text-bg">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">
              {user.name} <span className="font-normal text-subtle">· {user.role.charAt(0) + user.role.slice(1).toLowerCase()}</span>
            </p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ global search
const PAGES = NAV.flatMap((s) => s.items);
function GlobalSearch() {
  const router = useRouter();
  const { can } = useAdmin();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const dq = useDebounced(q.trim(), 220);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => {
    const on = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);

  useEffect(() => {
    if (dq.length < 2) {
      setOrders([]);
      setProducts([]);
      return;
    }
    let live = true;
    setLoading(true);
    Promise.all([adminApi.admin.orders({ q: dq, pageSize: 5 }).catch(() => null), adminApi.admin.products({ q: dq, pageSize: 5 }).catch(() => null)]).then(([o, p]) => {
      if (!live) return;
      setOrders(o?.items ?? []);
      setProducts(p?.items ?? []);
      setLoading(false);
      setIdx(0);
    });
    return () => {
      live = false;
    };
  }, [dq]);

  const pages = useMemo(() => (q.trim() ? PAGES.filter((p) => (!p.perm || can(p.perm)) && p.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 3) : []), [q, can]);
  const results = useMemo(
    () => [
      ...pages.map((p) => ({ key: 'p' + p.href, href: p.href })),
      ...orders.map((o) => ({ key: 'o' + o.id, href: `/admin/orders/${o.id}` })),
      ...products.map((p) => ({ key: 'x' + p.id, href: `/admin/products/${p.id}` })),
    ],
    [pages, orders, products],
  );

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    router.push(href);
  };
  const submit = () => {
    if (results[idx]) return go(results[idx].href);
    if (q.trim()) go(`/admin/orders?q=${encodeURIComponent(q.trim())}`);
  };

  let i = -1;
  const row = (key: string, href: string, children: React.ReactNode) => {
    i++;
    const my = i;
    return (
      <button
        key={key}
        type="button"
        onMouseEnter={() => setIdx(my)}
        onClick={() => go(href)}
        className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm', idx === my ? 'bg-surface-2' : '')}
      >
        {children}
      </button>
    );
  };

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-[420px]">
      <label className="flex h-10 items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm text-muted transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="size-4 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIdx((x) => Math.min(results.length - 1, x + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIdx((x) => Math.max(0, x - 1));
            } else if (e.key === 'Enter') submit();
            else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search orders, SKUs, phone numbers…"
          aria-label="Search orders, SKUs, phone numbers"
          className="h-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-subtle"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 py-px font-sans text-[10px] font-medium text-subtle sm:inline">⌘K</kbd>
      </label>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-line-subtle bg-surface p-2 shadow-2xl sm:right-auto sm:w-[520px]">
          {pages.length > 0 && (
            <>
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Pages</p>
              {pages.map((p) =>
                row('p' + p.href, p.href, (
                  <>
                    <p.icon className="size-4 text-muted" />
                    <span className="font-medium">{p.label}</span>
                  </>
                )),
              )}
            </>
          )}
          {orders.length > 0 && (
            <>
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Orders</p>
              {orders.map((o) =>
                row('o' + o.id, `/admin/orders/${o.id}`, (
                  <>
                    <Receipt className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{o.orderNo}</span> <span className="text-muted">· {o.customerName} · {o.city}</span>
                    </span>
                    <span className="tabular-nums text-muted">{formatINR(o.total)}</span>
                    <StatusBadge status={o.status} admin />
                  </>
                )),
              )}
            </>
          )}
          {products.length > 0 && (
            <>
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">Products</p>
              {products.map((p) =>
                row('x' + p.id, `/admin/products/${p.id}`, (
                  <>
                    <Thumb src={p.image} icon={p.icon} alt="" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.title}</span>
                      <span className="block truncate text-xs text-muted">{p.sku}</span>
                    </span>
                    <span className="tabular-nums text-muted">{formatINR(p.price)}</span>
                  </>
                )),
              )}
            </>
          )}
          {!loading && results.length === 0 && dq === q.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted">
              No matches for “{q.trim()}”. Press <kbd className="rounded border border-line px-1 text-xs">Enter</kbd> to search all orders.
            </p>
          )}
          {loading && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ top bar
function RangeSelect() {
  const { days, setDays } = useAdmin();
  return (
    <label className="relative hidden h-10 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-8 text-[13px] font-medium md:inline-flex">
      <Clock className="size-4 text-muted" />
      Last {days} days
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-subtle" />
      <select aria-label="Date range" value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)} className="absolute inset-0 cursor-pointer opacity-0">
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
      </select>
    </label>
  );
}

function LiveDot() {
  const { live } = useAdmin();
  const label = live === 'live' ? 'Live' : live === 'connecting' ? 'Connecting' : 'Offline';
  return (
    <span
      title={live === 'live' ? 'Receiving live order updates' : live === 'connecting' ? 'Connecting to live updates…' : 'Live updates disconnected — retrying'}
      className={cn(
        'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex',
        live === 'live' ? 'bg-success-soft text-success' : live === 'connecting' ? 'bg-surface-2 text-muted' : 'bg-danger-soft text-danger',
      )}
    >
      <span className={cn('size-1.5 rounded-full bg-current', live === 'live' && 'animate-pulse')} />
      {label}
    </span>
  );
}

function Bellmenu() {
  const { notifications, markAllRead } = useAdmin();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Dropdown
      label="Notifications"
      trigger={
        <span className="relative inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-fg transition hover:bg-surface-2">
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unread}</span>}
        </span>
      }
    >
      {(close) => (
        <div className="w-[300px] sm:w-[340px]">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-link">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 pb-5 pt-3 text-center text-sm text-muted">You’re all caught up. New orders and status changes appear here live.</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/admin/orders/${n.orderNo}`}
                    onClick={() => {
                      markAllRead();
                      close();
                    }}
                    className="flex gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">{n.title}</span>
                      <span className="block truncate text-xs text-muted">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-subtle">{fmtDateTime(n.at).split(', ').pop()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  );
}

function NewMenu() {
  const { can } = useAdmin();
  const items = [
    can('productEdit') && { href: '/admin/products/new', label: 'Product', icon: <Package /> },
    can('purchases') && { href: '/admin/purchases/new', label: 'Purchase', icon: <ClipboardList /> },
    can('coupons') && { href: '/admin/offers?new=1', label: 'Coupon / offer', icon: <Tag /> },
    can('stockEdit') && { href: '/admin/inventory?adjust=1', label: 'Stock adjustment', icon: <Boxes /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  if (!items.length) return null;
  return (
    <Dropdown
      label="Create new"
      trigger={
        <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New</span>
        </span>
      }
    >
      {(close) =>
        items.map((it) => (
          <MenuItem key={it.href} href={it.href} icon={it.icon} onClick={close}>
            {it.label}
          </MenuItem>
        ))
      }
    </Dropdown>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);
  const showRange = pathname === '/admin';
  return (
    <div className="min-h-dvh bg-bg">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line-subtle bg-bg-2 lg:block">
        <Sidebar />
      </aside>
      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] max-w-[85vw] border-r border-line-subtle bg-bg-2 shadow-2xl">
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-4 rounded-full p-1.5 text-muted hover:bg-surface-2">
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-[248px]">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line-subtle px-4 sm:gap-3 sm:px-6 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="-ml-1 rounded-lg p-2 text-fg hover:bg-surface-2 lg:hidden">
            <Menu className="size-5" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LiveDot />
            {showRange && <RangeSelect />}
            <ThemeToggle className="hidden size-10 rounded-xl border border-line bg-surface sm:inline-flex" />
            <Bellmenu />
            <NewMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

