import Link from 'next/link';
import type { CategoryDTO } from '@unibody/shared';
import { ProductImage } from '@/components/ui';
import { categoryRender, categoryShort } from '@/lib/store/catalog';
import { Container, SectionHead } from '../section';

/** Category tiles on tinted stages (D01 "Shop by part"). */
export function ShopByPart({ categories }: { categories: CategoryDTO[] }) {
  const tiles = categories.filter((c) => (c.productCount ?? 0) > 0 && !c.parentId).slice(0, 8);
  if (!tiles.length) return null;
  return (
    <section className="py-12 sm:py-16" aria-labelledby="shop-by-part">
      <Container>
        <SectionHead id="shop-by-part" title="Shop by part." sub="The right part, graded and tested, for every Mac since 2012." href="/shop" cta="All categories" />
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-4 lg:grid-cols-8">
          {tiles.map((c) => (
            <li key={c.id}>
              <Link href={`/shop?cat=${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
                <ProductImage
                  src={categoryRender(c)}
                  alt=""
                  tint={c.icon}
                  className="aspect-square w-full transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-card"
                  rounded="rounded-[18px]"
                  imgClassName="p-[14%] transition duration-500 group-hover:scale-105"
                />
                <span className="text-xs font-medium sm:text-[13px]">{categoryShort(c)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
