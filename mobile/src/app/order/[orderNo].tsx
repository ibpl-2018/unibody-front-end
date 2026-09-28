import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { HelpCard, OrderItems, OrderTimeline, PaymentPending } from '@/components/order-parts';
import { Button, Card, ErrorState, Input, Skeleton, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { fmtDateTime, fmtWeekday } from '@/lib/format';
import { isValidPhone, normalizePhone, STATUS_LABEL, type OrderPublicDTO } from '@/shared';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

const POLL_MS = 15_000;

export default function OrderScreen() {
  const params = useLocalSearchParams<{ orderNo: string; phone?: string }>();
  const orderNo = decodeURIComponent(params.orderNo ?? '').toUpperCase();
  const { phoneFor, session, rememberOrder } = useSession();
  const [phone, setPhone] = useState<string | null>(() => (params.phone ? normalizePhone(params.phone) : null) ?? phoneFor(orderNo) ?? session?.phone ?? null);

  if (!phone) return <PhonePrompt orderNo={orderNo} onPhone={setPhone} />;
  return <OrderDetail key={`${orderNo}-${phone}`} orderNo={orderNo} phone={phone} onWrongPhone={() => setPhone(null)} remember={rememberOrder} />;
}

function OrderDetail({ orderNo, phone, onWrongPhone, remember }: { orderNo: string; phone: string; onWrongPhone: () => void; remember: ReturnType<typeof useSession>['rememberOrder'] }) {
  const { colors, scheme } = useTheme();
  const res = useAsync(() => api.store.track(orderNo, phone), [orderNo, phone]);
  const o = res.data;
  useEffect(() => {
    if (o) {
      remember({ orderNo: o.orderNo, phone, total: o.totals.total, status: o.status });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o?.status, o?.paymentStatus, o?.events.length]);

  // Live updates: poll while this screen is focused and the order is still moving.
  const live = !!o && !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status);
  useFocusEffect(
    useCallback(() => {
      if (!live) return;
      const t = setInterval(() => {
        res.refresh().catch(() => {});
      }, POLL_MS);
      return () => clearInterval(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live, orderNo, phone]),
  );

  if (res.error && !o) {
    const notFound = /not found|no order/i.test(res.error);
    return (
      <>
        <Stack.Screen options={{ title: orderNo }} />
        <ErrorState message={notFound ? `We couldn’t find ${orderNo} for this mobile number.` : res.error} onRetry={res.reload} />
        {notFound && <Button title="Use a different number" variant="ghost" onPress={onWrongPhone} style={{ alignSelf: 'center' }} />}
      </>
    );
  }

  if (!o) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <Skeleton height={170} radius={24} />
        <Skeleton height={260} radius={18} />
        <Skeleton height={160} radius={18} />
      </View>
    );
  }

  const headline =
    o.status === 'DELIVERED'
      ? 'Delivered'
      : o.status === 'CANCELLED'
        ? 'Order cancelled'
        : o.status === 'RETURNED'
          ? 'Returned'
          : o.status === 'OUT_FOR_DELIVERY'
            ? 'Arriving today'
            : o.etaDate
              ? `Arriving ${fmtWeekday(o.etaDate)}`
              : STATUS_LABEL[o.status];
  const gradient = scheme === 'dark' ? (['#1a1730', '#0f2519'] as const) : (['#f0edff', '#e7f8ee'] as const);

  return (
    <>
      <Stack.Screen options={{ title: `#${o.orderNo}` }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={res.refreshing} onRefresh={res.refresh} />}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={o.status} />
            {live && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }} accessibilityLabel="Live updates on">
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
                <Text variant="caption" weight="600">
                  Live
                </Text>
              </View>
            )}
          </View>
          <Text variant="title1" accessibilityRole="header">
            {headline}
          </Text>
          {o.shipment && (
            <Text variant="footnote" color="muted">
              {o.shipment.courier} · AWB {o.shipment.awb}
            </Text>
          )}
          <Text variant="footnote" color="muted">
            Order #{o.orderNo} · Placed {fmtDateTime(o.createdAt)}
          </Text>
          {o.shipment?.trackingUrl && (
            <Pressable onPress={() => Linking.openURL(o.shipment!.trackingUrl!).catch(() => {})} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text variant="footnote" color="accent" weight="600">
                Track with {o.shipment.courier}
              </Text>
              <Ionicons name="open-outline" size={13} color={colors.accent} />
            </Pressable>
          )}
        </LinearGradient>

        <PaymentPending order={o} phone={phone} onChanged={res.refresh} />

        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title3">Updates</Text>
            {live && (
              <Text variant="caption" color="muted">
                Auto-refreshing
              </Text>
            )}
          </View>
          <OrderTimeline order={o} />
        </Card>

        <OrderItems order={o} />
        <HelpCard order={o} phone={phone} onCancelled={(n: OrderPublicDTO) => res.setData(n)} />
        <Button title="Continue shopping" variant="ghost" onPress={() => router.navigate('/')} style={{ alignSelf: 'center' }} />
      </ScrollView>
    </>
  );
}

function PhonePrompt({ orderNo, onPhone }: { orderNo: string; onPhone: (p: string) => void }) {
  const [p, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    if (!isValidPhone(p)) return setErr('Enter the 10-digit mobile number used for this order');
    onPhone(normalizePhone(p));
  };
  return (
    <View style={{ padding: 16, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: orderNo }} />
      <Text variant="title2">Confirm your number</Text>
      <Text variant="subhead" color="muted">
        To see order {orderNo}, enter the mobile number used when ordering.
      </Text>
      <Input label="Mobile number" prefix="+91" keyboardType="phone-pad" maxLength={10} value={p} onChangeText={(t) => setP(t.replace(/\D/g, ''))} error={err} autoFocus onSubmitEditing={submit} />
      <Button title="View order" onPress={submit} full />
    </View>
  );
}
