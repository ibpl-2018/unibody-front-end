'use client';
import { Repeat, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { formatINR } from '@unibody/shared';
import { adminApi, pct, useApi } from '@/lib/admin/api';
import { KpiCard, LineTabs, PageHeader } from './ui';

export type CrmTab = 'leads' | 'customers' | 'b2b';

/**
 * Shared header for Customers & Leads (A09): one set of KPIs across both lists, then
 * Leads · abandoned checkouts | Customers | Repair shops (B2B).
 */
export function CrmHeader({ value, version = 0 }: { value: CrmTab; version?: number }) {
  const customers = useApi(() => adminApi.admin.customers({ page: 1 }), [version]);
  const leads = useApi(() => adminApi.admin.leads({ page: 1 }), [version]);
  const c = customers.data?.summary;
  const l = leads.data?.summary;
  return (
    <>
      <PageHeader title="Customers & Leads" subtitle="Guests are identified by verified phone number — no account needed. Abandoned checkouts become leads automatically." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customers" color="pink" icon={<Users />} loading={!c} value={c?.total.toLocaleString('en-IN')} hint={c && `${pct(c.guestPct, 0)} guest · ${pct(1 - c.guestPct, 0)} registered`} />
        <KpiCard label="Repeat rate" color="purple" icon={<Repeat />} loading={!c} value={c && pct(c.repeatRate, 0)} hint="Ordered more than once" />
        <KpiCard label="Open leads" color="orange" icon={<ShoppingCart />} loading={!l} value={l && `${l.open} · ${formatINR(l.openValue)}`} hint="Abandoned carts to follow up" href="/admin/leads" />
        <KpiCard label="Lead conversion" color="green" icon={<TrendingUp />} loading={!l} value={l && pct(l.conversion, 0)} hint="Leads that went on to order" />
      </div>
      <LineTabs
        value={value}
        onChange={() => {}}
        tabs={[
          {
            value: 'leads',
            label: (
              <>
                Leads · abandoned checkouts{l?.open ? <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] text-on-accent">{l.open}</span> : null}
              </>
            ),
            href: '/admin/leads',
          },
          { value: 'customers', label: 'Customers', href: '/admin/customers' },
          { value: 'b2b', label: 'Repair shops (B2B)', href: '/admin/customers?type=b2b' },
        ]}
      />
    </>
  );
}
