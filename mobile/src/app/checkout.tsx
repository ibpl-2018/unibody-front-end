import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { OtpInput } from '@/components/otp-input';
import { QuoteSummary } from '@/components/summary';
import { BottomBar, Button, Card, EmptyState, Input, Notice, ProductImage, Segmented, Skeleton, Text, type IconName } from '@/components/ui';
import { useAsync, useDebounced } from '@/hooks/use-async';
import { api, ApiError, errorMessage } from '@/lib/api';
import { fmtShortWeekday } from '@/lib/format';
import { payOnline } from '@/lib/payment';
import { KEYS, loadRaw, saveJSON } from '@/lib/storage';
import {
  CONDITION_SHORT,
  formatINR,
  formatPhone,
  isValidPhone,
  normalizePhone,
  PAYMENT_METHOD_LABEL,
  placeOrderSchema,
  type Condition,
  type PaymentMethod,
  type ServiceabilityDTO,
} from '@/shared';
import { useCart } from '@/state/cart';
import { useSession } from '@/state/session';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';

type Label = 'HOME' | 'WORK' | 'SHOP';
interface Draft {
  name: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  label: Label;
  whatsappOptIn: boolean;
}
const EMPTY: Draft = { name: '', email: '', line1: '', line2: '', landmark: '', pincode: '', city: '', state: '', label: 'HOME', whatsappOptIn: true };

const METHODS: { value: PaymentMethod; icon: IconName; sub: string }[] = [
  { value: 'UPI', icon: 'qr-code-outline', sub: 'Google Pay, PhonePe, Paytm, BHIM — instant' },
  { value: 'CARD', icon: 'card-outline', sub: 'Visa, Mastercard, RuPay' },
  { value: 'NETBANKING', icon: 'business-outline', sub: 'All major Indian banks' },
  { value: 'COD', icon: 'cash-outline', sub: 'Pay cash or UPI to the courier' },
];

export default function Checkout() {
  const { colors } = useTheme();
  const { config } = useStoreConfig();
  const { cart, items, clear, setPincode } = useCart();
  const { session, signIn, rememberOrder } = useSession();

  const [d, setD] = useState<Draft>({ ...EMPTY, pincode: cart.pincode ?? '' });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const [phone, setPhone] = useState(session?.phone ?? '');
  const [gst, setGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod>(config.onlinePaymentsEnabled ? 'UPI' : 'COD');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Prefill from last checkout.
  useEffect(() => {
    loadRaw<Draft>(KEYS.checkoutDraft).then((saved) => {
      if (saved) setD((x) => ({ ...EMPTY, ...saved, pincode: x.pincode || saved.pincode }));
    });
  }, []);

  const verified = !!session && normalizePhone(phone) === session.phone;

  // Pincode serviceability (results are keyed by pincode so stale ones are ignored).
  const [areaRes, setAreaRes] = useState<{ pin: string; area: ServiceabilityDTO | null; err: string | null } | null>(null);
  const pinValid = /^[1-9]\d{5}$/.test(d.pincode);
  const area = pinValid && areaRes?.pin === d.pincode ? areaRes.area : null;
  const areaErr = pinValid && areaRes?.pin === d.pincode ? areaRes.err : null;
  useEffect(() => {
    if (!pinValid) return;
    const pin = d.pincode;
    let alive = true;
    api.store
      .serviceability(pin)
      .then((a) => {
        if (!alive) return;
        setAreaRes({ pin, area: a, err: a.serviceable ? null : 'Sorry, we don’t deliver to this pincode yet.' });
        setPincode(pin);
        setD((x) => ({ ...x, city: a.city ?? x.city, state: a.state ?? x.state }));
      })
      .catch((e) => alive && setAreaRes({ pin, area: null, err: errorMessage(e) }));
    return () => {
      alive = false;
    };
  }, [d.pincode, pinValid, setPincode]);

  // Live quote for the chosen payment method.
  const [lastQuoteCod, setLastQuoteCod] = useState<{ allowed: boolean; reason: string | null } | null>(null);
  // Fall back to prepaid when COD isn't allowed for this order.
  const method: PaymentMethod = chosenMethod === 'COD' && lastQuoteCod && !lastQuoteCod.allowed && config.onlinePaymentsEnabled ? 'UPI' : chosenMethod;
  const qKey = useDebounced(JSON.stringify({ items, c: cart.couponCode, m: method, p: area?.serviceable ? d.pincode : '' }), 200);
  const quote = useAsync(
    async () => {
      const r = await api.store.quote({ items, couponCode: cart.couponCode ?? '', paymentMethod: method, pincode: area?.serviceable ? d.pincode : '' });
      setLastQuoteCod({ allowed: r.codAllowed, reason: r.codBlockedReason });
      return r;
    },
    [qKey],
    { enabled: items.length > 0 },
  );
  const q = quote.data;
  const setMethod = setChosenMethod;

  const codDisabledReason = !config.codEnabled ? 'Cash on Delivery is paused right now' : q && !q.codAllowed ? q.codBlockedReason : null;

  const body = useMemo(
    () => ({
      name: d.name,
      email: d.email,
      address: { line1: d.line1, line2: d.line2, landmark: d.landmark, pincode: d.pincode, city: d.city, state: d.state, label: d.label },
      items,
      couponCode: cart.couponCode ?? '',
      paymentMethod: method,
      whatsappOptIn: d.whatsappOptIn,
      gstin: gst ? gstin : '',
      source: Platform.OS === 'ios' ? ('IOS' as const) : Platform.OS === 'android' ? ('ANDROID' as const) : ('WEB' as const),
    }),
    [d, items, cart.couponCode, method, gst, gstin],
  );

  if (items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Checkout' }} />
        <EmptyState icon="bag-handle-outline" title="Your bag is empty" body="Add a part to check out." action={<Button title="Shop parts" onPress={() => router.replace('/shop')} />} />
      </>
    );
  }

  const place = async () => {
    setPlaceError(null);
    const errs: Record<string, string> = {};
    if (!verified) errs.phone = 'Verify your mobile number to continue';
    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const k = i.path.join('.');
        if (!errs[k]) errs[k] = i.message;
      }
    }
    if (areaErr) errs['address.pincode'] = areaErr;
    setErrors(errs);
    if (Object.keys(errs).length) {
      setPlaceError('Please check the highlighted fields.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setPlacing(true);
    try {
      const res = await api.store.placeOrder(parsed.data!);
      saveJSON(KEYS.checkoutDraft, { ...d });
      rememberOrder({ orderNo: res.orderNo, phone: session!.phone, total: res.total, status: res.status });
      clear();
      if (res.paymentMethod === 'COD') {
        router.replace(`/confirmation/${res.orderNo}`);
        return;
      }
      const state = await payOnline(res.orderNo, session!.phone).catch(() => 'pending' as const);
      router.replace(`/confirmation/${res.orderNo}?pay=${state}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setErrors({ phone: 'Your verification expired. Please verify your number again.' });
      } else if (e instanceof ApiError && e.fields) {
        setErrors(e.fields);
      }
      setPlaceError(errorMessage(e));
    } finally {
      setPlacing(false);
    }
  };

  const ctaTitle = !q ? 'Place order' : method === 'COD' ? `Place order · ${formatINR(q.total)}` : `Pay ${formatINR(q.total)} securely`;

  return (
    <>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="lock-closed" size={13} color={colors.muted} />
            <Text variant="caption" color="muted">
              Secure checkout · No account needed
            </Text>
          </View>

          {/* 1. Contact */}
          <Step n={1} title="Contact" done={verified && d.name.trim().length >= 2}>
            <Input label="Full name" value={d.name} onChangeText={(t) => set('name', t)} autoComplete="name" textContentType="name" autoCapitalize="words" error={errors.name} placeholder="Rahul Sharma" />
            <PhoneVerify
              phone={phone}
              setPhone={setPhone}
              verified={verified}
              error={errors.phone}
              name={d.name}
              onVerified={(res) => {
                signIn({ token: res.token, phone: res.phone, name: res.customer?.name ?? (d.name || null), addresses: res.customer?.addresses ?? [] });
                setErrors((e) => ({ ...e, phone: '' }));
                const a = res.customer?.addresses?.[0];
                setD((x) => ({
                  ...x,
                  name: x.name || res.customer?.name || '',
                  ...(a && !x.line1 ? { line1: a.line1, line2: a.line2, landmark: a.landmark ?? '', pincode: a.pincode, city: a.city, state: a.state, label: a.label } : null),
                }));
                // Record the lead so the team can follow up if checkout is abandoned.
                api.store.saveLead({ name: d.name || undefined, items, pincode: d.pincode || undefined }).catch(() => {});
              }}
            />
            <Input label="Email (optional — for invoice)" value={d.email} onChangeText={(t) => set('email', t.trim())} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={errors.email} placeholder="you@example.com" />
            <Pressable onPress={() => set('whatsappOptIn', !d.whatsappOptIn)} accessibilityRole="checkbox" accessibilityState={{ checked: d.whatsappOptIn }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={d.whatsappOptIn ? 'checkbox' : 'square-outline'} size={22} color={d.whatsappOptIn ? colors.accent : colors.muted} />
              <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
              <Text variant="subhead">Send order updates on WhatsApp</Text>
            </Pressable>
          </Step>

          {/* 2. Address */}
          <Step n={2} title="Delivery address" done={!!area?.serviceable && d.line1.length >= 3 && d.line2.length >= 3}>
            <Input
              label="Pincode"
              value={d.pincode}
              onChangeText={(t) => set('pincode', t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="postal-code"
              textContentType="postalCode"
              placeholder="560034"
              error={errors['address.pincode'] || areaErr}
              hint={
                area?.serviceable ? (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <Ionicons name="checkmark" size={13} color={colors.success} />
                    <Text variant="footnote" color="success" style={{ flex: 1 }}>
                      {[`${area.city}, ${area.state}`, area.cod ? 'COD available' : 'Prepaid only', area.etaDate ? `Delivery by ${fmtShortWeekday(area.etaDate)}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ) : undefined
              }
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input containerStyle={{ flex: 1 }} label="City" value={d.city} onChangeText={(t) => set('city', t)} error={errors['address.city']} textContentType="addressCity" />
              <Input containerStyle={{ flex: 1 }} label="State" value={d.state} onChangeText={(t) => set('state', t)} error={errors['address.state']} textContentType="addressState" />
            </View>
            <Input label="Flat / House no. / Building" value={d.line1} onChangeText={(t) => set('line1', t)} error={errors['address.line1']} textContentType="streetAddressLine1" autoComplete="street-address" placeholder="Flat 402, Prestige Shantiniketan" />
            <Input label="Area / Street / Locality" value={d.line2} onChangeText={(t) => set('line2', t)} error={errors['address.line2']} textContentType="streetAddressLine2" placeholder="Whitefield Main Road, ITPL" />
            <Input label="Landmark (optional)" value={d.landmark} onChangeText={(t) => set('landmark', t)} placeholder="Near Phoenix Marketcity" />
            <View style={{ gap: 6 }}>
              <Text variant="footnote" color="muted" weight="500">
                Save as
              </Text>
              <Segmented<Label>
                value={d.label}
                onChange={(v) => set('label', v)}
                options={[
                  { value: 'HOME', label: 'Home', icon: 'home-outline' },
                  { value: 'WORK', label: 'Work', icon: 'business-outline' },
                  { value: 'SHOP', label: 'Shop', icon: 'construct-outline' },
                ]}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="subhead">I need a GST invoice</Text>
              <Switch value={gst} onValueChange={setGst} trackColor={{ true: colors.success, false: colors.line }} accessibilityLabel="I need a GST invoice" />
            </View>
            {gst && <Input label="GSTIN" value={gstin} onChangeText={(t) => setGstin(t.toUpperCase())} autoCapitalize="characters" maxLength={15} error={errors.gstin} placeholder="29ABCDE1234F1Z5" />}
          </Step>

          {/* 3. Payment */}
          <Step n={3} title="Payment" done={false}>
            <View style={{ gap: 10 }} accessibilityRole="radiogroup">
              {METHODS.filter((m) => m.value === 'COD' || config.onlinePaymentsEnabled).map((m) => {
                const disabled = m.value === 'COD' && !!codDisabledReason;
                const on = method === m.value;
                return (
                  <Pressable
                    key={m.value}
                    disabled={disabled}
                    onPress={() => setMethod(m.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled }}
                    accessibilityLabel={PAYMENT_METHOD_LABEL[m.value]}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderRadius: RADIUS.md,
                      borderWidth: on ? 2 : 1,
                      borderColor: on ? colors.accent : colors.line,
                      backgroundColor: on ? colors.accentSoft : colors.surface,
                      opacity: disabled ? 0.5 : 1,
                    }}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.accent : colors.subtle} />
                    <Ionicons name={m.icon} size={20} color={colors.fg} />
                    <View style={{ flex: 1 }}>
                      <Text variant="callout" weight="600">
                        {PAYMENT_METHOD_LABEL[m.value]}
                      </Text>
                      <Text variant="caption" color="muted">
                        {m.value === 'COD'
                          ? disabled
                            ? codDisabledReason
                            : `${m.sub}. ${formatINR(config.codFee)} fee · up to ${formatINR(config.codMaxOrder)}`
                          : m.sub}
                      </Text>
                    </View>
                    {m.value === 'COD' ? (
                      <View style={{ backgroundColor: colors.surface2, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text variant="caption" color="muted" weight="600">
                          +{formatINR(config.codFee)}
                        </Text>
                      </View>
                    ) : config.prepaidDiscountPct > 0 ? (
                      <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text variant="caption" color="danger" weight="600">
                          Extra {config.prepaidDiscountPct}% off
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {method === 'COD' && (
              <Notice tone="info">COD orders are confirmed by a quick call/WhatsApp from our team before dispatch.</Notice>
            )}
          </Step>

          {/* Summary */}
          <Card tone="muted" style={{ gap: 12 }}>
            <Text variant="title3">Your order</Text>
            {cart.lines.map((l) => (
              <View key={l.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ProductImage src={l.image} alt={l.title} tint={l.icon} style={{ width: 48 }} radius={10} padding={4} />
                <View style={{ flex: 1 }}>
                  <Text variant="footnote" weight="600" numberOfLines={1}>
                    {l.title}
                  </Text>
                  <Text variant="caption" color="muted">
                    Qty {l.qty} · {CONDITION_SHORT[l.condition as Condition] ?? l.condition}
                  </Text>
                </View>
                <Text variant="footnote" weight="600">
                  {formatINR(l.price * l.qty)}
                </Text>
              </View>
            ))}
            {quote.error ? (
              <Notice tone="danger">{quote.error}</Notice>
            ) : q ? (
              <>
                <QuoteSummary quote={q} />
                {q.couponError && cart.couponCode && <Notice tone="warning">{q.couponError}</Notice>}
                {method === 'COD' && q.prepaidTotal < q.total && (
                  <Pressable onPress={() => setMethod('UPI')} accessibilityRole="button">
                    <Notice tone="success" icon="flash-outline">
                      {`Pay by UPI instead and pay just ${formatINR(q.prepaidTotal)} (save ${formatINR(q.total - q.prepaidTotal)}).`}
                    </Notice>
                  </Pressable>
                )}
              </>
            ) : (
              <Skeleton height={80} />
            )}
          </Card>

          {[
            { i: 'shield-checkmark-outline' as const, t: 'Warranty on every part' },
            { i: 'refresh-outline' as const, t: '7-day returns if it doesn’t fit' },
            { i: 'lock-closed' as const, t: 'Payments secured by Razorpay' },
          ].map((r) => (
            <View key={r.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6 }}>
              <Ionicons name={r.i} size={14} color={colors.muted} />
              <Text variant="caption" color="muted">
                {r.t}
              </Text>
            </View>
          ))}
        </ScrollView>
        <BottomBar>
          {placeError && <Notice tone="danger">{placeError}</Notice>}
          <Button title={ctaTitle} icon="lock-closed" size="lg" full loading={placing} disabled={!q} onPress={place} />
          <Text variant="caption" color="muted" center>
            By placing the order you agree to our Terms of Sale & Returns Policy.
          </Text>
        </BottomBar>
      </KeyboardAvoidingView>
    </>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: done ? colors.success : colors.inverse, alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : (
            <Text variant="footnote" color="onInverse" weight="700">
              {n}
            </Text>
          )}
        </View>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function PhoneVerify({
  phone,
  setPhone,
  verified,
  error,
  onVerified,
}: {
  phone: string;
  setPhone: (p: string) => void;
  verified: boolean;
  error?: string;
  name: string;
  onVerified: (r: Awaited<ReturnType<typeof api.store.verifyOtp>>) => void;
}) {
  const { colors } = useTheme();
  const [stage, setStage] = useState<'idle' | 'sent'>('idle');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!isValidPhone(phone)) {
      setErr('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const r = await api.store.sendOtp(normalizePhone(phone));
      setDevCode(r.devCode);
      setStage('sent');
      setCode('');
      setCooldown(30);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (c = code) => {
    if (c.length !== 6) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await api.store.verifyOtp(normalizePhone(phone), c);
      setStage('idle');
      onVerified(r);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Input
        label="Mobile number"
        prefix="+91"
        value={phone}
        onChangeText={(t) => {
          setPhone(t.replace(/[^\d]/g, '').slice(0, 10));
          setStage('idle');
          setErr(null);
        }}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={10}
        placeholder="98765 43210"
        error={err ?? error ?? null}
        right={
          verified ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
              <Text variant="caption" color="success" weight="600">
                Verified
              </Text>
            </View>
          ) : stage === 'idle' ? (
            <Pressable onPress={send} disabled={busy} accessibilityRole="button" hitSlop={8}>
              <Text variant="subhead" color="accent" weight="600">
                {busy ? 'Sending…' : 'Send OTP'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {!verified && stage === 'sent' && (
        <View style={{ gap: 10 }}>
          <Text variant="footnote" color="muted">
            Enter the 6-digit code sent to {formatPhone(phone)}
          </Text>
          <OtpInput value={code} onChange={setCode} onComplete={verify} error={!!err} />
          {__DEV__ && devCode && (
            <Pressable
              onPress={() => {
                setCode(devCode);
                verify(devCode);
              }}
              accessibilityRole="button">
              <Text variant="caption" color="purple">
                Dev mode: code is {devCode} — tap to fill
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6} style={{ flex: 1 }} />
            <Button title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'} variant="ghost" disabled={cooldown > 0 || busy} onPress={send} />
          </View>
        </View>
      )}
    </View>
  );
}
