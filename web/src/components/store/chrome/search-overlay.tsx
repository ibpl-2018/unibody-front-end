'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X, Cpu } from 'lucide-react';
import type { DeviceModelDTO } from '@unibody/shared';
import { api } from '@/lib/api';
import { modelHref, NAV_FAMILIES } from '@/lib/store/catalog';

const QUICK = ['A2337 display', 'MacBook Pro battery', 'A1466 keyboard', 'iPhone 15 screen', 'USB-C charger'];

/** Full-width search sheet: free text or A-number, with live model suggestions. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [models, setModels] = useState<DeviceModelDTO[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setModels([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      api.store
        .findModel(term)
        .then((r) => live && setModels(r.filter((m) => m.familySlug !== 'accessories').slice(0, 5)))
        .catch(() => live && setModels([]));
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  if (!open) return null;
  const go = (term: string) => {
    if (!term.trim()) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative border-b border-line-subtle bg-bg shadow-2xl">
        <div className="mx-auto max-w-[760px] px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go(q);
            }}
            className="flex items-center gap-3 border-b border-line pb-3"
          >
            <Search className="size-5 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search parts or model number — e.g. A2337"
              aria-label="Search parts or model number"
              className="h-10 w-full bg-transparent text-xl font-medium tracking-tight outline-none placeholder:text-subtle sm:text-2xl"
            />
            <button type="button" onClick={onClose} aria-label="Close search" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-2">
              <X className="size-5" />
            </button>
          </form>

          {models.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">Devices</p>
              <ul className="mt-2">
                {models.map((m) => (
                  <li key={m.id}>
                    <Link href={modelHref(m)} onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        <Cpu className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{m.fullName}</span>
                        <span className="block text-xs text-muted">
                          {m.aNumbers.join(' / ')} · {m.productCount ?? 0} parts
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">Popular searches</p>
                <ul className="mt-2">
                  {QUICK.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => go(s)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[15px] hover:bg-surface-2">
                        <ArrowRight className="size-3.5 text-subtle" /> {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">Shop by device</p>
                <ul className="mt-2">
                  {NAV_FAMILIES.map((f) => (
                    <li key={f.slug}>
                      <Link href={`/d/${f.slug}`} onClick={onClose} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] hover:bg-surface-2">
                        <ArrowRight className="size-3.5 text-subtle" /> {f.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">
            Tip: the model number (A1234) is printed on the bottom case of your Mac.{' '}
            <Link href="/help/find-your-model" onClick={onClose} className="text-link hover:underline">
              Where do I find it?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
