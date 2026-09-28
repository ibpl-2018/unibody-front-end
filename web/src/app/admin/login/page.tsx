'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import type { AdminCodeSentResponse, AdminLoginResponse } from '@unibody/shared';
import { Button, Field, Input, Logo, ThemeToggle } from '@/components/ui';
import { adminApi, adminToken, can, errMsg } from '@/lib/admin/api';

const DEMO = [
  { email: 'owner@unibody.in', role: 'Super Admin' },
  { email: 'manager@unibody.in', role: 'Admin' },
  { email: 'packer@unibody.in', role: 'Staff' },
];

/**
 * password  → email + password (Super Admin with a phone on file continues to `twoStep`)
 * phone     → number on the staff account → `phoneCode`
 * forgot    → email → `reset` (code + new password)
 */
type Mode = 'password' | 'twoStep' | 'phone' | 'phoneCode' | 'forgot' | 'reset';

const TITLES: Record<Mode, [string, string]> = {
  password: ['Sign in to Admin', 'For store owner and staff only.'],
  twoStep: ['Enter your code', ''],
  phone: ['Sign in with OTP', 'We’ll send a code to the phone number on your staff account.'],
  phoneCode: ['Enter your code', ''],
  forgot: ['Reset your password', 'We’ll send a code to the phone number on your account.'],
  reset: ['Set a new password', ''],
};

/** Six-digit code box: numeric keypad, SMS autofill on phones. */
function CodeInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <Input
      id="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="text-center text-[20px] tracking-[0.5em]"
      autoFocus
      invalid={invalid}
    />
  );
}

function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = (s = 30) => {
    setLeft(s);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setLeft((n) => (n <= 1 ? (clearInterval(timer.current!), 0) : n - 1)), 1000);
  };
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  return { left, start };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [ticket, setTicket] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resend = useCountdown();

  useEffect(() => {
    document.title = 'Sign in · Unibody Admin';
    // Already signed in? Skip the form.
    if (adminToken.get())
      adminApi.admin
        .me()
        .then((u) => router.replace(can(u.role, 'dashboard') ? '/admin' : '/admin/orders'))
        .catch(() => adminToken.set(null));
  }, [router]);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setCode('');
    setDevCode(undefined);
  };

  const signedIn = (r: AdminLoginResponse) => {
    adminToken.set(r.token);
    const next = new URLSearchParams(window.location.search).get('next');
    const safe = next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : null;
    router.replace(safe ?? (can(r.user.role, 'dashboard') ? '/admin' : '/admin/orders'));
  };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(errMsg(err, fallback));
    } finally {
      setBusy(false);
    }
  };
  const codeSent = (r: AdminCodeSentResponse | { devCode?: string }, to: string, next: Mode) => {
    setSentTo(to);
    resend.start();
    go(next);
    setDevCode(r.devCode);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    switch (mode) {
      case 'password':
        if (!email.trim() || !password) return setError('Enter your email and password');
        return run(async () => {
          const r = await adminApi.admin.login(email.trim(), password);
          if ('twoStep' in r) {
            setTicket(r.ticket);
            codeSent(r, r.phoneMasked, 'twoStep');
          } else signedIn(r);
        }, 'Email or password is incorrect');
      case 'twoStep':
        if (code.length !== 6) return setError('Enter the 6-digit code');
        return run(async () => signedIn(await adminApi.admin.twoStepVerify(ticket, code)), 'That code is not correct');
      case 'phone':
        return run(async () => codeSent(await adminApi.admin.otpSend(phone), phone, 'phoneCode'), 'Couldn’t send a code');
      case 'phoneCode':
        if (code.length !== 6) return setError('Enter the 6-digit code');
        return run(async () => signedIn(await adminApi.admin.otpVerify(phone, code)), 'That code is not correct');
      case 'forgot':
        if (!email.trim()) return setError('Enter the email you sign in with');
        return run(async () => codeSent(await adminApi.admin.forgotPassword(email.trim()), '', 'reset'), 'Couldn’t send a code');
      case 'reset':
        if (code.length !== 6) return setError('Enter the 6-digit code');
        if (newPassword.length < 8) return setError('Use at least 8 characters for the new password');
        return run(async () => {
          await adminApi.admin.resetPassword(email.trim(), code, newPassword);
          setPassword('');
          go('password');
          setNotice('Password changed. Sign in with your new password.');
        }, 'Couldn’t reset the password');
    }
  };

  const resendCode = () =>
    run(async () => {
      const r =
        mode === 'twoStep'
          ? await adminApi.admin.twoStepResend(ticket)
          : mode === 'phoneCode'
            ? await adminApi.admin.otpSend(phone)
            : await adminApi.admin.forgotPassword(email.trim());
      setDevCode(r.devCode);
      resend.start();
    }, 'Couldn’t send a new code');

  const [title, sub] = TITLES[mode];
  const subtitle =
    mode === 'twoStep'
      ? `2-step verification: we sent a 6-digit code to ${sentTo}.`
      : mode === 'phoneCode'
        ? `If ${sentTo} is on a staff account, a 6-digit code is on its way.`
        : mode === 'reset'
          ? `If ${email.trim()} has a phone number on file, we sent it a 6-digit code.`
          : sub;
  const cta: Record<Mode, string> = { password: 'Continue', twoStep: 'Verify & sign in', phone: 'Send code', phoneCode: 'Verify & sign in', forgot: 'Send code', reset: 'Set new password' };
  const codeStep = mode === 'twoStep' || mode === 'phoneCode' || mode === 'reset';

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg-2 px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-[420px]">
        <form onSubmit={submit} className="rounded-[28px] border border-line-subtle bg-surface p-7 shadow-card sm:p-10" noValidate aria-labelledby="login-title">
          <Logo admin className="text-[20px]" />
          {mode !== 'password' && (
            <button type="button" onClick={() => go(mode === 'phoneCode' ? 'phone' : mode === 'reset' ? 'forgot' : 'password')} className="mt-6 inline-flex items-center gap-1 text-[13px] text-link hover:underline">
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
          <h1 id="login-title" className={mode === 'password' ? 'mt-8 text-[26px] font-semibold tracking-tight' : 'mt-3 text-[26px] font-semibold tracking-tight'}>
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}

          <div className="mt-6 space-y-4">
            {notice && (
              <p role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
                {notice}
              </p>
            )}

            {(mode === 'password' || mode === 'forgot') && (
              <Field label="Email" htmlFor="email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                  <Input id="email" type="email" autoComplete="username" placeholder="you@unibody.in" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoFocus invalid={!!error} />
                </div>
              </Field>
            )}

            {mode === 'password' && (
              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                  <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-28" invalid={!!error} />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-full p-1.5 text-subtle hover:text-fg">
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button type="button" onClick={() => go('forgot')} className="px-1.5 text-[13px] font-medium text-link hover:underline">
                      Forgot?
                    </button>
                  </div>
                </div>
              </Field>
            )}

            {mode === 'phone' && (
              <Field label="Mobile number" htmlFor="phone">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">+91</span>
                  <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))} className="pl-12" autoFocus invalid={!!error} />
                </div>
              </Field>
            )}

            {codeStep && (
              <Field label="6-digit code" htmlFor="code">
                <CodeInput value={code} onChange={setCode} invalid={!!error} />
              </Field>
            )}

            {mode === 'reset' && (
              <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
                <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} invalid={!!error} />
              </Field>
            )}

            {devCode && (
              <p className="rounded-xl border border-dashed border-line px-3.5 py-2 text-xs text-muted">
                Dev mode — code: <strong className="font-mono tracking-widest text-fg">{devCode}</strong>
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {cta[mode]}
            </Button>

            {codeStep && (
              <p className="text-center text-[13px] text-muted">
                {resend.left > 0 ? (
                  `Resend code in ${resend.left}s`
                ) : (
                  <button type="button" onClick={resendCode} className="font-medium text-link hover:underline" disabled={busy}>
                    Resend code
                  </button>
                )}
              </p>
            )}

            {mode === 'password' && (
              <>
                <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden>
                  <span className="h-px flex-1 bg-line-subtle" /> or <span className="h-px flex-1 bg-line-subtle" />
                </div>
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => go('phone')}>
                  <Smartphone className="size-4" /> Sign in with OTP on phone
                </Button>
              </>
            )}

            {mode === 'forgot' && (
              <p className="flex gap-2 text-[13px] text-muted">
                <KeyRound className="mt-0.5 size-4 shrink-0" /> No phone on your account? Ask the Super Admin to reset your password from Team.
              </p>
            )}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-subtle">
            <ShieldCheck className="size-3.5" /> 2-step verification enforced for Super Admin
          </p>
        </form>

        {process.env.NODE_ENV !== 'production' && mode === 'password' && (
          <div className="mt-5 rounded-2xl border border-dashed border-line p-4 text-xs text-muted">
            <p className="mb-2 font-medium text-fg">Demo accounts · password Unibody@2026</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword('Unibody@2026');
                  }}
                  className="rounded-full bg-surface px-2.5 py-1 font-medium text-fg ring-1 ring-line-subtle hover:ring-line"
                >
                  {d.role}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-subtle">Staff access only · Sessions expire after 12 hours</p>
      </div>
    </div>
  );
}
