import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoryRender, familyArt } from '@/components/catalog-art';
import { loadFamilies, ModelPickerSheet } from '@/components/model-picker';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button, Card, ErrorState, Glow, Gradient, IconButton, Logo, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { renderUrl } from '@/lib/config';
import { fmtDay, plural } from '@/lib/format';
import type { CategoryDTO, DeviceFamilyDTO } from '@/shared';
import { useCart } from '@/state/cart';
import { useStoreConfig } from '@/state/store-config';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS, tintFor, VIVID } from '@/theme/tokens';

const GUTTER = 16;

export default function Home() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW, 720);
  const { config, reload: reloadConfig } = useStoreConfig();
  const { count, myDevice, setMyDevice } = useCart();

  const families = useAsync(loadFamilies, []);
  const categories = useAsync(() => api.store.categories(), []);
  const featured = useAsync(() => api.store.products({ featured: true, pageSize: 6, inStock: true }), []);

  const [finderOpen, setFinderOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    reloadConfig();
    await Promise.all([families.refresh(), categories.refresh(), featured.refresh()]);
    setRefreshing(false);
  };

  const totalParts = (families.data ?? []).reduce((a, f) => a + f.productCount, 0);
  const cardW = (width - GUTTER * 2 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" progressViewOffset={insets.top} />}>
        {/* ------------------------------------------------ Hero */}
        <View style={{ backgroundColor: colors.hero, paddingTop: insets.top + 8, paddingBottom: 24, overflow: 'hidden' }}>
          <Glow style={{ left: -80, right: -80, top: 140, height: 380 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, height: 44 }}>
            <Logo light />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <IconButton icon="search-outline" label="Search" variant="ghost" color="#f5f5f7" onPress={() => router.push('/search')} />
              <View>
                <IconButton icon="bag-handle-outline" label={`Bag, ${count} items`} variant="ghost" color="#f5f5f7" onPress={() => router.push('/bag')} />
                {count > 0 && (
                  <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text variant="micro" color="#fff" weight="700">
                      {count}
                    </Text>
                  </View>
                )}
              </View>
              <IconButton icon="ellipsis-horizontal-circle-outline" label="Help and settings" variant="ghost" color="#f5f5f7" onPress={() => router.push('/more')} />
            </View>
          </View>

          <View style={{ alignItems: 'center', paddingHorizontal: GUTTER, marginTop: 20, gap: 8 }}>
            <Text variant="subhead" weight="600" color="#2997ff">
              Genuine. Tested. Delivered.
            </Text>
            <Text variant="display" color="heroFg" center style={{ fontSize: 40, lineHeight: 44 }} accessibilityRole="header">
              Every part.{'\n'}Every Mac.
            </Text>
            <Text variant="callout" color="heroMuted" center style={{ maxWidth: 320 }}>
              Parts for MacBook, iMac, iPhone & iPad — 2012 to today. Pay on delivery.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button title="Shop parts" onPress={() => router.push('/shop')} />
              <Button title="Find my model" variant="glass" onPress={() => setFinderOpen(true)} />
            </View>
          </View>

          <Image
            source={{ uri: renderUrl('hero_laptop_midnight') }}
            accessibilityLabel="MacBook"
            contentFit="contain"
            style={{ width: '100%', height: Math.min(width * 0.62, 300), marginTop: 16 }}
          />

          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="Search parts or model number"
            style={{
              marginHorizontal: GUTTER,
              marginTop: 8,
              height: 48,
              borderRadius: RADIUS.pill,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 16,
            }}>
            <Ionicons name="search" size={18} color="#a1a1a6" />
            <Text variant="callout" color="heroMuted">
              Part or model no. (e.g. A2337)
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingHorizontal: GUTTER }}>
            {[
              { v: totalParts ? `${totalParts}+` : '—', l: 'parts', c: VIVID.purple },
              { v: '1–3 days', l: 'delivery', c: '#2997ff' },
              { v: '180 days', l: 'warranty', c: VIVID.pink },
            ].map((s) => (
              <View key={s.l} style={{ alignItems: 'center' }} accessible accessibilityLabel={`${s.v} ${s.l}`}>
                <Text variant="title2" color={s.c}>
                  {s.v}
                </Text>
                <Text variant="caption" color="heroMuted">
                  {s.l}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          {!!config.announcement && (
            <View style={{ marginHorizontal: GUTTER, marginTop: 16, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: RADIUS.md, backgroundColor: colors.surface2 }}>
              <Ionicons name="bicycle-outline" size={18} color={colors.accent} />
              <Text variant="footnote" color="muted" style={{ flex: 1 }}>
                {config.announcement}
              </Text>
            </View>
          )}

          {/* ------------------------------------------------ Shop by part */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <SectionHeader title="Shop by part" action="All" onAction={() => router.push('/parts')} />
            {categories.error ? (
              <ErrorState message={categories.error} onRetry={categories.reload} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {(categories.data ?? Array.from({ length: 8 }, () => null))
                  .filter((c): c is CategoryDTO | null => c === null || (c.active && (c.productCount ?? 0) > 0))
                  .slice(0, 8)
                  .map((c, i) =>
                    c ? (
                      <CategoryTile key={c.id} category={c} size={(width - GUTTER * 2 - 30) / 4} />
                    ) : (
                      <Skeleton key={i} width={(width - GUTTER * 2 - 30) / 4} height={(width - GUTTER * 2 - 30) / 4 + 22} radius={16} />
                    ),
                  )}
              </View>
            )}
          </View>

          {/* ------------------------------------------------ Part finder */}
          <PartFinder families={families.data ?? []} open={finderOpen} setOpen={setFinderOpen} />

          {/* ------------------------------------------------ Shop by device */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <SectionHeader title="Shop by device" action="All" onAction={() => router.push('/shop')} />
            {families.error ? (
              <ErrorState message={families.error} onRetry={families.reload} />
            ) : families.loading ? (
              <View style={{ gap: 12 }}>
                <Skeleton height={260} radius={24} />
                <Skeleton height={260} radius={24} />
              </View>
            ) : (
              <DeviceTiles families={families.data ?? []} width={width - GUTTER * 2} />
            )}
          </View>

          {/* ------------------------------------------------ Festive banner */}
          {config.banner && (
            <Pressable
              onPress={() => router.push('/parts')}
              accessibilityRole="button"
              accessibilityLabel={`${config.banner.title} ${config.banner.subtitle}`}
              style={{ marginHorizontal: GUTTER, marginTop: 28 }}>
              <Gradient name="sunrise" style={{ borderRadius: 24, padding: 20, overflow: 'hidden', minHeight: 220 }}>
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text variant="caption" color="#fff" weight="600">
                    Festive offer
                  </Text>
                </View>
                <Text variant="title1" color="#fff" style={{ marginTop: 12, maxWidth: '85%' }}>
                  {config.banner.title}
                </Text>
                <Text variant="subhead" color="rgba(255,255,255,0.9)" style={{ marginTop: 6, maxWidth: '70%' }}>
                  Code {config.banner.code}
                  {config.banner.endsAt ? ` · till ${fmtDay(config.banner.endsAt)}` : ''}
                </Text>
                <Image source={{ uri: renderUrl('keycaps') }} contentFit="contain" style={{ position: 'absolute', right: -10, bottom: -6, width: 170, height: 130 }} accessibilityIgnoresInvertColors />
                <View style={{ flex: 1 }} />
                <View style={{ alignSelf: 'flex-start', marginTop: 18, backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 9 }}>
                  <Text variant="subhead" color="#1d1d1f" weight="600">
                    Shop now
                  </Text>
                </View>
              </Gradient>
            </Pressable>
          )}

          {/* ------------------------------------------------ Bestsellers */}
          <View style={{ paddingHorizontal: GUTTER, marginTop: 28 }}>
            <SectionHeader title="Bestsellers" action="See all" onAction={() => router.push('/parts?sort=recommended')} />
            {featured.error ? (
              <ErrorState message={featured.error} onRetry={featured.reload} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {featured.loading || !featured.data
                  ? [0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardW} />)
                  : featured.data.items.map((p) => <ProductCard key={p.id} product={p} width={cardW} />)}
              </View>
            )}
          </View>

          {/* ------------------------------------------------ My device */}
          {myDevice && (
            <Card style={{ marginHorizontal: GUTTER, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text variant="footnote" color="muted">
                  Your device
                </Text>
                <Text variant="headline">{myDevice.fullName}</Text>
              </View>
              <Button title="Parts" size="sm" onPress={() => router.push(`/parts?model=${myDevice.id}`)} />
              <IconButton icon="close" label="Forget my device" size={32} onPress={() => setMyDevice(null)} />
            </Card>
          )}
        </View>

        {/* ------------------------------------------------ Why Unibody */}
        <View style={{ backgroundColor: colors.hero, marginTop: 32, paddingVertical: 28, paddingHorizontal: GUTTER, gap: 12, overflow: 'hidden' }}>
          <Glow style={{ left: -100, right: -100, top: -120, height: 360 }} colorsList={['rgba(0,113,227,0.35)', 'rgba(88,86,214,0.25)']} />
          <Text variant="title1" color="heroFg" style={{ marginBottom: 6, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
            Why Unibody
          </Text>
          {[
            { icon: 'cash-outline' as const, c: VIVID.green, t: `Pay on delivery in ${config.cities.length || 6} cities`, s: `COD up to ₹${config.codMaxOrder / 100 / 1000}k · ₹${config.codFee / 100} fee` },
            { icon: 'shield-checkmark-outline' as const, c: VIVID.blue, t: 'Tested & graded, up to 180-day warranty', s: 'Every unit bench-tested and photographed' },
            { icon: 'bicycle-outline' as const, c: VIVID.orange, t: 'Delivered in 1–3 days with live tracking', s: 'Track every step, right in the app' },
          ].map((r) => (
            <View key={r.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.heroSurface, borderRadius: RADIUS.card, padding: 14, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: r.c, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={r.icon} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="callout" color="heroFg" weight="600">
                  {r.t}
                </Text>
                <Text variant="footnote" color="heroMuted">
                  {r.s}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text variant="caption" color="muted" style={{ paddingHorizontal: GUTTER, paddingTop: 20, maxWidth: 720, alignSelf: 'center' }}>
          {config.disclaimer}
        </Text>
      </ScrollView>
    </View>
  );
}

const SHORT_CATEGORY: Record<string, string> = {
  'display-assembly': 'Displays',
  'lcd-panel': 'LCD panels',
  'top-case': 'Top cases',
  keyboard: 'Keyboards',
  trackpad: 'Trackpads',
  battery: 'Batteries',
  'logic-board': 'Boards',
  storage: 'Storage',
  chargers: 'Chargers',
  thermal: 'Fans',
  audio: 'Speakers',
  camera: 'Cameras',
  housing: 'Housing',
};

function CategoryTile({ category, size }: { category: CategoryDTO; size: number }) {
  const { colors } = useTheme();
  const img = categoryRender(category.icon);
  const short = SHORT_CATEGORY[category.slug] ?? category.name.replace(/ &.*$/, '').replace(/ \/.*$/, '');
  return (
    <Pressable
      onPress={() => router.push(`/parts?category=${category.slug}`)}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.productCount ?? 0} parts`}
      style={({ pressed }) => ({ width: size, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: size, height: size, borderRadius: 16, backgroundColor: colors.tint[tintFor(category.icon)], alignItems: 'center', justifyContent: 'center', padding: 8 }}>
        {img ? <Image source={{ uri: img }} contentFit="contain" style={{ width: '100%', height: '100%' }} /> : <Ionicons name="cube-outline" size={26} color={colors.muted} />}
      </View>
      <Text variant="caption" weight="500" center numberOfLines={1}>
        {short}
      </Text>
    </Pressable>
  );
}

function PartFinder({ families, open, setOpen }: { families: DeviceFamilyDTO[]; open: boolean; setOpen: (v: boolean) => void }) {
  const { colors } = useTheme();
  const { myDevice, setMyDevice } = useCart();
  const [family, setFamily] = useState<string | undefined>(undefined);
  const shown = families.filter((f) => (f.models?.length ?? 0) > 0).slice(0, 5);
  const activeFamily = family ?? myDevice?.familySlug ?? shown[0]?.slug;
  const model = myDevice && (!family || myDevice.familySlug === family) ? myDevice : null;

  return (
    <View style={{ marginHorizontal: GUTTER, marginTop: 28, borderRadius: 24, padding: 2 }}>
      <Gradient name="brand" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, opacity: 0.9 }} />
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={14} color={colors.purple} />
          <Text variant="caption" color="purple" weight="600">
            Part finder
          </Text>
        </View>
        <Text variant="title3">Find parts that fit your device</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {shown.map((f) => {
            const active = f.slug === activeFamily;
            const art = familyArt(f.slug);
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFamily(f.slug);
                  setOpen(true);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={f.name}
                style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 12, borderWidth: active ? 2 : 1, borderColor: active ? colors.accent : colors.lineSubtle, backgroundColor: active ? colors.accentSoft : colors.surface2 }}>
                <Image source={{ uri: renderUrl(art.render) }} contentFit="contain" style={{ width: 36, height: 28 }} />
                <Text variant="micro" numberOfLines={1} style={{ paddingHorizontal: 2 }}>
                  {f.name.replace('MacBook ', '').replace(' (12")', ' 12"')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={model ? `Model: ${model.fullName}. Change` : 'Choose your model'}
          style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, gap: 8 }}>
          <Text variant="callout" color={model ? 'fg' : 'subtle'} style={{ flex: 1 }} numberOfLines={1}>
            {model ? `${model.name} · ${model.yearLabel} · ${model.aNumbers[0]}` : 'Choose your model'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
        <Button
          title={model ? `Show ${plural(model.productCount ?? 0, 'part')}` : 'Show parts'}
          full
          disabled={!model}
          onPress={() => model && router.push(`/parts?model=${model.id}`)}
        />
      </View>
      <ModelPickerSheet visible={open} onClose={() => setOpen(false)} initialFamily={activeFamily} selectedId={myDevice?.id} onPick={(m) => setMyDevice(m)} />
    </View>
  );
}

function DeviceTiles({ families, width }: { families: DeviceFamilyDTO[]; width: number }) {
  const big = families.filter((f) => f.slug === 'macbook-air' || f.slug === 'macbook-pro');
  const small = families.filter((f) => !big.includes(f));
  const half = (width - 12) / 2;
  return (
    <View style={{ gap: 12 }}>
      {big.map((f) => (
        <DeviceTile key={f.id} family={f} width={width} big />
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {small.map((f) => (
          <DeviceTile key={f.id} family={f} width={half} />
        ))}
      </View>
    </View>
  );
}

function DeviceTile({ family, width, big }: { family: DeviceFamilyDTO; width: number; big?: boolean }) {
  const { colors } = useTheme();
  const art = familyArt(family.slug);
  const dark = !!art.dark;
  const models = family.models ?? [];
  const years = models.length ? `${Math.min(...models.map((m) => m.yearFrom))} → ${models.some((m) => !m.yearTo) ? 'today' : Math.max(...models.map((m) => m.yearTo ?? m.yearFrom))}` : `${family.productCount} parts`;
  return (
    <Pressable
      onPress={() => router.push(`/shop/${family.slug}`)}
      accessibilityRole="button"
      accessibilityLabel={`${family.name}, ${family.productCount} parts`}
      style={({ pressed }) => ({
        width,
        height: big ? 270 : 220,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: dark ? '#000' : colors.tint[art.tint],
        alignItems: 'center',
        paddingTop: big ? 26 : 18,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}>
      {dark && <Glow style={{ left: -40, right: -40, top: 60, bottom: -60 }} />}
      <Text variant={big ? 'title1' : 'title3'} color={dark ? '#f5f5f7' : 'fg'} center>
        {family.name}
      </Text>
      <Text variant="footnote" color={dark ? '#a1a1a6' : 'muted'} center>
        {years}
      </Text>
      <Text variant="footnote" color={dark ? '#2997ff' : 'accent'} weight="500" style={{ marginTop: 2 }}>
        Shop parts ›
      </Text>
      <Image source={{ uri: renderUrl(art.render) }} contentFit="contain" style={{ position: 'absolute', bottom: big ? -8 : 0, left: big ? '12%' : 10, right: big ? '12%' : 10, height: big ? 170 : 130 }} />
    </Pressable>
  );
}
