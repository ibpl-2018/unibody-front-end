'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Check, MapPin, Search, X } from 'lucide-react';
import { ApiError, formatINR, type DeviceModelDTO, type ServiceabilityDTO } from '@unibody/shared';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { familyLook } from '@/lib/store/catalog';
import { useMyDevice } from '@/lib/store/device';
import { useCart } from '@/lib/store/cart';
import { useStoreConfig } from '@/lib/store/config';

/** Compatibility card: "Fits your …" when a device is saved, otherwise check by A-number. */
export function FitCard({ productId, compatible }: { productId: string; compatible: DeviceModelDTO[] }) {
  const { device, setDevice } = useMyDevice();
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ fits: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fitsMine = !!device && compatible.some((m) => m.id === device.id);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = a.trim().toUpperCase();
    if (!/^A\d{4}$/.test(v)) {
      setError('Enter a model number like A2337');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.store.checkFit(productId, v);
      setResult({ fits: r.fits, message: r.message });
      if (r.model) setDevice(r.model);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t check right now');
    } finally {
      setBusy(false);
    }
  };

  const others = compatible.filter((m) => m.id !== device?.id);
  const otherText = others.length ? `Also fits ${others.slice(0, 2).map((m) => `${m.name} (${m.aNumbers[0]})`).join(', ')}${others.length > 2 ? ` +${others.length - 2} more` : ''}.` : 'Check connectors match before fitting.';

  if (device && !editing) {
    return (
      <div className={cn('flex items-center gap-4 rounded-2xl p-4', fitsMine ? 'bg-success-soft' : 'bg-warning-soft')} role="status">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={familyLook(device.familySlug).render} alt="" className="hidden h-12 w-16 shrink-0 object-contain sm:block" />
        <div className="min-w-0 flex-1">
          <p className={cn('flex items-center gap-1.5 text-sm font-semibold', fitsMine ? 'text-success' : 'text-warning')}>
            {fitsMine ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
            {fitsMine ? `Fits your ${device.short} (${device.aNumbers[0]})` : `Doesn’t fit your ${device.short} (${device.aNumbers[0]})`}
          </p>
          <p className="mt-0.5 text-xs text-muted">{fitsMine ? otherText : result?.message && !result.fits ? result.message : `This part is made for ${compatible.map((m) => m.aNumbers[0]).slice(0, 3).join(', ')}.`}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-[13px] font-medium text-link hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={check} className="rounded-2xl border border-line-subtle p-4">
      <div className="flex items-center justify-between">
        <label htmlFor="fit-a" className="text-sm font-semibold">
          Will it fit my device?
        </label>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="text-muted hover:text-fg">
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">Enter the model number printed on the bottom case (A + 4 digits).</p>
      <div className="mt-3 flex gap-2">
        <input
          id="fit-a"
          value={a}
          onChange={(e) => setA(e.target.value.toUpperCase().slice(0, 5))}
          placeholder="A2337"
          autoComplete="off"
          aria-invalid={!!error}
          className="h-10 w-full min-w-0 rounded-full border border-line bg-surface px-4 text-[15px] uppercase tracking-wide outline-none placeholder:normal-case focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <Button type="submit" variant="dark" loading={busy}>
          {!busy && <Search className="size-4" />} Check
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {result && !editing && <p className={cn('mt-2 text-xs font-medium', result.fits ? 'text-success' : 'text-warning')}>{result.message}</p>}
    </form>
  );
}

/** Pincode → ETA + COD availability. Remembers the pincode in the cart. */
export function PincodeCheck() {
  const { cart, setPincode, ready } = useCart();
  const config = useStoreConfig();
  const [pin, setPin] = useState('');
  const [area, setArea] = useState<ServiceabilityDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const run = async (p: string) => {
    if (!/^[1-9]\d{5}$/.test(p)) {
      setError('Enter a valid 6-digit pincode');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.store.serviceability(p);
      setArea(r);
      setPincode(p);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t check this pincode');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (ready && cart.pincode && !area) {
      setPin(cart.pincode);
      void run(cart.pincode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (area && !editing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line-subtle p-4" role="status">
        <MapPin className="size-5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">
            Deliver to {area.pincode}
            {area.city ? ` · ${area.city}` : ''}
          </p>
          {area.serviceable ? (
            <p className="mt-0.5 text-xs text-success">
              {area.etaDate ? `Arrives ${fmtWeekday(area.etaDate)}` : `Arrives in ${area.etaDays ?? 3} days`}
              {' · '}
              {area.cod && config.codEnabled ? `Cash on Delivery available (+${formatINR(config.codFee)})` : 'Prepaid only for this pincode'}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-danger">Sorry, we don’t deliver here yet. WhatsApp us — we may still be able to ship.</p>
          )}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-[13px] font-medium text-link hover:underline">
          Change
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(pin);
      }}
      className="rounded-2xl border border-line-subtle p-4"
    >
      <label htmlFor="pin" className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4 text-muted" /> Check delivery
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="pin"
          inputMode="numeric"
          autoComplete="postal-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit pincode"
          aria-invalid={!!error}
          className="h-10 w-full min-w-0 rounded-full border border-line bg-surface px-4 text-[15px] tracking-wide outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? <Spinner className="size-4" /> : 'Check'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}
