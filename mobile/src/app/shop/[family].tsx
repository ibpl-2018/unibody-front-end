import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';

import { familyArt } from '@/components/catalog-art';
import { ModelRow } from '@/components/model-picker';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button, ErrorState, Glow, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { renderUrl } from '@/lib/config';
import { useCart } from '@/state/cart';
import { useTheme } from '@/theme/ThemeProvider';

export default function FamilyScreen() {
  const { family: slug } = useLocalSearchParams<{ family: string }>();
  const { colors } = useTheme();
  const { width: w } = useWindowDimensions();
  const width = Math.min(w, 720);
  const { myDevice, setMyDevice } = useCart();
  const fam = useAsync(() => api.store.family(slug), [slug]);
  const popular = useAsync(() => api.store.products({ family: slug, pageSize: 6, sort: 'recommended', inStock: true }), [slug]);
  const art = familyArt(slug);
  const dark = !!art.dark;
  const cardW = (width - 32 - 12) / 2;
  const f = fam.data;
  const models = [...(f?.models ?? [])].sort((a, b) => b.yearFrom - a.yearFrom);

  return (
    <>
      <Stack.Screen options={{ title: f?.name ?? '' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={fam.refreshing} onRefresh={() => Promise.all([fam.refresh(), popular.refresh()]).then(() => {})} />}>
        <View style={{ margin: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: dark ? '#000' : colors.tint[art.tint], padding: 20, minHeight: 220 }}>
          {dark && <Glow style={{ left: 0, right: -80, top: 40, bottom: -80 }} />}
          {f ? (
            <>
              <Text variant="title1" color={dark ? '#f5f5f7' : 'fg'} accessibilityRole="header">
                {f.name}
              </Text>
              <Text variant="subhead" color={dark ? '#a1a1a6' : 'muted'} style={{ marginTop: 2 }}>
                {f.modelCount} models · {f.productCount} parts in stock
              </Text>
            </>
          ) : (
            <Skeleton width={180} height={30} />
          )}
          <Image source={{ uri: renderUrl(art.render) }} contentFit="contain" style={{ height: 150, marginTop: 8 }} />
          <Button title={`All ${f?.name ?? ''} parts`} size="sm" variant={dark ? 'light' : 'dark'} onPress={() => router.push(`/parts?family=${slug}`)} style={{ alignSelf: 'flex-start' }} />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <SectionHeader title="Choose your model" />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: -6, marginBottom: 4 }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text variant="footnote" color="muted" style={{ flex: 1 }}>
              Not sure? The A-number (e.g. A2337) is printed on the bottom case.
            </Text>
          </View>
          {fam.error ? (
            <ErrorState message={fam.error} onRetry={fam.reload} />
          ) : fam.loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} radius={14} />)
          ) : (
            models.map((m) => (
              <ModelRow
                key={m.id}
                model={m}
                selected={myDevice?.id === m.id}
                onPress={() => {
                  setMyDevice(m);
                  router.push(`/parts?model=${m.id}`);
                }}
              />
            ))
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
          <SectionHeader title="Popular parts" action="See all" onAction={() => router.push(`/parts?family=${slug}`)} />
          {popular.error ? (
            <ErrorState message={popular.error} onRetry={popular.reload} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {popular.loading || !popular.data
                ? [0, 1].map((i) => <ProductCardSkeleton key={i} width={cardW} />)
                : popular.data.items.map((p) => <ProductCard key={p.id} product={p} width={cardW} />)}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
