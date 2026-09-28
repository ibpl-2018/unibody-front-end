'use client';
import type { InvoiceDTO } from '@unibody/shared';
import { EmptyState, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/admin/ui';
import { InvoiceDocument } from '@/components/admin/invoice-document';
import { PrintFrame } from '@/components/admin/print';
import { adminApi, useApi } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';

/** Several GST invoices in one print job, one A4 page each. */
export function BatchInvoicesView({ invoiceIds, orderIds }: { invoiceIds: string[]; orderIds: string[] }) {
  const { can } = useAdmin();
  const fromOrders = orderIds.length > 0;
  const { data, error, refetch } = useApi(
    async (): Promise<{ invoices: InvoiceDTO[]; skipped: number }> => {
      let ids = invoiceIds;
      let skipped = 0;
      if (fromOrders) {
        const orders = await Promise.all(orderIds.map((id) => adminApi.admin.order(id)));
        ids = orders.map((o) => o.invoiceId).filter((x): x is string => !!x);
        skipped = orders.length - ids.length;
      }
      return { invoices: await Promise.all(ids.map((id) => adminApi.admin.invoice(id))), skipped };
    },
    [invoiceIds.join(','), orderIds.join(',')],
    { enabled: can('invoices') },
  );
  const count = data?.invoices.length ?? invoiceIds.length;
  const back = fromOrders ? { href: '/admin/orders', label: 'Orders' } : { href: '/admin/invoices', label: 'Invoices' };

  return (
    <PrintFrame back={back} title={`${count} tax invoice${count === 1 ? '' : 's'}`} pageCss="size: A4; margin: 12mm;">
      {!can('invoices') ? (
        <ErrorState className="mx-auto max-w-xl" message="Your role can’t view invoices. Ask a manager." />
      ) : !invoiceIds.length && !orderIds.length ? (
        <EmptyState title="Nothing selected" body="Select invoices or shipped orders in the list and choose Print invoices." />
      ) : error && !data ? (
        <ErrorState className="mx-auto max-w-xl" message={error} onRetry={refetch} />
      ) : !data ? (
        <Skeleton className="mx-auto h-[1000px] max-w-[820px]" />
      ) : (
        <>
          {data.skipped > 0 && (
            <p className="mx-auto mb-4 max-w-[820px] rounded-xl bg-warning-soft px-4 py-2.5 text-sm text-warning print:hidden" role="status">
              {data.skipped} selected order{data.skipped === 1 ? ' has' : 's have'} no invoice yet — invoices are created when an order ships.
            </p>
          )}
          {data.invoices.length === 0 ? (
            <EmptyState title="No invoices to print" body="None of the selected orders has shipped yet." />
          ) : (
            <div className="space-y-8 print:space-y-0">
              {data.invoices.map((inv) => (
                <InvoiceDocument key={inv.id} inv={inv} className="print:break-after-page" />
              ))}
            </div>
          )}
        </>
      )}
    </PrintFrame>
  );
}
