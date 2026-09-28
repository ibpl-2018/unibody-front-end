import { one, type SP } from '@/lib/admin/params';
import { BatchInvoicesView } from './batch-view';

export const metadata = { title: 'Print invoices' };

const list = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

/** `?ids=` invoice ids (from Invoices) or `?orders=` order ids (from Orders — orders without an invoice are skipped). */
export default async function BatchInvoicesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <BatchInvoicesView invoiceIds={list(one(sp.ids))} orderIds={list(one(sp.orders))} />;
}
