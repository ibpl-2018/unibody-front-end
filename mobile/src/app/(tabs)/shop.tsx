import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { familyArt } from '@/components/catalog-art';
import { loadFamilies } from '@/components/model-picker';
import { ErrorState, Glow, Screen, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { renderUrl } from '@/lib/config';
import { formatINR } from '@/shared';
import { useCart } from '@/state/cart';
import { useTheme } from '@/theme/ThemeProvider';

export default function Shop() {
  const { colors } = useTheme();
  const { myDevice } = useCart();
  const fam = useAsync(loadFamilies, []);
  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={fam.refreshing} onRefresh={fam.refresh} />}>
        <Text variant="title1" accessibilityRole="header" style={{ marginTop: 8 }}>
          Shop
        </Text>
        <Text variant="subhead" color="muted" style={{ marginTop: -6, marginBottom: 4 }}>
          Pick your device to see parts that fit.
        </Text>

        {myDevice && (
          <Pressable
            onPress={() => router.push(`/parts?model=${myDevice.id}`)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.successSoft }}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="success" weight="600">
                Your device · {myDevice.aNumbers[0]}
              </Text>
              <Text variant="headline">{myDevice.fullName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}

        <Pressable onPress={() => router.push('/parts')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface2 }}>
          <Ionicons name="grid-outline" size={20} color={colors.accent} />
          <Text variant="headline" style={{ flex: 1 }}>
            Browse all parts
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {fam.error ? (
          <ErrorState message={fam.error} onRetry={fam.reload} />
        ) : fam.loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} radius={22} />)
        ) : (
          (fam.data ?? []).map((f) => {
            const art = familyArt(f.slug);
            const dark = !!art.dark;
            return (
              <Pressable
                key={f.id}
                onPress={() => router.push(`/shop/${f.slug}`)}
                accessibilityRole="button"
                accessibilityLabel={`${f.name}, ${f.modelCount} models, ${f.productCount} parts`}
                style={({ pressed }) => ({
                  height: 124,
                  borderRadius: 22,
                  overflow: 'hidden',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 20,
                  backgroundColor: dark ? '#000' : colors.tint[art.tint],
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}>
                {dark && <Glow style={{ right: -60, width: 260, top: -40, bottom: -40 }} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="title3" color={dark ? '#f5f5f7' : 'fg'}>
                    {f.name}
                  </Text>
                  <Text variant="footnote" color={dark ? '#a1a1a6' : 'muted'}>
                    {f.modelCount} models · {f.productCount} parts
                  </Text>
                  {f.fromPrice !== null && (
                    <Text variant="footnote" color={dark ? '#2997ff' : 'accent'} weight="500">
                      From {formatINR(f.fromPrice)} ›
                    </Text>
                  )}
                </View>
                <Image source={{ uri: renderUrl(art.render) }} contentFit="contain" style={{ width: 150, height: 110, marginRight: 4 }} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
