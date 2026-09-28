'use client';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import type { DeviceModelDTO } from '@unibody/shared';
import { useMyDevice } from '@/lib/store/device';

/** "✓ Your device · Change device" or "Set as my device" on a model page. */
export function MyDevicePill({ model, dark }: { model: DeviceModelDTO; dark?: boolean }) {
  const { device, setDevice } = useMyDevice();
  const mine = device?.id === model.id;
  if (mine) {
    return (
      <p className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 font-medium text-success">
          <Check className="size-3.5" /> Your device
        </span>
        <Link href="/#finder" className={dark ? 'text-accent hover:underline' : 'text-link hover:underline'}>
          Change device
        </Link>
      </p>
    );
  }
  return (
    <button type="button" onClick={() => setDevice(model)} className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1 text-[13px] font-medium text-fg backdrop-blur transition hover:bg-surface">
      <Plus className="size-3.5" /> Save as my device
    </button>
  );
}
