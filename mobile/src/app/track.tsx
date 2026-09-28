import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, FormScroll, Input, Text } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { trackSchema } from '@/shared';
import { useSession } from '@/state/session';

export default function Track() {
  const { session, rememberOrder } = useSession();
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState(session?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = trackSchema.safeParse({ orderNo, phone });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (e[String(i.path[0])] = i.path[0] === 'orderNo' ? 'Enter your order number, e.g. UB-260927-1042' : i.message));
      setErrors(e);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const o = await api.store.track(parsed.data.orderNo, parsed.data.phone);
      rememberOrder({ orderNo: o.orderNo, phone: parsed.data.phone, total: o.totals.total, status: o.status });
      router.replace(`/order/${encodeURIComponent(o.orderNo)}?phone=${parsed.data.phone}`);
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScroll contentStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 4 }}>
        <Text variant="title1" accessibilityRole="header">
          Track your order
        </Text>
        <Text variant="subhead" color="muted">
          No login needed — just your order number and mobile.
        </Text>
      </View>
      <Input label="Order number" placeholder="UB-260927-1042" value={orderNo} onChangeText={(t) => setOrderNo(t.toUpperCase().trim())} autoCapitalize="characters" autoCorrect={false} error={errors.orderNo} returnKeyType="next" />
      <Input label="Mobile number" prefix="+91" placeholder="98765 43210" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} error={errors.phone} onSubmitEditing={submit} />
      {errors.form && (
        <Text variant="footnote" color="danger">
          {errors.form}
        </Text>
      )}
      <Button title="Track" variant="dark" size="lg" full loading={busy} onPress={submit} />
    </FormScroll>
  );
}
