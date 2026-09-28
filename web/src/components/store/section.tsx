import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6', className)}>{children}</div>;
}

export function SectionHead({ title, sub, href, cta, className, id }: { title: React.ReactNode; sub?: React.ReactNode; href?: string; cta?: string; className?: string; id?: string }) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4 sm:mb-7', className)}>
      <div>
        <h2 id={id} className="text-[26px] font-semibold tracking-tight sm:text-[32px]">
          {title}
        </h2>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center text-sm font-medium text-link hover:underline">
          {cta ?? 'See all'}
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="no-scrollbar overflow-x-auto">
      <ol className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-subtle" aria-hidden />}
            {it.href ? (
              <Link href={it.href} className="hover:text-fg">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
