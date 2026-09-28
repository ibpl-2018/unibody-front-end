import Link from 'next/link';
import { formatINR, type DeviceFamilyDTO } from '@unibody/shared';
import { btn } from '../btn';
import { cn } from '@/lib/cn';
import { familyLook } from '@/lib/store/catalog';
import { Container, SectionHead } from '../section';

function DeviceTile({ f, big, eyebrow }: { f: DeviceFamilyDTO; big?: boolean; eyebrow?: string }) {
  const look = familyLook(f.slug);
  const dark = !!look.dark;
  return (
    <Link
      href={`/d/${f.slug}`}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-[var(--radius-tile)] px-5 pt-7 text-center transition duration-300 hover:shadow-xl',
        look.tint,
        dark && 'text-hero-fg ring-1 ring-inset ring-line-subtle',
        big ? 'min-h-[400px] sm:min-h-[460px]' : 'min-h-[300px] sm:min-h-[340px]',
      )}
    >
      {eyebrow && <p className={cn('text-xs font-semibold', dark ? 'text-vivid-orange' : 'text-warning')}>{eyebrow}</p>}
      <h3 className={cn('font-semibold tracking-tight', big ? 'mt-1 text-[30px] sm:text-[40px]' : 'text-[22px] sm:text-[26px]')}>{f.name}</h3>
      <p className={cn('mt-0.5 text-xs', dark ? 'text-hero-muted' : 'text-muted')}>{look.blurb || `${f.modelCount} models`}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className={btn('primary', 'sm', 'h-7 px-3 text-xs')}>Shop parts</span>
        {big && <span className={cn('text-xs font-medium', dark ? 'text-accent' : 'text-link')}>{f.productCount} parts ›</span>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={look.render}
        alt=""
        loading="lazy"
        className={cn(
          'pointer-events-none mt-auto w-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.25)] transition duration-500 group-hover:scale-[1.03]',
          big ? 'max-h-[300px] max-w-[440px] pt-4' : 'max-h-[190px] max-w-[220px] pb-4 pt-4',
        )}
      />
    </Link>
  );
}

export function ShopByDevice({ families }: { families: DeviceFamilyDTO[] }) {
  const by = (slug: string) => families.find((f) => f.slug === slug);
  const air = by('macbook-air');
  const pro = by('macbook-pro');
  const small = ['imac', 'iphone', 'ipad', 'accessories'].map(by).filter((f): f is DeviceFamilyDTO => !!f);
  return (
    <section className="py-12 sm:py-16" aria-labelledby="shop-by-device">
      <Container>
        <SectionHead id="shop-by-device" title="Shop by device." href="/shop" cta="All devices" />
        <div className="grid gap-3 sm:gap-5 md:grid-cols-2">
          {air && <DeviceTile f={air} big eyebrow={air.fromPrice ? `Parts from ${formatINR(air.fromPrice)}` : undefined} />}
          {pro && <DeviceTile f={pro} big eyebrow="Most popular" />}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-4">
          {small.map((f) => (
            <DeviceTile key={f.id} f={f} />
          ))}
        </div>
      </Container>
    </section>
  );
}
