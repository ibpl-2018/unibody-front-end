'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/admin/ui';
import { InvoiceDocument } from '@/components/admin/invoice-document';
import { PrintFrame } from '@/components/admin/print';
import { adminApi, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const { data: inv, error, refetch } = useApi(() => adminApi.admin.invoice(id), [id], { enabled: can('invoices') });
  useEffect(() => {
    if (inv) document.title = `${inv.invoiceNo} · Tax invoice`;
  }, [inv]);

  return (
    <PrintFrame back={{ href: '/admin/invoices', label: 'Invoices' }} title={inv ? `Tax invoice ${inv.invoiceNo}` : 'Tax invoice'} pageCss="size: A4; margin: 12mm;">
      {!can('invoices') ? (
        <ErrorState className="mx-auto max-w-xl" message="Your role can’t view invoices. Ask a manager." />
      ) : error && !inv ? (
        <ErrorState className="mx-auto max-w-xl" message={error} onRetry={refetch} />
      ) : !inv ? (
        <Skeleton className="mx-auto h-[1000px] max-w-[820px]" />
      ) : (
        <InvoiceDocument inv={inv} />
      )}
    </PrintFrame>
  );
}
