'use client';
import { formatINR, formatPhone, type AdminOrderDetail } from '@unibody/shared';
import { EmptyState, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/admin/ui';
import { PrintFrame } from '@/components/admin/print';
import { adminApi, useApi } from '@/lib/admin/api';
import { fmtDate } from '@/lib/format';

export function LabelsView({ ids }: { ids: string[] }) {
  const orders = useApi(() => Promise.all(ids.map((id) => adminApi.admin.order(id))), [ids.join(',')]);
  const cfg = useApi(() => adminApi.store.config(), []);
  const back = ids.length === 1 ? { href: `/admin/orders/${ids[0]}`, label: 'Order' } : { href: '/admin/orders', label: 'Orders' };
  return (
    <PrintFrame back={back} title={`${ids.length} shipping label${ids.length === 1 ? '' : 's'} · 4 × 6 in`} pageCss="size: 4in 6in; margin: 0;">
      {!ids.length ? (
        <EmptyState title="No orders selected" body="Select orders in the list and choose Print labels." />
      ) : orders.error && !orders.data ? (
        <ErrorState className="mx-auto max-w-xl" message={orders.error} onRetry={orders.refetch} />
      ) : !orders.data ? (
        <Skeleton className="mx-auto h-[576px] w-[384px]" />
      ) : (
        <div className="flex flex-wrap justify-center gap-6 print:block">
          {orders.data.map((o) => (
            <Label key={o.id} o={o} store={cfg.data?.storeName ?? 'Unibody'} phone={cfg.data?.supportPhone ?? ''} />
          ))}
        </div>
      )}
    </PrintFrame>
  );
}

function Label({ o, store, phone }: { o: AdminOrderDetail; store: string; phone: string }) {
  const cod = o.paymentMethod === 'COD' && o.paymentStatus !== 'COD_COLLECTED';
  const pieces = o.items.reduce((a, i) => a + i.qty, 0);
  return (
    <article className="flex h-[576px] w-[384px] flex-col overflow-hidden border border-neutral-900 bg-white text-[11px] leading-snug text-black shadow-card print:h-[6in] print:w-[4in] print:break-after-page print:border-0 print:shadow-none">
      <div className="flex items-stretch border-b-2 border-black">
        <div className="flex-1 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Courier</p>
          <p className="text-[15px] font-bold">{o.shipment?.courier ?? '—'}</p>
          <p className="mt-0.5 font-mono text-[18px] font-bold tracking-wide">{o.shipment?.awb ?? 'AWB pending'}</p>
        </div>
        <div className={`flex w-[140px] flex-col items-center justify-center px-2 text-center ${cod ? 'bg-black text-white print:[print-color-adjust:exact]' : 'border-l-2 border-black'}`}>
          <p className="text-[13px] font-extrabold tracking-wide">{cod ? 'COD' : 'PREPAID'}</p>
          <p className={`font-mono font-bold ${cod ? 'text-[20px]' : 'text-[12px]'}`}>{cod ? formatINR(o.totals.total) : 'Do not collect'}</p>
          {cod && <p className="text-[9px]">Collect cash</p>}
        </div>
      </div>
      <div className="border-b border-black px-3 py-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Deliver to</p>
        <p className="text-[16px] font-bold">{o.customerName}</p>
        <p className="text-[12px]">{o.address.line1}</p>
        <p className="text-[12px]">{o.address.line2}</p>
        {o.address.landmark && <p className="text-[12px]">Near {o.address.landmark}</p>}
        <p className="mt-1 text-[14px] font-bold">
          {o.address.city}, {o.address.state}
        </p>
        <p className="font-mono text-[26px] font-extrabold leading-tight tracking-[0.12em]">{o.address.pincode}</p>
        <p className="text-[13px] font-semibold">📞 {formatPhone(o.phone)}</p>
      </div>
      <div className="grid grid-cols-3 border-b border-black text-center">
        <div className="border-r border-black py-1.5">
          <p className="text-[9px] uppercase text-neutral-600">Order</p>
          <p className="font-mono text-[11px] font-bold">{o.orderNo}</p>
        </div>
        <div className="border-r border-black py-1.5">
          <p className="text-[9px] uppercase text-neutral-600">Date</p>
          <p className="font-bold">{fmtDate(o.createdAt)}</p>
        </div>
        <div className="py-1.5">
          <p className="text-[9px] uppercase text-neutral-600">Pieces</p>
          <p className="font-bold">{pieces}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Packing list</p>
        <ul className="space-y-1">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-2">
              <span className="font-bold">{i.qty}×</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1">{i.title}</span>
                <span className="font-mono text-[9.5px] text-neutral-600">
                  {i.sku}
                  {i.unitSerials.length > 0 && ` · S/N ${i.unitSerials.join(', ')}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-black px-3 py-2 text-[10px]">
        <p>
          <span className="font-bold">Return to:</span> {store} {phone && `· ${phone}`}
        </p>
        <p className="text-[8.5px] text-neutral-600">Fragile — electronic parts. Do not bend or stack heavy items.</p>
      </div>
    </article>
  );
}
