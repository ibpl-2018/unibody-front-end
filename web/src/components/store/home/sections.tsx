import Link from 'next/link';
import { Banknote, BadgeCheck, ShieldCheck, Truck } from 'lucide-react';
import { CONDITION_DESCRIPTION, CONDITION_LABEL, type BannerDTO, type Condition, type DeviceModelDTO } from '@unibody/shared';
import { fmtDateShort } from '@/lib/format';
import { btn } from '../btn';
import { cn } from '@/lib/cn';
import { familyLook, modelHref, modelShort, render } from '@/lib/store/catalog';
import { Container, SectionHead } from '../section';

const fmtBanner = (endsAt: string | null) => (endsAt ? `Till ${fmtDateShort(endsAt)}` : 'Limited time');

/** Sunrise gradient festive offer banner (config.banner). */
export function OfferBanner({ banner }: { banner: BannerDTO }) {
  return (
    <section className="py-6 sm:py-10" aria-label="Current offer">
      <Container>
        <div className="gradient-sunrise relative grid overflow-hidden rounded-[26px] text-white md:grid-cols-[1.1fr_1fr]">
          <div className="relative z-10 p-7 sm:p-10">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">Festive Repair Days · {fmtBanner(banner.endsAt)}</p>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.05] tracking-tight sm:text-[42px]">{banner.title}</h2>
            <p className="mt-3 max-w-md text-[15px] text-white/85">{banner.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/offers" className={btn('plain', 'md', 'bg-white text-black hover:bg-white/90')}>
                Shop the offer
              </Link>
              <span className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold tracking-wide">Code {banner.code}</span>
            </div>
          </div>
          <div className="relative -mt-4 flex items-end justify-center gap-2 px-6 pb-4 md:mt-0 md:pb-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render('battery')} alt="" loading="lazy" className="w-[55%] max-w-[300px] -rotate-6 drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render('keycaps')} alt="" loading="lazy" className="w-[45%] max-w-[240px] rotate-3 drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      </Container>
    </section>
  );
}

const WHY = [
  { icon: Banknote, tone: 'bg-vivid-green', title: 'Pay on delivery', body: 'Cash or UPI at your door in 6 cities. Small ₹49 fee applies.' },
  { icon: BadgeCheck, tone: 'bg-vivid-blue', title: 'Tested & graded', body: 'Every part is bench-tested and graded before it ships.' },
  { icon: ShieldCheck, tone: 'bg-vivid-purple', title: 'Up to 180-day warranty', body: '7-day easy returns if it doesn’t fit, no questions asked.' },
  { icon: Truck, tone: 'bg-vivid-orange', title: 'Delivered in 1–3 days', body: 'Packed same day. Live tracking on the web and WhatsApp.' },
];

/** Dark trust band. */
export function WhyBand() {
  return (
    <section className="bg-hero py-14 text-hero-fg sm:py-20" aria-labelledby="why-title">
      <Container>
        <h2 id="why-title" className="max-w-xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Why Mac owners and repair shops choose Unibody.
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {WHY.map((w) => (
            <li key={w.title} className="rounded-[var(--radius-card)] bg-hero-surface p-5">
              <span className={cn('flex size-9 items-center justify-center rounded-xl text-white', w.tone)}>
                <w.icon className="size-[18px]" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold">{w.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-hero-muted">{w.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const GUIDE: { c: Condition; tint: string; text: string }[] = [
  { c: 'GENUINE_NEW_PULL', tint: 'bg-tint-mint', text: 'text-success' },
  { c: 'GENUINE_A', tint: 'bg-tint-teal', text: 'text-success' },
  { c: 'GENUINE_B', tint: 'bg-tint-sky', text: 'text-accent' },
  { c: 'COMPATIBLE_NEW', tint: 'bg-tint-lavender', text: 'text-purple' },
];

export function ConditionGuide() {
  return (
    <section className="py-12 sm:py-16" aria-labelledby="grades-title">
      <Container>
        <SectionHead id="grades-title" title="Know exactly what you get." href="/help/grades" cta="Grading guide" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {GUIDE.map((g) => (
            <li key={g.c} className={cn('rounded-[var(--radius-card)] p-5', g.tint)}>
              <p className={cn('text-xs font-semibold', g.text)}>{CONDITION_LABEL[g.c]}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-fg/80">{CONDITION_DESCRIPTION[g.c]}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function PopularModels({ models }: { models: DeviceModelDTO[] }) {
  if (!models.length) return null;
  return (
    <section className="pb-14 sm:pb-20" aria-labelledby="popular-models">
      <Container>
        <h2 id="popular-models" className="text-[19px] font-semibold tracking-tight">
          Popular models
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {models.map((m) => (
            <li key={m.id}>
              <Link href={modelHref(m)} className="inline-flex items-center gap-2 rounded-full border border-line-subtle bg-surface px-3.5 py-2 text-[13px] transition hover:border-line hover:bg-surface-2">
                <span className={cn('size-2 rounded-full', familyLook(m.familySlug).dot)} aria-hidden />
                {modelShort(m)} · {m.aNumbers[0]}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
