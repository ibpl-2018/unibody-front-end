'use client';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ApiError, formatPhone, isValidPhone, normalizePhone, type OtpVerifyResponse } from '@unibody/shared';
import { Button, Field, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { useSession } from '@/lib/store/session';

/** 6-box code input with paste + auto-advance. */
function CodeInput({ value, onChange, onComplete, invalid }: { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; invalid?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => refs.current[0]?.focus(), []);
  const set = (i: number, d: string) => {
    const chars = value.padEnd(6, ' ').split('');
    chars[i] = d || ' ';
    const next = chars.join('').replace(/\s+$/, '');
    onChange(next);
    if (/^\d{6}$/.test(next)) onComplete(next);
  };
  return (
    <div className="flex justify-center gap-2" role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          value={value[i]?.trim() ?? ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) {
              const all = (value.slice(0, i) + v).slice(0, 6);
              onChange(all);
              refs.current[Math.min(all.length, 5)]?.focus();
              if (/^\d{6}$/.test(all)) onComplete(all);
              return;
            }
            set(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (v) {
              e.preventDefault();
              onChange(v);
              refs.current[Math.min(v.length, 5)]?.focus();
              if (v.length === 6) onComplete(v);
            }
          }}
          className={cn(
            'size-11 rounded-xl border bg-surface text-center text-xl font-semibold outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 sm:size-12',
            invalid ? 'border-danger' : 'border-line',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Sends an OTP to `phone` when opened, verifies the 6-digit code, and signs the shopper in.
 * Shows the dev code when the API runs in OTP_DEV_MODE.
 */
export function OtpDialog({ phone, open, onClose, onVerified }: { phone: string; open: boolean; onClose: () => void; onVerified: (r: OtpVerifyResponse) => void }) {
  const { signIn } = useSession();
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const sentFor = useRef<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await api.store.sendOtp(phone);
      setDevCode(r.devCode ?? null);
      setWait(30);
      sentFor.current = phone;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t send the code. Try again.');
      if (e instanceof ApiError && e.code === 'TOO_SOON') setWait(30);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (open && sentFor.current !== phone) {
      setCode('');
      void send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone]);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (c = code) => {
    if (!/^\d{6}$/.test(c)) {
      setError('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const r = await api.store.verifyOtp(phone, c);
      signIn(r);
      sentFor.current = null;
      onVerified(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t verify. Try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">Verify your mobile</h2>
        <p className="mt-1 text-sm text-muted">
          Enter the 6-digit code sent by SMS to <strong className="font-medium text-fg">{formatPhone(phone)}</strong>
        </p>
      </div>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        {open && <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={!!error} />}
        {error && (
          <p className="mt-3 text-center text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {devCode && (
          <p className="mt-3 text-center text-xs text-muted">
            Test mode — your code is{' '}
            <button type="button" className="font-mono font-semibold text-link" onClick={() => void verify(devCode)}>
              {devCode}
            </button>
          </p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" loading={verifying} disabled={code.length !== 6}>
          Verify
        </Button>
        <div className="mt-3 flex items-center justify-between text-[13px]">
          <button type="button" onClick={onClose} className="text-muted hover:text-fg">
            Change number
          </button>
          <button type="button" disabled={wait > 0 || sending} onClick={() => void send()} className="font-medium text-link disabled:text-subtle">
            {sending ? 'Sending…' : wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Phone input with +91 prefix. */
export function PhoneInput({ id, value, onChange, invalid, disabled, right }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean; right?: React.ReactNode }) {
  return (
    <div className={cn('flex h-11 items-center rounded-xl border bg-surface transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15', invalid ? 'border-danger' : 'border-line', disabled && 'opacity-80')}>
      <span className="pl-3.5 pr-2 text-[15px] text-muted">+91</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(normalizePhone(e.target.value).slice(0, 10))}
        placeholder="98765 43210"
        aria-invalid={invalid}
        className="h-full min-w-0 flex-1 bg-transparent pr-3 text-[15px] tracking-wide outline-none placeholder:text-subtle"
      />
      {right && <span className="pr-2">{right}</span>}
    </div>
  );
}

/** Standalone sign-in card (My orders). */
export function OtpLogin({ title = 'Sign in with your mobile', sub, onDone }: { title?: string; sub?: string; onDone?: () => void }) {
  const [phone, setPhone] = useState('');
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValidPhone(phone)) return setErr('Enter a valid 10-digit mobile number');
          setErr(null);
          setOpen(true);
        }}
      >
        <Field label="Mobile number" htmlFor="login-phone" error={err}>
          <PhoneInput id="login-phone" value={phone} onChange={setPhone} invalid={!!err} />
        </Field>
        <Button type="submit" size="lg" className="mt-4 w-full">
          Send code
        </Button>
      </form>
      <OtpDialog
        phone={phone}
        open={open}
        onClose={() => setOpen(false)}
        onVerified={() => {
          setOpen(false);
          onDone?.();
        }}
      />
    </div>
  );
}
