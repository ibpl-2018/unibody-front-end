'use client';
import { Lock } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui';

export function NoAccess({ what = 'this section' }: { what?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line-subtle bg-surface">
      <EmptyState icon={<Lock className="size-6" />} title="You don’t have access" body={`Your role can’t open ${what}. Ask the store owner if you need it.`} action={<ButtonLink href="/admin/orders" variant="outline" size="sm">Go to orders</ButtonLink>} />
    </div>
  );
}
