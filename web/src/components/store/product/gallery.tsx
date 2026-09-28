'use client';
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { ProductImage } from '@/components/ui';
import { cn } from '@/lib/cn';

export function Gallery({ images, title, tint, badge }: { images: string[]; title: string; tint: string; badge?: string }) {
  const list = images.length ? images : [''];
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="relative">
        <ProductImage src={list[i] || null} alt={title} tint={tint} className="aspect-square w-full sm:aspect-[5/4]" rounded="rounded-[28px]" imgClassName="p-[9%]" />
        {badge && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1 text-xs font-medium backdrop-blur">
            <Camera className="size-3.5" /> {badge}
          </span>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-3" role="tablist" aria-label="Product images">
          {list.map((src, idx) => (
            <button
              key={src + idx}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={`Image ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn('rounded-2xl transition', idx === i ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : 'opacity-80 hover:opacity-100')}
            >
              <ProductImage src={src} alt="" tint={tint} className="size-16 sm:size-20" rounded="rounded-2xl" imgClassName="p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
