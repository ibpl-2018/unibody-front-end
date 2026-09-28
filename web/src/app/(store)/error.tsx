'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCcw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { Container } from '@/components/store/section';

export default function StoreError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <WifiOff className="size-6" />
      </span>
      <h1 className="mt-5 text-[26px] font-semibold tracking-tight">Something went wrong.</h1>
      <p className="mt-2 max-w-md text-[15px] text-muted">We couldn’t load this page. It’s probably a hiccup on our side — please try again in a moment.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Ref: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button onClick={() => retry()}>
          <RefreshCcw className="size-4" /> Try again
        </Button>
        <Link href="/" className="inline-flex h-10 items-center rounded-full bg-surface-2 px-5 text-sm font-medium hover:bg-line-subtle">
          Go home
        </Link>
      </div>
    </Container>
  );
}
