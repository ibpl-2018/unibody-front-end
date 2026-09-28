import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { haptic, ProductCard, shortFits } from '@/components/product-card';
import { BottomBar, Button, Card, ConditionBadge, Badge, ErrorState, Input, Notice, Price, ProductImage, QtyStepper, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api, errorMessage } from '@/lib/api';
import { fmtShortWeekday } from '@/lib/format';
import {
  COLOUR_HEX,
  CONDITION_DESCRIPTION,
  CONDITION_SHORT,
  formatINR,
  pincodeSchema,
  type Condition,
  type ProductCardDTO,
  type ProductDetailDTO,
  type ServiceabilityDTO,
} from '@/shared';
import { useCart } from '@/state/cart';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { width: w } = useWindowDimensions();
  const width = Math.min(w, 720);
  const { config } = useStoreConfig();
  const { add, cart } = useCart();
  const res = useAsync(() => api.store.product(slug), [slug]);
  const p = res.data;
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);

  // Reset per-product UI state when navigating between variants.
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setQty(1);
    setImgIdx(0);
  }

  if (res.error && !p) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <ErrorState message={res.error} onRetry={res.reload} />
      </>
    );
  }

  if (!p) {
    return (
      <View style={{ padding: 16, gap: 14, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Skeleton height={width - 32} radius={24} />
        <Skeleton width={120} height={20} />
        <Skeleton width="90%" height={28} />
        <Skeleton width={140} height={32} />
        <Skeleton height={80} radius={16} />
      </View>
    );
  }

  const images = p.images.length ? p.images : p.image ? [p.image] : [];
  const out = p.stock <= 0;
  const inBag = cart.lines.find((l) => l.productId === p.id)?.qty ?? 0;
  const maxQty = Math.max(1, Math.min(p.stock, 10) - inBag);

  const addToBag = () => {
    haptic();
    add(p, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
    if (i !== imgIdx) setImgIdx(i);
  };

  return (
    <>
      <Stack.Screen options={{ title: p.categoryName }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={res.refreshing} onRefresh={res.refresh} />}>
        {/* Gallery */}
        <View style={{ margin: 16, marginBottom: 8 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ borderRadius: 24 }}>
            {(images.length ? images : [null]).map((src, i) => (
              <ProductImage key={i} src={src} alt={`${p.title} photo ${i + 1}`} tint={p.icon} style={{ width: width - 32 }} radius={24} aspect={1.05} padding="8%" />
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, boxShadow: colors.shadow }}>
            <Ionicons name="camera-outline" size={13} color={colors.fg} />
            <Text variant="caption" weight="500">
              {p.condition === 'COMPATIBLE_NEW' ? 'Studio render' : 'Real photos of your unit'}
            </Text>
          </View>
          {images.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
              {images.map((_, i) => (
                <View key={i} style={{ width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === imgIdx ? colors.fg : colors.line }} />
              ))}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {/* Title block */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <ConditionBadge condition={p.condition} long />
              <Badge label={out ? 'Out of stock' : p.stock <= 2 ? `Only ${p.stock} left` : `${p.stock} in stock`} tone={out ? 'danger' : p.stock <= 2 ? 'warning' : 'neutral'} />
            </View>
            <Text variant="title1" accessibilityRole="header">
              {p.title}
            </Text>
            <Text variant="footnote" color="muted">
              {[p.colour, p.partNumber ? `Part no. ${p.partNumber}` : null, `SKU ${p.sku}`].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <View style={{ gap: 4 }}>
            <Price price={p.price} mrp={p.mrp} size="xl" showOff />
            <Text variant="footnote" color="muted">
              Inclusive of GST · {p.price >= config.freeShippingOver ? 'Free delivery' : `Free delivery over ${formatINR(config.freeShippingOver)}`}
            </Text>
          </View>

          {config.banner && (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 }}>
              <Ionicons name="pricetag-outline" size={13} color={colors.danger} />
              <Text variant="caption" color="danger" weight="500">
                {config.banner.code} — {config.banner.title.replace(/\.$/, '')}
              </Text>
            </View>
          )}

          <Variants product={p} />

          <Card tone="muted" style={{ gap: 4 }}>
            <Text variant="subhead" weight="600">
              {CONDITION_SHORT[p.condition as Condition]} — what it means
            </Text>
            <Text variant="footnote" color="muted">
              {CONDITION_DESCRIPTION[p.condition as Condition]}
            </Text>
          </Card>

          <FitCheck product={p} />
          <DeliveryCheck productCod={p.codAllowed} />

          {/* Qty + CTAs (inline; sticky bar below mirrors it) */}
          {!out && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text variant="subhead" color="muted">
                Quantity
              </Text>
              <QtyStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} />
              {inBag > 0 && (
                <Text variant="footnote" color="muted">
                  {inBag} in bag
                </Text>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: 'shield-checkmark-outline' as const, bg: colors.success, t: `${p.warrantyDays}-day warranty` },
              { icon: 'refresh-outline' as const, bg: colors.accent, t: '7-day returns' },
              { icon: 'checkmark-circle' as const, bg: colors.purple, t: 'Bench-tested' },
            ].map((c) => (
              <View key={c.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 12, backgroundColor: colors.surface2 }}>
                <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={c.icon} size={14} color="#fff" />
                </View>
                <Text variant="caption" weight="500">
                  {c.t}
                </Text>
              </View>
            ))}
          </View>

          {!!p.description && (
            <View style={{ gap: 6 }}>
              <Text variant="title3">About this part</Text>
              <Text variant="callout" color="muted">
                {p.description}
              </Text>
            </View>
          )}

          {p.compatible.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text variant="title3">Works with these models</Text>
              <Card padded={false}>
                {p.compatible.map((m, i) => (
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.lineSubtle }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" weight="600">
                        {m.fullName}
                      </Text>
                      <Text variant="caption" color="muted">
                        {[m.yearLabel, m.aNumbers.join(' / '), m.emc ? `EMC ${m.emc}` : null, m.chip].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}
        </View>

        {p.related.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title="Often bought together" style={{ paddingHorizontal: 16 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
              {p.related.map((r) => (
                <ProductCard key={r.id} product={r} width={Math.min(180, (width - 44) / 2)} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <BottomBar>
        {added && (
          <Notice tone="success" icon="checkmark-circle">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="footnote" color="success" weight="600">
                Added to your bag
              </Text>
              <Pressable onPress={() => router.push('/bag')} accessibilityRole="link" hitSlop={8}>
                <Text variant="footnote" color="accent" weight="600">
                  View bag ›
                </Text>
              </Pressable>
            </View>
          </Notice>
        )}
        {out ? (
          <Button title="Out of stock — ask on WhatsApp" variant="secondary" icon="logo-whatsapp" onPress={() => router.push('/more')} full />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Add to Bag" icon="bag-handle-outline" onPress={addToBag} style={{ flex: 1 }} disabled={maxQty <= 0 || inBag >= Math.min(p.stock, 10)} />
            <Button
              title="Buy now"
              variant="dark"
              onPress={() => {
                if (!inBag) add(p, qty);
                router.push('/checkout');
              }}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </BottomBar>
    </>
  );
}

function Variants({ product }: { product: ProductDetailDTO }) {
  const { colors } = useTheme();
  const all: ProductCardDTO[] = [product, ...product.variants.filter((v) => v.id !== product.id)];
  if (all.length < 2) return null;
  const colours = [...new Set(all.map((v) => v.colour).filter((c): c is string => !!c))];
  const sameColour = all.filter((v) => (v.colour ?? null) === (product.colour ?? null));
  const conditions = sameColour.length > 1 ? sameColour : [];
  const go = (v: ProductCardDTO) => v.id !== product.id && router.replace(`/product/${v.slug}`);

  return (
    <View style={{ gap: 16 }}>
      {colours.length > 1 && (
        <View style={{ gap: 8 }}>
          <Text variant="subhead" weight="600">
            Finish — {product.colour}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {colours.map((c) => {
              const target = all.find((v) => v.colour === c && v.condition === product.condition) ?? all.find((v) => v.colour === c)!;
              const on = c === product.colour;
              return (
                <Pressable
                  key={c}
                  onPress={() => go(target)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Finish ${c}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.line }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: COLOUR_HEX[c] ?? colors.line, borderWidth: 1, borderColor: colors.line }} />
                  <Text variant="footnote" weight="500">
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      {conditions.length > 1 && (
        <View style={{ gap: 8 }}>
          <Text variant="subhead" weight="600">
            Condition
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {conditions.map((v) => {
              const on = v.id === product.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => go(v)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${CONDITION_SHORT[v.condition]}, ${formatINR(v.price)}`}
                  style={{ width: 120, padding: 12, gap: 6, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface }}>
                  <ConditionBadge condition={v.condition} />
                  <Text variant="headline">{formatINR(v.price)}</Text>
                  <Text variant="caption" color="muted">
                    {v.stock <= 0 ? 'Out of stock' : v.stock === 1 ? '1 left' : `${v.stock} in stock`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function FitCheck({ product }: { product: ProductDetailDTO }) {
  const { colors } = useTheme();
  const { myDevice, setMyDevice } = useCart();
  const [editing, setEditing] = useState(!myDevice);
  const [aNum, setANum] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ fits: boolean; message: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mineFits = myDevice ? product.modelIds.includes(myDevice.id) : null;

  const check = async () => {
    const a = aNum.trim().toUpperCase();
    if (!/^A\d{4}$/.test(a)) {
      setErr('Enter a model number like A2337');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const r = await api.store.checkFit(product.id, a);
      setResult({ fits: r.fits, message: r.message });
      if (r.model) {
        setMyDevice(r.model);
        setEditing(false);
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (myDevice && !editing) {
    const ok = mineFits;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: ok ? colors.successSoft : colors.dangerSoft }}>
        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={24} color={ok ? colors.success : colors.danger} />
        <View style={{ flex: 1 }}>
          <Text variant="subhead" weight="600" color={ok ? 'success' : 'danger'}>
            {ok ? `Fits your ${myDevice.fullName}` : `Doesn’t fit your ${myDevice.fullName}`}
          </Text>
          <Text variant="caption" color="muted">
            {ok ? `Checked against ${myDevice.aNumbers.join(' / ')}` : `This part fits: ${shortFits(product)}`}
          </Text>
        </View>
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" hitSlop={8}>
          <Text variant="footnote" color="accent" weight="600">
            Change
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="laptop-outline" size={18} color={colors.accent} />
        <Text variant="subhead" weight="600">
          Will it fit my device?
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Input
          containerStyle={{ flex: 1 }}
          placeholder="A-number, e.g. A2337"
          value={aNum}
          onChangeText={(t) => {
            setANum(t.toUpperCase());
            setResult(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          onSubmitEditing={check}
          returnKeyType="done"
          error={err}
          accessibilityLabel="Your model A-number"
        />
        <Button title="Check" variant="dark" onPress={check} loading={busy} style={{ minHeight: 48 }} />
      </View>
      {result && <Notice tone={result.fits ? 'success' : 'danger'}>{result.message}</Notice>}
      <Text variant="caption" color="muted">
        Find the A-number on the bottom case of your Mac, or in the SIM tray / Settings on iPhone & iPad.
      </Text>
    </Card>
  );
}

function DeliveryCheck({ productCod }: { productCod: boolean }) {
  const { colors } = useTheme();
  const { config } = useStoreConfig();
  const { cart, setPincode } = useCart();
  const [pin, setPin] = useState(cart.pincode ?? '');
  const [editing, setEditing] = useState(!cart.pincode);
  const [area, setArea] = useState<ServiceabilityDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async (value = pin) => {
    const v = pincodeSchema.safeParse(value);
    if (!v.success) {
      setErr(v.error.issues[0]?.message ?? 'Enter a valid pincode');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const a = await api.store.serviceability(v.data);
      setArea(a);
      setPincode(v.data);
      setEditing(false);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off check of the saved pincode
    if (cart.pincode && !area) check(cart.pincode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editing && area) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: colors.line }}>
        <Ionicons name="location-outline" size={20} color={colors.muted} />
        <View style={{ flex: 1 }}>
          <Text variant="subhead" weight="600">
            Deliver to {area.pincode}
            {area.city ? ` · ${area.city}` : ''}
          </Text>
          {area.serviceable ? (
            <Text variant="caption" color="success">
              {area.etaDate ? `Arrives ${fmtShortWeekday(area.etaDate)}` : `Arrives in ${area.etaDays ?? 3} days`}
              {area.cod && productCod && config.codEnabled ? ` · Cash on Delivery available (+${formatINR(config.codFee)})` : ' · Prepaid only'}
            </Text>
          ) : (
            <Text variant="caption" color="danger">
              We don’t deliver here yet
            </Text>
          )}
        </View>
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" hitSlop={8}>
          <Text variant="footnote" color="accent" weight="600">
            Change
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Input
        containerStyle={{ flex: 1 }}
        placeholder="Delivery pincode"
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        onSubmitEditing={() => check()}
        error={err}
        accessibilityLabel="Delivery pincode"
        right={<Ionicons name="location-outline" size={18} color={colors.subtle} />}
      />
      <Button title="Check" variant="secondary" onPress={() => check()} loading={busy} style={{ minHeight: 48 }} />
    </View>
  );
}
