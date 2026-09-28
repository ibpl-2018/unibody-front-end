import { one, type SP } from '@/lib/admin/params';
import { InventoryView } from './inventory-view';

export const metadata = { title: 'Inventory' };

export default async function InventoryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const initial = { q: one(sp.q), state: one(sp.state), tab: one(sp.tab), adjust: one(sp.adjust) === '1' };
  return <InventoryView key={JSON.stringify(initial)} initial={initial} />;
}
