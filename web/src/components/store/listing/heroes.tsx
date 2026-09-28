import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CONDITION_SHORT, formatINR, type DeviceFamilyDTO, type DeviceModelDTO, type ProductListDTO, type StoreConfigDTO } from '@unibody/shared';
import { cn } from '@/lib/cn';
import { familyLook, modelHref, modelShort } from '@/lib/store/catalog';
import { MyDevicePill } from './device-pill';

function Stat({ value, label, dark }: { value: string; label: string; dark?: boolean }) {
  return (
    <div>
      <p className="text-[22px] font-bold tracking-tight sm:text-[26px]">{value}</p>
      <p className={cn('text-xs', dark ? 'text-hero-muted' : 'text-muted')}>{label}</p>
    </div>
  );
}

/** Model page hero (D02): tinted stage, device render, key stats. */
export function ModelHero({ model, list, config }: { model: DeviceModelDTO; list: ProductListDTO; config: StoreConfigDTO }) {
  const look = familyLook(model.familySlug);
  const dark = !!look.dark;
  const topGrade = [...list.facets.conditions].sort((a, b) => b.count - a.count)[0];
  const fastest = [...config.cities].sort((a, b) => a.etaDays - b.etaDays)[0];
  const total = list.facets.categories.reduce((a, c) => a + c.count, 0);
  return (
    <section className={cn('relative overflow-hidden rounded-[26px] p-6 sm:p-10', look.tint, dark && 'text-hero-fg')}>
      <div className="relative z-10 max-w-[560px]">
        <MyDevicePill model={model} dark={dark} />
        <h1 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">{modelShort(model)}</h1>
        <p className={cn('mt-2 text-[15px]', dark ? 'text-hero-muted' : 'text-muted')}>
          {model.yearLabel} · {model.aNumbers.join(' / ')}
          {model.emc ? ` · EMC ${model.emc}` : ''}
          {model.chip ? ` · ${model.chip}` : ''}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <Stat value={String(total)} label="parts listed" dark={dark} />
          {topGrade && <Stat value={CONDITION_SHORT[topGrade.value]} label="most popular" dark={dark} />}
          <Stat value={fastest ? `${fastest.etaDays}–${fastest.etaDays + 1} days` : '1–3 days'} label={fastest ? `to ${fastest.city}` : 'delivery'} dark={dark} />
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={look.render}
        alt=""
        className="pointer-events-none mx-auto mt-6 w-[80%] max-w-[380px] object-contain drop-shadow-[0_30px_30px_rgba(0,0,0,0.25)] md:absolute md:bottom-6 md:right-8 md:top-6 md:mt-0 md:h-[calc(100%-48px)] md:w-auto md:max-w-[46%]"
      />
    </section>
  );
}

/** Family page hero + model chooser. */
export function FamilyHero({ family }: { family: DeviceFamilyDTO }) {
  const look = familyLook(family.slug);
  const dark = !!look.dark;
  const models = (family.models ?? []).filter((m) => (m.productCount ?? 0) > 0);
  return (
    <>
      <section className={cn('relative overflow-hidden rounded-[26px] p-6 sm:p-10', look.tint, dark && 'text-hero-fg')}>
        <div className="relative z-10 max-w-[520px]">
          <p className={cn('text-[13px] font-semibold', dark ? 'text-vivid-orange' : 'text-warning')}>{family.fromPrice ? `Parts from ${formatINR(family.fromPrice)}` : 'Parts & repairs'}</p>
          <h1 className="mt-1 text-[38px] font-bold leading-[1.05] tracking-tight sm:text-[54px]">{family.name}</h1>
          <p className={cn('mt-2 text-[15px]', dark ? 'text-hero-muted' : 'text-muted')}>
            {look.blurb ? `${look.blurb} · ` : ''}
            {family.productCount} parts across {family.modelCount} models
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={look.render}
          alt=""
          className="pointer-events-none mx-auto mt-4 w-[75%] max-w-[340px] object-contain drop-shadow-[0_30px_30px_rgba(0,0,0,0.25)] md:absolute md:bottom-4 md:right-10 md:top-4 md:mt-0 md:h-[calc(100%-32px)] md:w-auto md:max-w-[42%]"
        />
      </section>
      {models.length > 0 && (
        <section className="mt-10" aria-labelledby="pick-model">
          <h2 id="pick-model" className="text-[22px] font-semibold tracking-tight">
            Choose your model
          </h2>
          <p className="mt-1 text-sm text-muted">
            Check the A-number on the bottom case.{' '}
            <Link href="/help/find-your-model" className="text-link hover:underline">
              How to find it
            </Link>
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <li key={m.id}>
                <Link href={modelHref(m)} className="group flex items-center gap-3 rounded-2xl border border-line-subtle bg-surface p-4 transition hover:border-line hover:shadow-card">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{modelShort(m)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {m.yearLabel} · {m.aNumbers.join(' / ')}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{m.productCount} parts</span>
                  <ChevronRight className="size-4 shrink-0 text-subtle transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
