import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, ScrollView, View } from 'react-native';

import { OrderItems, PaymentPending } from '@/components/order-parts';
import { BottomBar, Button, Card, ErrorState, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { formatINR } from '@/shared';
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
          <View style={{ backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginTop: 4 }}>
            <Text variant="subhead" weight="600" selectable>
              Order #{orderNo}
            </Text>
          </View>
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
