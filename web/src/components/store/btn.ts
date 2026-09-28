import { cn } from '@/lib/cn';

/**
 * Server-safe copy of the UI kit's `buttonClass` (that one lives in a 'use client' module,
 * so Server Components cannot call it). Keep in sync with components/ui/index.tsx.
 */
type V = 'plain' | 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outline';
type S = 'sm' | 'md' | 'lg';
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background,color,box-shadow,transform] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none';
const variant: Record<V, string> = {
  plain: '',
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-fg hover:bg-line-subtle',
  dark: 'bg-fg text-bg hover:opacity-90',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2',
};
const size: Record<S, string> = { sm: 'h-8 px-3.5 text-[13px]', md: 'h-10 px-5 text-sm', lg: 'h-12 px-7 text-[15px]' };
export const btn = (v: V = 'primary', s: S = 'md', className?: string) => cn(base, variant[v], size[s], className);
