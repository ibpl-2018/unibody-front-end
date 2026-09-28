'use client';
import Link from 'next/link';
import type { StockUnitDTO } from '@unibody/shared';
import { EmptyState, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/admin/ui';
import { Barcode } from '@/components/admin/barcode';
import { PrintFrame } from '@/components/admin/print';
import { adminApi, useApi } from '@/lib/admin/api';
import { cn } from '@/lib/cn';

/** Barcode stickers for units: A4 sheet (3 × 8) or a 50 × 25 mm label-printer roll, one unit per sticker. */
export function UnitLabelsView({ productId, codes, format }: { productId: string | null; codes: string[]; format: 'a4' | 'roll' }) {
  const { data, error, refetch } = useApi(async () => {
    const out: StockUnitDTO[] = [];
    if (productId) {
      for (let page = 1; page < 40; page++) {
        const r = await adminApi.admin.units({ productId, status: 'IN_STOCK', page });
        out.push(...r.items);
        if (out.length >= r.total || !r.items.length) break;
      }
    }
    for (const c of codes) {
      const r = await adminApi.admin.units({ q: c });
      const u = r.items.find((x) => x.serial === c);
      if (u) out.push(u);
    }
    return out;
  }, [productId, codes.join(',')]);
  const roll = format === 'roll';
  const qs = (f: string) => `?${productId ? `productId=${productId}&` : ''}${codes.length ? `codes=${codes.join(',')}&` : ''}format=${f}`;

  return (
    <PrintFrame back={{ href: '/admin/inventory?tab=units', label: 'Inventory' }} title={`${data?.length ?? ''} unit label${data?.length === 1 ? '' : 's'} · ${roll ? '50 × 25 mm roll' : 'A4 sheet'}`} pageCss={roll ? 'size: 50mm 25mm; margin: 0;' : 'size: A4; margin: 10mm 7mm;'}>
      <p className="no-print mx-auto mb-4 max-w-[800px] text-center text-sm text-muted">
        Stick one label on each piece. Staff scan it when packing and during stock counts.{' '}
        <Link className="font-medium text-link" href={qs(roll ? 'a4' : 'roll')}>
          Switch to {roll ? 'A4 sheet' : '50 × 25 mm roll'}
        </Link>
      </p>
      {error && !data ? (
        <ErrorState className="mx-auto max-w-xl" message={error} onRetry={refetch} />
      ) : !data ? (
        <Skeleton className="mx-auto h-96 max-w-[800px]" />
      ) : !data.length ? (
        <EmptyState title="No units to print" body="Pick a product with stock, or pass unit codes." />
      ) : (
        <div className={cn(roll ? 'mx-auto flex w-fit flex-col gap-3 print:block' : 'mx-auto grid max-w-[800px] grid-cols-3 gap-2 bg-white p-3 print:max-w-none print:gap-0 print:p-0')}>
          {data.map((u) => (
            <div
              key={u.id}
              className={cn(
                'flex flex-col items-center justify-center overflow-hidden bg-white px-2 text-center text-black',
                roll ? 'h-[25mm] w-[50mm] border border-neutral-300 print:break-after-page print:border-0' : 'h-[34mm] border border-dashed border-neutral-300 print:border-transparent',
              )}
              data-testid="unit-label"
            >
              <p className="line-clamp-1 w-full text-[8px] font-medium leading-tight">{u.productTitle}</p>
              <Barcode value={u.serial} height={roll ? 30 : 38} width={roll ? 1.3 : 1.5} className="my-0.5 max-w-full" />
              <p className="font-mono text-[10px] font-bold tracking-wider">{u.serial}</p>
            </div>
          ))}
        </div>
      )}
    </PrintFrame>
  );
}
