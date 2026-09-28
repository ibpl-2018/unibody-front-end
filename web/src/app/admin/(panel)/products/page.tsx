import { one, type SP } from '@/lib/admin/params';
import { ProductsView } from './products-view';

export const metadata = { title: 'Products' };

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const initial = { q: one(sp.q), family: one(sp.family), category: one(sp.category), condition: one(sp.condition), status: one(sp.status), stock: one(sp.stock), page: Number(one(sp.page)) || 1 };
  return <ProductsView key={JSON.stringify(initial)} initial={initial} />;
}
