import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Divider, ListRow, Segmented, Text } from '@/components/ui';
import { WEB_URL } from '@/lib/config';
import { formatINR } from '@/shared';
import { useCart } from '@/state/cart';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';

export default function More() {
  const { colors, preference, setPreference } = useTheme();
  const { config } = useStoreConfig();
  const { myDevice, setMyDevice } = useCart();
  const [open, setOpen] = useState<string | null>(null);

  const cityList = config.cities.map((c) => `${c.city} (${c.etaDays === 1 ? 'next day' : `${c.etaDays} days`}${c.cod ? ', COD' : ''})`).join(', ');
  const topics = [
    {
      id: 'shipping',
      icon: 'bicycle-outline' as const,
      tint: colors.accent,
      title: 'Shipping & Cash on Delivery',
      body: [
        `We ship across India from Bengaluru. Delivery is free on orders over ${formatINR(config.freeShippingOver)}.`,
        cityList ? `Fastest delivery and COD in: ${cityList}.` : '',
        `Cash on Delivery has a ${formatINR(config.codFee)} fee and is available on orders up to ${formatINR(config.codMaxOrder)}. COD orders are confirmed by a quick call or WhatsApp before dispatch.`,
        `Pay online (UPI, card or net banking) and get an extra ${config.prepaidDiscountPct}% off.`,
      ].filter(Boolean),
    },
    {
      id: 'returns',
      icon: 'shield-checkmark-outline' as const,
      tint: colors.success,
      title: 'Returns & warranty',
      body: [
        'Every part is bench-tested before dispatch and carries a warranty shown on its page (up to 180 days).',
        'If a part doesn’t fit or isn’t as described, request a return within 7 days of delivery — keep the tamper seal intact.',
        'Warranty doesn’t cover physical or liquid damage, or damage during installation. We recommend a professional technician for display and logic board work.',
        'You can cancel an order yourself until it is packed. Prepaid refunds reach the original payment method in 5–7 working days.',
      ],
    },
    {
      id: 'model',
      icon: 'search-outline' as const,
      tint: colors.purple,
      title: 'Find your model number',
      body: [
        'MacBook: flip it over — the A-number (like A2337) is printed in small text near the regulatory marks on the bottom case.',
        'Or on macOS: Apple menu → About This Mac shows the model name and year (e.g. “MacBook Air (M1, 2020)”).',
        'iPhone: Settings → General → About → Model Number, tap it once to reveal the A-number.',
        'iPad: Settings → General → About, or the back of the device.',
        'Search the A-number in the app to see only parts that fit.',
      ],
    },
  ];

  const toggle = (id: string) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => (o === id ? null : id));
  };

  const wa = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent('Hi Unibody, I need help finding a part')}`;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 10 }}>
        <Text variant="title3">Appearance</Text>
        <Segmented<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'light', label: 'Light', icon: 'sunny-outline' },
            { value: 'dark', label: 'Dark', icon: 'moon-outline' },
            { value: 'system', label: 'System', icon: 'contrast-outline' },
          ]}
        />
      </View>

      {myDevice && (
        <View style={{ gap: 10 }}>
          <Text variant="title3">My device</Text>
          <Card padded={false}>
            <ListRow icon="laptop-outline" iconBg={colors.successSoft} iconColor={colors.success} title={myDevice.fullName} subtitle={myDevice.aNumbers.join(' / ')} onPress={() => router.push(`/parts?model=${myDevice.id}`)} />
            <Divider inset={62} />
            <ListRow icon="close-circle" title="Forget my device" onPress={() => setMyDevice(null)} chevron={false} />
          </Card>
        </View>
      )}

      <View style={{ gap: 10 }}>
        <Text variant="title3">Help</Text>
        <Card padded={false}>
          {topics.map((t, i) => (
            <View key={t.id}>
              {i > 0 && <Divider inset={62} />}
              <Pressable onPress={() => toggle(t.id)} accessibilityRole="button" accessibilityState={{ expanded: open === t.id }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={t.icon} size={18} color="#fff" />
                </View>
                <Text variant="callout" weight="600" style={{ flex: 1 }}>
                  {t.title}
                </Text>
                <Ionicons name={open === t.id ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.subtle} />
              </Pressable>
              {open === t.id && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingLeft: 62, gap: 8 }}>
                  {t.body.map((b) => (
                    <Text key={b} variant="subhead" color="muted">
                      {b}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Text variant="title3">Talk to us</Text>
        <Text variant="footnote" color="muted" style={{ marginTop: -4 }}>
          Real people, 10am–8pm IST, Monday to Saturday. Send a photo of your part and we’ll match it.
        </Text>
        <Button title="Chat on WhatsApp" icon="logo-whatsapp" variant="dark" full onPress={() => Linking.openURL(wa).catch(() => {})} />
        <Button title={`Call ${config.supportPhone}`} icon="call-outline" variant="outline" full onPress={() => Linking.openURL(`tel:${config.supportPhone.replace(/\s/g, '')}`).catch(() => {})} />
      </View>

      <Card padded={false}>
        <ListRow icon="navigate-outline" title="Track an order" onPress={() => router.push('/track')} />
        <Divider inset={62} />
        <ListRow icon="document-text-outline" title="Terms of sale & returns policy" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/help/terms`).catch(() => {})} />
        <Divider inset={62} />
        <ListRow icon="lock-closed" title="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/help/privacy`).catch(() => {})} />
      </Card>

      <View style={{ gap: 8 }}>
        <Text variant="caption" color="muted">
          {config.disclaimer}
        </Text>
        <Text variant="caption" color="subtle">
          Unibody for {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'web'} · v{version}
        </Text>
      </View>
    </ScrollView>
  );
}
