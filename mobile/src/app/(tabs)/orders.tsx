import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { OtpInput } from '@/components/otp-input';
import { Button, Card, ErrorState, Input, ListRow, Screen, Skeleton, StatusBadge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api, ApiError, errorMessage } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { formatINR, formatPhone, isValidPhone, normalizePhone, type OrderPublicDTO, type OrderStatus } from '@/shared';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';

export default function Orders() {
  const { colors } = useTheme();
  const { session, signOut, recentOrders, forgetOrder } = useSession();
  const mine = useAsync(() => api.store.myOrders(), [session?.token], { enabled: !!session });

  // Token expired on the server → drop it locally.
  useEffect(() => {
    if (mine.error && session && /unauth|expired|token|sign in|verify/i.test(mine.error)) signOut();
  }, [mine.error, session, signOut]);

  const myNos = new Set((mine.data ?? []).map((o) => o.orderNo));
  const others = recentOrders.filter((r) => !myNos.has(r.orderNo) && (!session || r.phone !== session.phone || !mine.data));

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={mine.refreshing} onRefresh={mine.refresh} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text variant="title1" accessibilityRole="header">
            Orders
          </Text>
          <Pressable onPress={() => router.push('/more')} accessibilityRole="button" accessibilityLabel="Help and settings" hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={18} color={colors.fg} />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/track')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: RADIUS.card, backgroundColor: colors.accentSoft }}>
          <Ionicons name="navigate-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">Track an order</Text>
            <Text variant="footnote" color="muted">
              Order number + mobile. No login needed.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {session ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title3">My orders</Text>
              <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
                <Text variant="footnote" color="accent" weight="600">
                  Sign out {formatPhone(session.phone)}
                </Text>
              </Pressable>
            </View>
            {mine.error ? (
              <ErrorState message={mine.error} onRetry={mine.reload} />
            ) : mine.loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} height={88} radius={18} />)
            ) : (mine.data ?? []).length === 0 ? (
              <Card tone="muted">
                <Text variant="subhead" color="muted">
                  No orders on this number yet.
                </Text>
              </Card>
            ) : (
              (mine.data ?? []).map((o) => <OrderRow key={o.orderNo} order={o} phone={session.phone} />)
            )}
          </View>
        ) : (
          <SignInCard />
        )}

        {others.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text variant="title3">Recently viewed on this device</Text>
            <Card padded={false}>
              {others.map((r, i) => (
                <View key={r.orderNo} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.lineSubtle }}>
                  <ListRow
                    icon="cube-outline"
                    iconBg={colors.accentSoft}
                    iconColor={colors.accent}
                    title={`#${r.orderNo}`}
                    subtitle={[r.total ? formatINR(r.total) : null, formatPhone(r.phone), fmtDate(new Date(r.at).toISOString())].filter(Boolean).join(' · ')}
                    onPress={() => router.push(`/order/${encodeURIComponent(r.orderNo)}?phone=${r.phone}`)}
                    right={
                      <Pressable onPress={() => forgetOrder(r.orderNo)} accessibilityRole="button" accessibilityLabel={`Remove ${r.orderNo} from this list`} hitSlop={8}>
                        <Ionicons name="close" size={16} color={colors.subtle} />
                      </Pressable>
                    }
                  />
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function OrderRow({ order, phone }: { order: OrderPublicDTO; phone: string }) {
  const { colors, scheme } = useTheme();
  const first = order.items[0];
  return (
    <Pressable
      onPress={() => router.push(`/order/${encodeURIComponent(order.orderNo)}?phone=${phone}`)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNo}, ${order.status}, ${formatINR(order.totals.total)}`}
      style={({ pressed }) => ({ padding: 14, gap: 8, borderRadius: RADIUS.card, backgroundColor: colors.surface, borderWidth: scheme === 'dark' ? 0 : 1, borderColor: colors.lineSubtle, boxShadow: colors.shadow, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="subhead" weight="600">
          #{order.orderNo}
        </Text>
        <StatusBadge status={order.status as OrderStatus} />
      </View>
      <Text variant="footnote" color="muted" numberOfLines={1}>
        {first ? first.title : ''}
        {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="muted">
          {fmtDate(order.createdAt)}
        </Text>
        <Text variant="subhead" weight="600">
          {formatINR(order.totals.total)}
        </Text>
      </View>
    </Pressable>
  );
}

function SignInCard() {
  const { signIn } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!isValidPhone(phone)) return setErr('Enter a valid 10-digit mobile number');
    setBusy(true);
    setErr(null);
    try {
      const r = await api.store.sendOtp(normalizePhone(phone));
      setDevCode(r.devCode);
      setSent(true);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async (c = code) => {
    if (c.length !== 6) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.store.verifyOtp(normalizePhone(phone), c);
      signIn({ token: r.token, phone: r.phone, name: r.customer?.name ?? null, addresses: r.customer?.addresses ?? [] });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="title3">See all your orders</Text>
      <Text variant="footnote" color="muted">
        Verify your mobile number with a one-time code. No password, no account.
      </Text>
      {!sent ? (
        <>
          <Input prefix="+91" placeholder="98765 43210" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} error={err} accessibilityLabel="Mobile number" onSubmitEditing={send} />
          <Button title="Send code" onPress={send} loading={busy} full />
        </>
      ) : (
        <>
          <Text variant="footnote" color="muted">
            Code sent to {formatPhone(phone)}
          </Text>
          <OtpInput value={code} onChange={setCode} onComplete={verify} error={!!err} />
          {err && (
            <Text variant="footnote" color="danger">
              {err}
            </Text>
          )}
          {__DEV__ && devCode && (
            <Pressable onPress={() => { setCode(devCode); verify(devCode); }}>
              <Text variant="caption" color="purple">
                Dev mode: code is {devCode} — tap to fill
              </Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6} style={{ flex: 1 }} />
            <Button title="Change number" variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </View>
        </>
      )}
    </Card>
  );
}
