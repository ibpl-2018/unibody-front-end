'use client';
import { AdminSession } from '@/lib/admin/session';
import { AdminShell } from '@/components/admin/shell';
import { ConfirmProvider } from '@/components/admin/ui';
import { FullPageLoader } from '@/components/admin/loading';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSession fallback={<FullPageLoader />}>
      <ConfirmProvider>
        <AdminShell>{children}</AdminShell>
      </ConfirmProvider>
    </AdminSession>
  );
}
