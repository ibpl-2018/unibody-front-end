'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, HelpCircle, Sparkles, X } from 'lucide-react';
import type { CategoryDTO, DeviceFamilyDTO } from '@unibody/shared';
import { buttonClass, Field, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { categoryShort, familyLook, modelHref } from '@/lib/store/catalog';
import { useMyDevice } from '@/lib/store/device';

/** Device → model → part, three taps. Remembers the chosen model as "My device". */
export function PartFinder({ families, categories }: { families: DeviceFamilyDTO[]; categories: CategoryDTO[] }) {
  const { device, setDevice } = useMyDevice();
  const fams = families.filter((f) => (f.models?.length ?? 0) > 0);
  const [familyId, setFamilyId] = useState<string>(fams[0]?.id ?? '');
  const [modelId, setModelId] = useState<string>('');
  const [cat, setCat] = useState<string>('');
  const [count, setCount] = useState<number | null>(null);

  // Adopt the remembered device once it has loaded from storage
  useEffect(() => {
    if (!device) return;
    const f = fams.find((x) => x.models?.some((m) => m.id === device.id));
    if (f) {
      setFamilyId(f.id);
      setModelId(device.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id]);

  const family = fams.find((f) => f.id === familyId);
  const models = useMemo(() => family?.models ?? [], [family]);
  const model = models.find((m) => m.id === modelId) ?? null;
  const cats = categories.filter((c) => (c.productCount ?? 0) > 0);

  useEffect(() => {
    if (!model) {
      setCount(null);
      return;
    }
    let live = true;
    api.store
      .products({ model: model.id, category: cat || undefined, pageSize: 1 })
      .then((r) => live && setCount(r.total))
      .catch(() => live && setCount(null));
    return () => {
      live = false;
    };
  }, [model, cat]);

  const pickFamily = (id: string) => {
    setFamilyId(id);
    setModelId('');
    setCat('');
  };
  const pickModel = (id: string) => {
    setModelId(id);
    const m = models.find((x) => x.id === id);
    if (m) setDevice(m);
  };

  const href = model ? `${modelHref(model)}${cat ? `?cat=${cat}` : ''}` : family ? `/d/${family.slug}` : '/shop';

  return (
    <section id="finder" className="scroll-mt-20 pb-4" aria-labelledby="finder-title">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="gradient-aurora rounded-[26px] p-[1.5px] shadow-card">
          <div className="rounded-[25px] bg-surface p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="size-3.5" /> Part Finder
                </p>
                <h2 id="finder-title" className="mt-3 text-[22px] font-semibold tracking-tight sm:text-[28px]">
                  Find parts that fit your device.
                </h2>
                <p className="mt-1 text-sm text-muted">Three taps. We only show parts that fit — no guesswork, no returns.</p>
              </div>
              <Link href="/help/find-your-model" className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:underline">
                <HelpCircle className="size-4" /> Where’s my model number?
              </Link>
            </div>

            {device && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-soft py-1 pl-3 pr-1 text-[13px] text-success">
                <span>
                  My device: <strong className="font-semibold">{device.short}</strong> · {device.aNumbers[0]}
                </span>
                <button
                  type="button"
                  aria-label="Forget my device"
                  onClick={() => {
                    setDevice(null);
                    setModelId('');
                  }}
                  className="inline-flex size-6 items-center justify-center rounded-full hover:bg-success/15"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <div role="radiogroup" aria-label="Device" className="no-scrollbar -mx-5 mt-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
              {fams.slice(0, 6).map((f) => {
                const look = familyLook(f.slug);
                const on = f.id === familyId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickFamily(f.id)}
                    className={cn(
                      'flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2 pb-2.5 text-xs font-medium transition sm:w-auto',
                      on ? 'border-accent bg-accent-soft/60 ring-2 ring-accent/30' : 'border-line-subtle hover:border-line',
                    )}
                  >
                    <span className={cn('flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl', look.tint)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={look.render} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
                    </span>
                    {f.name.replace(' (12")', '')}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.3fr_1fr_auto] md:items-end">
              <Field label="1  Device" htmlFor="pf-family">
                <Select id="pf-family" value={familyId} onChange={(e) => pickFamily(e.target.value)}>
                  {fams.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="2  Model" htmlFor="pf-model">
                <Select id="pf-model" value={modelId} onChange={(e) => pickModel(e.target.value)}>
                  <option value="">Choose your model…</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.yearLabel} · {m.aNumbers.join('/')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="3  Part" htmlFor="pf-part">
                <Select id="pf-part" value={cat} onChange={(e) => setCat(e.target.value)} disabled={!model}>
                  <option value="">All parts</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {categoryShort(c)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Link href={href} className={buttonClass('primary', 'md', 'h-11 w-full md:w-auto')}>
                {model ? (count === null ? 'Show parts' : count === 0 ? 'No parts yet — browse' : `Show ${count} part${count === 1 ? '' : 's'}`) : 'Browse parts'}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
