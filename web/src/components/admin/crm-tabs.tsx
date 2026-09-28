'use client';
import { LineTabs } from './ui';

export function CrmTabs({ value, openLeads }: { value: 'customers' | 'leads'; openLeads?: number }) {
  return (
    <LineTabs
      value={value}
      onChange={() => {}}
      tabs={[
        { value: 'customers', label: 'Customers', href: '/admin/customers' },
        { value: 'leads', label: <>Leads{openLeads ? <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] text-on-accent">{openLeads}</span> : null}</>, href: '/admin/leads' },
      ]}
    />
  );
}
