import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Share, View } from 'react-native';

import { OrderItems, PaymentPending } from '@/components/order-parts';
import { BottomBar, Button, Card, ErrorState, Gradient, Icon, Input, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { ApiError, formatINR, type OrderPublicDTO } from '@/shared';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function Confirmation() {
  const { orderNo: raw } = useLocalSearchParams<{ orderNo: string; pay?: string }>();
  const orderNo = decodeURIComponent(raw ?? '').toUpperCase();
  const { colors } = useTheme();
  const { phoneFor, session } = useSession();
  const phone = phoneFor(orderNo) ?? session?.phone ?? '';
  const res = useAsync(() => api.store.track(orderNo, phone), [orderNo, phone], { enabled: !!phone });
  const o = res.data;
  const [scale] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 5 }).start();
  }, [scale]);

  const online = o && o.paymentMethod !== 'COD';
  const unpaid = online && o.paymentStatus !== 'PAID';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: unpaid ? 'Payment pending' : 'Order placed' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
          <Animated.View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: unpaid ? colors.warningSoft : colors.successSoft,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale }],
            }}>
            <Ionicons name={unpaid ? 'time-outline' : 'checkmark-circle'} size={52} color={unpaid ? colors.warning : colors.success} />
          </Animated.View>
          <Text variant="title1" center accessibilityRole="header">
            {unpaid ? 'Almost there' : 'Order placed!'}
          </Text>
          <Text variant="subhead" color="muted" center style={{ maxWidth: 320 }}>
            {unpaid
              ? 'Your order is saved. Complete the payment to confirm it.'
              : !o
                ? 'We’ve sent the details on WhatsApp/SMS.' // don't claim a payment before the order has loaded
                : o.paymentMethod === 'COD'
                  ? `We’ll call or WhatsApp you shortly to confirm. Pay ${formatINR(o.totals.total)} on delivery.`
                  : 'Payment received. We’ve sent the details on WhatsApp/SMS.'}
          </Text>
          <Pressable
            onPress={() => Share.share({ message: `My Unibody order: ${orderNo}` }).catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel={`Order number ${orderNo}. Share`}
            style={{ backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="subhead" weight="600" selectable>
              Order #{orderNo}
            </Text>
            <Icon name="share-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {!phone ? (
          <ErrorState message="We couldn’t find this order on this device. Track it with your order number and phone." onRetry={() => router.replace('/track')} />
        ) : res.error && !o ? (
          <ErrorState message={res.error} onRetry={res.reload} />
        ) : !o ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={70} radius={18} />
            <Skeleton height={200} radius={18} />
          </View>
        ) : (
          <>
            <PaymentPending order={o} phone={phone} onChanged={res.refresh} />
            {o.etaDate && o.status !== 'CANCELLED' && (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="bicycle-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="footnote" color="muted">
                    Estimated delivery
                  </Text>
                  <Text variant="headline">{fmtWeekday(o.etaDate)}</Text>
                </View>
              </Card>
            )}
            <SaveDetails order={o} />
            <OrderItems order={o} />
          </>
        )}
      </ScrollView>
      <BottomBar>
        <Button title="Track order" icon="navigate-outline" size="lg" full onPress={() => router.replace(`/order/${encodeURIComponent(orderNo)}`)} />
        <Button title="Continue shopping" variant="ghost" full onPress={() => router.dismissTo('/')} />
      </BottomBar>
    </View>
  );
}

/** “₹200 off next time” — one tap saves the verified customer's details (M09). */
function SaveDetails({ order }: { order: OrderPublicDTO }) {
  const { colors } = useTheme();
  const { session, update } = useSession();
  const [name, setName] = useState(order.customerName);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [coupon, setCoupon] = useState<string | null | undefined>(undefined);
  if (!session || dismissed || (session.registered && coupon === undefined)) return null;

  if (coupon !== undefined) {
    return (
      <Card style={{ backgroundColor: colors.successSoft, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="summary">
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text variant="headline" style={{ color: colors.success }}>
            Details saved
          </Text>
        </View>
        <Text variant="subhead" color="muted">
          Next time checkout takes seconds.
        </Text>
        {coupon && (
          <Text variant="subhead" selectable>
            Use <Text variant="subhead" weight="700">{coupon}</Text> for ₹200 off your next order
          </Text>
        )}
      </Card>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = order.address;
      const r = await api.store.saveAccount({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        address: { line1: a.line1, line2: a.line2, landmark: a.landmark ?? '', pincode: a.pincode, city: a.city, state: a.state, label: a.label },
      });
      update({ registered: true, name: name.trim() || session.name });
      setCoupon(r.couponCode);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save right now');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Gradient name="aurora" style={{ borderRadius: 18, padding: 1.5 }}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 17, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gift-outline" size={22} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Get ₹200 off next time</Text>
            <Text variant="footnote" color="muted">
              Save your details with one tap — your number is already verified.
            </Text>
          </View>
        </View>
        <Input label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Input label="Email (optional)" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" error={error ?? undefined} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Save details" onPress={save} loading={busy} style={{ flex: 1 }} />
          <Button title="Not now" variant="ghost" onPress={() => setDismissed(true)} disabled={busy} />
        </View>
        <Text variant="caption" color="muted">
          Optional. We never share your details.
        </Text>
      </View>
    </Gradient>
  );
}
