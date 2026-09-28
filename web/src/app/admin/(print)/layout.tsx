'use client';
import { AdminSession } from '@/lib/admin/session';
import { FullPageLoader } from '@/components/admin/loading';

/** Print views (tax invoice, shipping label): authenticated, but without the admin chrome. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <AdminSession fallback={<FullPageLoader label="Preparing document…" />}>{children}</AdminSession>;
}
