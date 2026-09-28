import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { QuoteSummary } from '@/components/summary';
import { BottomBar, Button, Card, ConditionBadge, EmptyState, Input, Notice, ProductImage, QtyStepper, Screen, Skeleton, Text } from '@/components/ui';
import { useAsync, useDebounced } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { formatINR, type CartLine } from '@/shared';
import { useCart } from '@/state/cart';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';

export default function Bag() {
  const { colors } = useTheme();
  const { config } = useStoreConfig();
  const { cart, items, count, setQty, remove, setCoupon } = useCart();
  const [code, setCode] = useState(cart.couponCode ?? '');

  // Debounce so rapid qty taps produce one quote request.
  const key = useDebounced(JSON.stringify({ items, c: cart.couponCode, p: cart.pincode }), 250);
  const quote = useAsync(
    () => api.store.quote({ items, couponCode: cart.couponCode ?? '', pincode: cart.pincode ?? '' }),
    [key],
    { enabled: items.length > 0 },
  );
  const q = quote.data;
  const unavailable = new Map((q?.unavailable ?? []).map((u) => [u.productId, u.reason]));
  const serverPrice = new Map((q?.lines ?? []).map((l) => [l.productId, l.unitPrice]));

  if (cart.lines.length === 0) {
    return (
      <Screen edges={['top']}>
        <Text variant="title1" style={{ paddingHorizontal: 16, marginTop: 16 }} accessibilityRole="header">
          Bag
        </Text>
        <EmptyState
          icon="bag-handle-outline"
          title="Your bag is empty"
          body="Find the exact part for your device — pay on delivery in 6 cities."
          action={<Button title="Shop parts" onPress={() => router.push('/shop')} />}
        />
      </Screen>
    );
  }

  const applyCoupon = () => setCoupon(code.trim() ? code.trim().toUpperCase() : null);
  const couponApplied = !!q?.couponCode && q.couponCode === cart.couponCode;
  const prepaidSave = q ? q.total - q.prepaidTotal : 0;
  const freeShipGap = q && q.shipping > 0 ? config.freeShippingOver - (q.subtotal - q.couponDiscount) : 0;

  return (
    <Screen edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={quote.refreshing} onRefresh={quote.refresh} />}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
          <Text variant="title1" accessibilityRole="header">
            Bag
          </Text>
          <Text variant="subhead" color="muted">
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {unavailable.size > 0 && (
          <Notice tone="warning">
            <Text variant="footnote" color="warning">
              Some items are no longer available. Remove them to check out.
            </Text>
            <Pressable onPress={() => unavailable.forEach((_, id) => remove(id))} accessibilityRole="button" style={{ marginTop: 6 }}>
              <Text variant="footnote" color="accent" weight="600">
                Remove unavailable items
              </Text>
            </Pressable>
          </Notice>
        )}

        <Card padded={false}>
          {cart.lines.map((l, i) => (
            <BagLine
              key={l.productId}
              line={l}
              first={i === 0}
              price={serverPrice.get(l.productId) ?? l.price}
              unavailable={unavailable.get(l.productId)}
              onQty={(n) => setQty(l.productId, n)}
              onRemove={() => remove(l.productId)}
            />
          ))}
        </Card>

        {/* Coupon */}
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Input
              containerStyle={{ flex: 1 }}
              placeholder="Coupon code"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/\s/g, ''))}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={applyCoupon}
              returnKeyType="done"
              accessibilityLabel="Coupon code"
              right={couponApplied ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : <Ionicons name="pricetag-outline" size={18} color={colors.subtle} />}
              error={cart.couponCode && q?.couponError ? q.couponError : null}
              hint={couponApplied ? `${q!.couponCode} applied — you save ${formatINR(q!.couponDiscount)}` : undefined}
            />
            {cart.couponCode ? (
              <Button
                title="Remove"
                variant="secondary"
                onPress={() => {
                  setCoupon(null);
                  setCode('');
                }}
                style={{ minHeight: 48 }}
              />
            ) : (
              <Button title="Apply" variant="dark" onPress={applyCoupon} disabled={!code.trim()} style={{ minHeight: 48 }} />
            )}
          </View>
          {!cart.couponCode && config.banner && (
            <Pressable
              onPress={() => {
                setCode(config.banner!.code);
                setCoupon(config.banner!.code);
              }}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={14} color={colors.purple} />
              <Text variant="footnote" color="purple" weight="500" style={{ flex: 1 }}>
                Tap to use {config.banner.code} — {config.banner.title.replace(/\.$/, '')}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* Summary */}
        <Card style={{ gap: 12 }}>
          <Text variant="title3">Order summary</Text>
          {quote.error ? (
            <Notice tone="danger">
              <Text variant="footnote" color="danger">
                {quote.error}
              </Text>
              <Pressable onPress={quote.reload} style={{ marginTop: 4 }}>
                <Text variant="footnote" color="accent" weight="600">
                  Retry
                </Text>
              </Pressable>
            </Notice>
          ) : !q ? (
            <View style={{ gap: 8 }}>
              <Skeleton height={16} />
              <Skeleton height={16} width="70%" />
              <Skeleton height={22} width="50%" />
            </View>
          ) : (
            <QuoteSummary quote={q} />
          )}
          {freeShipGap > 0 && (
            <Notice tone="info" icon="bicycle-outline">
              {`Add ${formatINR(freeShipGap)} more for free delivery.`}
            </Notice>
          )}
          {prepaidSave > 0 && (
            <Notice tone="success" icon="flash-outline">
              {`Pay online at checkout and save ${formatINR(prepaidSave)} more (${config.prepaidDiscountPct}% prepaid discount).`}
            </Notice>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Genuine & graded', 'Warranty on every part', 'COD in 6 cities'].map((t) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} />
              <Text variant="caption" color="muted">
                {t}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomBar>
        <Button
          title={q ? `Checkout · ${formatINR(q.total)}` : 'Checkout'}
          icon="lock-closed"
          size="lg"
          full
          disabled={!q || unavailable.size > 0 || q.itemCount === 0}
          loading={quote.loading && !q}
          onPress={() => router.push('/checkout')}
        />
      </BottomBar>
    </Screen>
  );
}

function BagLine({
  line,
  first,
  price,
  unavailable,
  onQty,
  onRemove,
}: {
  line: CartLine;
  first: boolean;
  price: number;
  unavailable?: string;
  onQty: (n: number) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.lineSubtle, opacity: unavailable ? 0.6 : 1 }}>
      <Pressable onPress={() => router.push(`/product/${line.slug}`)} accessibilityRole="link" accessibilityLabel={line.title}>
        <ProductImage src={line.image} alt={line.title} tint={line.icon} style={{ width: 84 }} radius={RADIUS.md} padding={8} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="subhead" weight="600" numberOfLines={2}>
          {line.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <ConditionBadge condition={line.condition} />
        </View>
        {unavailable ? (
          <Text variant="caption" color="danger" weight="600">
            {unavailable}
          </Text>
        ) : (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {line.fitsLabel}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <QtyStepper compact value={line.qty} min={0} max={line.maxQty || 10} onChange={onQty} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="headline">{formatINR(price * line.qty)}</Text>
            {line.qty > 1 && (
              <Text variant="caption" color="muted">
                {formatINR(price)} each
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${line.title}`} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
          <Text variant="caption" color="danger" weight="500">
            Remove
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
