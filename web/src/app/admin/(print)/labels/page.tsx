import { one, type SP } from '@/lib/admin/params';
import { LabelsView } from './labels-view';

export const metadata = { title: 'Shipping labels' };

export default async function LabelsPage({ searchParams }: { searchParams: SP }) {
  const ids = one((await searchParams).ids)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  return <LabelsView ids={ids} />;
}
