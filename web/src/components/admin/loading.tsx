import { Logo, Spinner } from '@/components/ui';

export function FullPageLoader({ label = 'Loading admin…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-2">
      <Logo admin />
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        <Spinner className="size-4" />
        {label}
      </span>
    </div>
  );
}
