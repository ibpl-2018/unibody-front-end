import Link from 'next/link';
import { Search } from 'lucide-react';
import { Container } from '@/components/store/section';
import { NAV_FAMILIES } from '@/lib/store/catalog';

export default function StoreNotFound() {
  return (
    <Container className="flex flex-col items-center py-20 text-center sm:py-28">
      <p className="text-gradient text-[64px] font-bold leading-none tracking-tight sm:text-[96px]">404</p>
      <h1 className="mt-4 text-[26px] font-semibold tracking-tight sm:text-[32px]">This part of the store doesn’t exist.</h1>
      <p className="mt-2 max-w-md text-[15px] text-muted">The link may be old, or the part may have sold out and been removed. Try searching by your model number.</p>
      <form action="/search" method="get" role="search" className="mt-6 flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 focus-within:border-accent">
        <Search className="size-4 text-muted" aria-hidden />
        <label htmlFor="nf-q" className="sr-only">Search</label>
        <input id="nf-q" name="q" placeholder="e.g. A2337 battery" className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" />
        <button className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-[13px] font-medium text-on-accent">Search</button>
      </form>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {NAV_FAMILIES.map((f) => (
          <li key={f.slug}>
            <Link href={`/d/${f.slug}`} className="inline-flex rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] hover:bg-line-subtle">{f.label}</Link>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-8 text-sm font-medium text-link hover:underline">Back to home</Link>
    </Container>
  );
}
