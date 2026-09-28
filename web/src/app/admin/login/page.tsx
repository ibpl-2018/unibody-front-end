'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, Field, Input, Logo, ThemeToggle } from '@/components/ui';
import { adminApi, adminToken, can, errMsg } from '@/lib/admin/api';

const DEMO = [
  { email: 'owner@unibody.in', role: 'Owner' },
  { email: 'manager@unibody.in', role: 'Manager' },
  { email: 'packer@unibody.in', role: 'Packer' },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Sign in · Unibody Admin';
    // Already signed in? Skip the form.
    if (adminToken.get())
      adminApi.admin
        .me()
        .then((u) => router.replace(can(u.role, 'dashboard') ? '/admin' : '/admin/orders'))
        .catch(() => adminToken.set(null));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Enter your email and password');
    setBusy(true);
    try {
      const r = await adminApi.admin.login(email.trim(), password);
      adminToken.set(r.token);
      const next = new URLSearchParams(window.location.search).get('next');
      const safe = next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : null;
      router.replace(safe ?? (can(r.user.role, 'dashboard') ? '/admin' : '/admin/orders'));
    } catch (err) {
      setError(errMsg(err, 'Email or password is incorrect'));
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg-2 px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl gradient-aurora dark:opacity-25" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo admin className="scale-110" />
          <h1 className="mt-6 text-[28px] font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage orders, stock and offers.</p>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-line-subtle bg-surface p-6 shadow-card sm:p-7" noValidate>
          <div className="space-y-4">
            <Field label="Work email" htmlFor="email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input id="email" type="email" autoComplete="username" placeholder="you@unibody.in" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoFocus invalid={!!error} />
              </div>
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="px-10" invalid={!!error} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-subtle hover:text-fg">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Sign in
            </Button>
          </div>
        </form>
        {process.env.NODE_ENV !== 'production' && (
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
