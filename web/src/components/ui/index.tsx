'use client';
/**
 * Unibody UI kit — small, token-driven primitives shared by the storefront and /admin.
 * Everything here uses theme tokens (bg-surface, text-fg, border-line, bg-accent…) so light/dark just work.
 */
import { forwardRef, useId } from 'react';
import Link from 'next/link';
import { Loader2, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { CONDITION_SHORT, CONDITION_LABEL, CONDITION_TONE, STATUS_LABEL, ADMIN_STATUS_LABEL, STATUS_TONE, formatINR, type Condition, type OrderStatus, type Tone } from '@unibody/shared';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

// ---------------------------------------------------------------- Button
type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background,color,box-shadow,transform] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none';
const btnVariant: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-fg hover:bg-line-subtle',
  dark: 'bg-fg text-bg hover:opacity-90',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2',
};
const btnSize: Record<ButtonSize, string> = { sm: 'h-8 px-3.5 text-[13px]', md: 'h-10 px-5 text-sm', lg: 'h-12 px-7 text-[15px]' };
export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) => cn(btnBase, btnVariant[variant], btnSize[size], className);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
export function ButtonLink({ href, variant = 'primary', size = 'md', className, children, ...rest }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
export function IconButton({ className, label, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn('inline-flex size-9 items-center justify-center rounded-full text-fg transition hover:bg-surface-2', className)} {...rest}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Badge
const toneClass: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  info: 'bg-accent-soft text-accent',
  purple: 'bg-purple-soft text-purple',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-2 text-muted',
};
export function Badge({ tone = 'neutral', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', toneClass[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
export const ConditionBadge = ({ condition, long }: { condition: Condition; long?: boolean }) => (
  <Badge tone={CONDITION_TONE[condition]}>{long ? CONDITION_LABEL[condition] : CONDITION_SHORT[condition]}</Badge>
);
export const StatusBadge = ({ status, admin }: { status: OrderStatus; admin?: boolean }) => (
  <Badge tone={STATUS_TONE[status]} dot>
    {(admin ? ADMIN_STATUS_LABEL : STATUS_LABEL)[status]}
  </Badge>
);

// ---------------------------------------------------------------- Card
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-line-subtle bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Form controls
const fieldBase =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-fg placeholder:text-subtle outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60';
export const inputClass = (className?: string, invalid?: boolean) => cn(fieldBase, 'h-11', invalid && 'border-danger focus:border-danger focus:ring-danger/15', className);

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={inputClass(className, invalid)} {...rest} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, ...rest }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-24 py-2.5', invalid && 'border-danger', className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, 'h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', invalid && 'border-danger', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  );
});
/** Label + control + hint/error. Pass the control as children. */
export function Field({ label, hint, error, className, children, htmlFor }: { label?: React.ReactNode; hint?: React.ReactNode; error?: string | null; className?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={rest.id ?? id} className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-fg', className)}>
      <input id={rest.id ?? id} type="checkbox" className="size-[18px] rounded-md accent-[var(--accent)]" {...rest} />
      {label}
    </label>
  );
}
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-success' : 'bg-line')}
    >
      <span className={cn('inline-block size-[22px] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[20px]' : 'translate-x-[2px]')} />
    </button>
  );
}
/** Segmented control (Apple-style pill tabs). */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex rounded-full bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('rounded-full font-medium transition', size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-[13px]', value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Misc
export function Price({ value, mrp, size = 'md', className }: { value: number; mrp?: number | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = { sm: 'text-[15px]', md: 'text-lg', lg: 'text-2xl', xl: 'text-[34px]' }[size];
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className={cn('font-semibold tracking-tight text-fg', s)}>{formatINR(value)}</span>
      {mrp && mrp > value ? <span className="text-xs text-subtle line-through">{formatINR(mrp)}</span> : null}
    </span>
  );
}
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('size-5 animate-spin text-muted', className)} />;
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

/** Tinted stage colours cycle per category/family so product tiles feel colourful like the Figma. */
const TINTS = ['bg-tint-sky', 'bg-tint-lavender', 'bg-tint-mint', 'bg-tint-blush', 'bg-tint-peach', 'bg-tint-graphite', 'bg-tint-teal', 'bg-tint-lemon', 'bg-tint-sand'];
const ICON_TINT: Record<string, string> = {
  display: 'bg-tint-sky',
  keyboard: 'bg-tint-lavender',
  battery: 'bg-tint-mint',
  cpu: 'bg-tint-blush',
  charger: 'bg-tint-peach',
  trackpad: 'bg-tint-graphite',
  fan: 'bg-tint-teal',
  ssd: 'bg-tint-lemon',
  speaker: 'bg-tint-graphite',
  camera: 'bg-tint-lavender',
  laptop: 'bg-tint-sand',
  cable: 'bg-tint-peach',
  box: 'bg-tint-sand',
};
export const tintFor = (key?: string | null) => (key && ICON_TINT[key]) || TINTS[Math.abs([...(key ?? 'x')].reduce((a, c) => a + c.charCodeAt(0), 0)) % TINTS.length];

/** Product render on a tinted stage. Images are transparent PNG/WebP renders from the API. */
export function ProductImage({ src, alt, tint, className, imgClassName, rounded = 'rounded-2xl' }: { src?: string | null; alt: string; tint?: string | null; className?: string; imgClassName?: string; rounded?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', rounded, tintFor(tint), className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className={cn('h-full w-full object-contain p-[8%] drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)]', imgClassName)} />
      ) : (
        <span className="text-xs text-subtle">No image</span>
      )}
    </div>
  );
}

export function Logo({ className, admin }: { className?: string; admin?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="gradient-brand flex size-7 items-center justify-center rounded-lg text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>
      <span className="text-[17px]">Unibody</span>
      {admin && <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-bg">Admin</span>}
    </span>
  );
}

export function ThemeToggle({ className, withAuto }: { className?: string; withAuto?: boolean }) {
  const { resolved, pref, setPref, toggle } = useTheme();
  if (withAuto) {
    return (
      <Segmented
        size="sm"
        className={className}
        value={pref}
        onChange={setPref}
        options={[
          { value: 'light', label: <span className="inline-flex items-center gap-1"><Sun className="size-3.5" />Light</span> },
          { value: 'dark', label: <span className="inline-flex items-center gap-1"><Moon className="size-3.5" />Dark</span> },
          { value: 'auto', label: <span className="inline-flex items-center gap-1"><MonitorSmartphone className="size-3.5" />Auto</span> },
        ]}
      />
    );
  }
  return (
    <IconButton label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} className={className}>
      {resolved === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </IconButton>
  );
}

/** Minimal modal/sheet. Bottom sheet on mobile, centred dialog on desktop. */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative max-h-[92vh] w-full overflow-auto rounded-t-3xl border border-line-subtle bg-surface p-6 shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
