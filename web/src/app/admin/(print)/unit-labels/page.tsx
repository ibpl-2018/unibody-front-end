import { one, type SP } from '@/lib/admin/params';
import { UnitLabelsView } from './unit-labels-view';

export const metadata = { title: 'Unit labels' };

/** ?productId= (all in-stock units of a product) or ?codes=U0000001,U0000002 · &format=a4|roll */
export default async function UnitLabelsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const codes = one(sp.codes)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 500);
  return <UnitLabelsView productId={one(sp.productId) || null} codes={codes} format={one(sp.format) === 'roll' ? 'roll' : 'a4'} />;
}
