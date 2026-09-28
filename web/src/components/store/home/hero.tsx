import Link from 'next/link';
import { Search } from 'lucide-react';
import { btn } from '../btn';
import { HERO_RENDER } from '@/lib/store/catalog';

export interface HeroStat {
  value: string;
  label: string;
  tone: string;
}

export function Hero({ stats }: { stats: HeroStat[] }) {
  return (
    <section className="hero-glow relative overflow-hidden text-hero-fg" aria-labelledby="hero-title">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="text-gradient text-[15px] font-semibold sm:text-[17px]">Genuine. Tested. Delivered.</p>
        <h1 id="hero-title" className="mt-2 text-[44px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[72px] lg:text-[84px]">
          Every part.
          <br />
          Every Mac.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-hero-muted sm:text-[19px]">
          Displays, keyboards, batteries and logic boards for MacBook, iMac, iPhone and iPad — 2012 to today. Delivered in 1–3 days. Pay on delivery.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={btn('primary', 'md')}>
            Shop parts
          </Link>
          <Link href="#finder" className={btn('plain', 'md', 'bg-hero-surface text-hero-fg hover:bg-hero-surface/70')}>
            Find my model
          </Link>
        </div>

        <form action="/search" method="get" role="search" className="mt-8 flex w-full max-w-[560px] items-center gap-2 rounded-full border border-white/10 bg-hero-surface/80 p-1.5 pl-5 backdrop-blur">
          <Search className="size-[18px] shrink-0 text-hero-muted" aria-hidden />
          <label htmlFor="hero-q" className="sr-only">
            Search a part or model number
          </label>
          <input
            id="hero-q"
            name="q"
            required
            placeholder="Search a part or model number — e.g. “A2337 display”"
            className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-hero-fg outline-none placeholder:text-hero-muted"
          />
          <button type="submit" className={btn('primary', 'sm', 'h-9 px-4')}>
            Search
          </button>
        </form>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_RENDER}
          alt="MacBook with a replacement display"
          className="pointer-events-none mt-6 w-full max-w-[760px] select-none drop-shadow-[0_40px_60px_rgba(88,86,214,0.35)] sm:mt-2"
          fetchPriority="high"
        />

        <dl className="mt-4 grid w-full max-w-[900px] grid-cols-2 gap-y-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <dt className="sr-only">{s.label}</dt>
              <dd className={`text-[26px] font-bold tracking-tight sm:text-[32px] ${s.tone}`}>{s.value}</dd>
              <dd className="text-xs text-hero-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
