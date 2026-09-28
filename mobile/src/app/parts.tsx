import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Switch, View, useWindowDimensions } from 'react-native';

import { categoryRender, familyArt } from '@/components/catalog-art';
import { ModelPickerSheet } from '@/components/model-picker';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button, EmptyState, ErrorState, Glow, IconButton, Input, Pill, Sheet, Skeleton, Text } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { renderUrl } from '@/lib/config';
import { plural } from '@/lib/format';
import { COLOUR_HEX, CONDITION_LABEL, CONDITION_TONE, type Condition, type ProductCardDTO, type ProductListDTO } from '@/shared';
import { useCart } from '@/state/cart';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS, tintFor, toneColors } from '@/theme/tokens';

type Sort = 'recommended' | 'price_asc' | 'price_desc' | 'newest';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
];

interface Filters {
  condition: string[];
  colour: string[];
  minPrice: string; // rupees as typed
  maxPrice: string;
  inStock: boolean;
  cod: boolean;
}
const EMPTY_FILTERS: Filters = { condition: [], colour: [], minPrice: '', maxPrice: '', inStock: false, cod: false };
const PAGE_SIZE = 20;

export default function PartsListing() {
  const params = useLocalSearchParams<{ family?: string; model?: string; category?: string; q?: string; sort?: string }>();
  const { colors } = useTheme();
  const { width: w } = useWindowDimensions();
  const width = Math.min(w, 720);
  const { myDevice, setMyDevice } = useCart();

  const [model, setModel] = useState<string | undefined>(params.model);
  const [family, setFamily] = useState<string | undefined>(params.family);
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [sort, setSort] = useState<Sort>((params.sort as Sort) || 'recommended');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [sheet, setSheet] = useState<null | 'filters' | 'sort' | 'model'>(null);

  const [list, setList] = useState<ProductListDTO | null>(null);
  const [items, setItems] = useState<ProductCardDTO[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const query = useMemo(
    () => ({
      model,
      family: model ? undefined : family,
      category,
      q: params.q,
      sort,
      condition: filters.condition.length ? filters.condition : undefined,
      colour: filters.colour.length ? filters.colour : undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) * 100 : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) * 100 : undefined,
      inStock: filters.inStock || undefined,
      cod: filters.cod || undefined,
      pageSize: PAGE_SIZE,
    }),
    [model, family, category, params.q, sort, filters],
  );

  const load = useCallback(
    async (p: number, mode: 'load' | 'more' | 'refresh') => {
      const id = ++seq.current;
      if (mode === 'load') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const res = await api.store.products({ ...query, page: p });
        if (id !== seq.current) return;
        setList(res);
        setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items.filter((x) => !prev.some((y) => y.id === x.id))]));
        setPage(p);
      } catch (e) {
        if (id === seq.current) setError(errorMessage(e));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on query change
    load(1, 'load');
  }, [load]);

  const hasMore = !!list && items.length < list.total;
  const onEnd = () => {
    if (hasMore && !loadingMore && !loading) load(page + 1, 'more');
  };

  const activeFilterCount =
    filters.condition.length + filters.colour.length + (filters.minPrice || filters.maxPrice ? 1 : 0) + (filters.inStock ? 1 : 0) + (filters.cod ? 1 : 0);
  const facets = list?.facets;
  const title = list?.model?.fullName ?? list?.family?.name ?? (params.q ? `“${params.q}”` : 'All parts');
  const cardW = (width - 32 - 12) / 2;
  const fitsMineSuggestion = myDevice && !model && (!family || family === myDevice.familySlug) && !params.q;

  const header = (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      {/* Context card */}
      <ContextCard
        list={list}
        loading={loading && !list}
        title={title}
        isMine={!!model && myDevice?.id === model}
        onChangeModel={() => setSheet('model')}
        onClearModel={
          model
            ? () => {
                setModel(undefined);
                setFamily(list?.model?.familySlug ?? family);
              }
            : undefined
        }
      />

      {fitsMineSuggestion && (
        <Pressable
          onPress={() => setModel(myDevice.id)}
          accessibilityRole="button"
          style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md, backgroundColor: colors.successSoft }}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text variant="footnote" style={{ flex: 1 }}>
            Show only parts that fit your <Text variant="footnote" weight="600">{myDevice.fullName}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      )}

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        <Pill label="All" count={list && !category ? list.total : undefined} active={!category} onPress={() => setCategory(undefined)} />
        {(facets?.categories ?? []).map((c) => {
          const slug = (c as { slug?: string }).slug ?? c.id;
          const icon = guessIcon(c.name);
          const img = categoryRender(icon);
          return (
            <Pill
              key={c.id}
              label={c.name}
              active={category === slug || category === c.id}
              onPress={() => setCategory(category === slug ? undefined : slug)}
              left={
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint[tintFor(icon)], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {img && <Image source={{ uri: img }} contentFit="contain" style={{ width: 22, height: 22 }} />}
                </View>
              }
            />
          );
        })}
      </ScrollView>

      {/* Filter / sort bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <ToolbarButton
          icon="options-outline"
          label={activeFilterCount ? `Filters · ${activeFilterCount}` : 'Filters'}
          active={activeFilterCount > 0}
          onPress={() => {
            setDraft(filters);
            setSheet('filters');
          }}
        />
        <ToolbarButton icon="swap-vertical" label={sort === 'recommended' ? 'Sort' : SORTS.find((s) => s.value === sort)!.label.replace('Price: ', '')} onPress={() => setSheet('sort')} />
        <View style={{ flex: 1 }} />
        {list && (
          <Text variant="footnote" color="muted">
            {plural(list.total, 'part')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Parts',
          headerRight: () => <IconButton icon="search-outline" label="Search" variant="ghost" onPress={() => router.push('/search')} />,
        }}
      />
      <FlatList
        data={loading ? [] : items}
        key="grid"
        numColumns={2}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 }}>
              {[0, 1, 2, 3].map((i) => (
                <ProductCardSkeleton key={i} width={cardW} />
              ))}
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={() => load(1, 'load')} />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No parts match"
              body="Try removing a filter or picking a different model. We add stock every week."
              action={
                activeFilterCount || category ? (
                  <Button
                    title="Clear filters"
                    variant="secondary"
                    onPress={() => {
                      setFilters(EMPTY_FILTERS);
                      setCategory(undefined);
                    }}
                  />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : error && items.length ? (
            <Button title="Load more" variant="secondary" onPress={onEnd} style={{ alignSelf: 'center' }} />
          ) : null
        }
      />

      {/* Filters sheet */}
      <Sheet
        visible={sheet === 'filters'}
        onClose={() => setSheet(null)}
        title="Filters"
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Reset" variant="secondary" onPress={() => setDraft(EMPTY_FILTERS)} style={{ flex: 1 }} />
            <Button
              title="Show results"
              onPress={() => {
                setFilters(draft);
                setSheet(null);
              }}
              style={{ flex: 2 }}
            />
          </View>
        }>
        <FilterGroup title="Condition">
          {(facets?.conditions ?? []).map((c) => {
            const on = draft.condition.includes(c.value);
            const tc = toneColors(colors, CONDITION_TONE[c.value as Condition] ?? 'neutral');
            return (
              <Chip key={c.value} on={on} onPress={() => setDraft((d) => ({ ...d, condition: toggle(d.condition, c.value) }))} dot={tc.fg} label={`${CONDITION_LABEL[c.value as Condition] ?? c.value} (${c.count})`} />
            );
          })}
        </FilterGroup>
        {(facets?.colours.length ?? 0) > 0 && (
          <FilterGroup title="Colour">
            {facets!.colours.map((c) => (
              <Chip key={c.value} on={draft.colour.includes(c.value)} onPress={() => setDraft((d) => ({ ...d, colour: toggle(d.colour, c.value) }))} dot={COLOUR_HEX[c.value] ?? colors.line} label={`${c.value} (${c.count})`} />
            ))}
          </FilterGroup>
        )}
        <FilterGroup title="Price (₹)">
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <Input containerStyle={{ flex: 1 }} placeholder={facets ? String(Math.floor(facets.priceMin / 100)) : 'Min'} keyboardType="number-pad" value={draft.minPrice} onChangeText={(t) => setDraft((d) => ({ ...d, minPrice: t.replace(/\D/g, '') }))} accessibilityLabel="Minimum price" />
            <Input containerStyle={{ flex: 1 }} placeholder={facets ? String(Math.ceil(facets.priceMax / 100)) : 'Max'} keyboardType="number-pad" value={draft.maxPrice} onChangeText={(t) => setDraft((d) => ({ ...d, maxPrice: t.replace(/\D/g, '') }))} accessibilityLabel="Maximum price" />
          </View>
        </FilterGroup>
        <SwitchRow label="In stock only" value={draft.inStock} onChange={(v) => setDraft((d) => ({ ...d, inStock: v }))} />
        <SwitchRow label="Cash on Delivery available" value={draft.cod} onChange={(v) => setDraft((d) => ({ ...d, cod: v }))} />
      </Sheet>

      {/* Sort sheet */}
      <Sheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort by">
        <View style={{ gap: 4 }}>
          {SORTS.map((s) => (
            <Pressable
              key={s.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: sort === s.value }}
              onPress={() => {
                setSort(s.value);
                setSheet(null);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <Text variant="body" style={{ flex: 1 }} weight={sort === s.value ? '600' : '400'}>
                {s.label}
              </Text>
              {sort === s.value && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
      </Sheet>

      <ModelPickerSheet
        visible={sheet === 'model'}
        onClose={() => setSheet(null)}
        initialFamily={list?.model?.familySlug ?? list?.family?.slug ?? family}
        selectedId={model}
        onPick={(m) => {
          setMyDevice(m);
          setModel(m.id);
        }}
      />
    </>
  );
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function guessIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('display') || n.includes('lcd')) return 'display';
  if (n.includes('keyboard') || n.includes('top case')) return 'keyboard';
  if (n.includes('batter')) return 'battery';
  if (n.includes('logic')) return 'cpu';
  if (n.includes('ssd') || n.includes('storage')) return 'ssd';
  if (n.includes('charg') || n.includes('cable')) return 'charger';
  if (n.includes('fan') || n.includes('thermal')) return 'fan';
  if (n.includes('speaker') || n.includes('audio')) return 'speaker';
  if (n.includes('camera')) return 'camera';
  if (n.includes('trackpad')) return 'trackpad';
  if (n.includes('housing')) return 'laptop';
  if (n.includes('i/o') || n.includes('port')) return 'cable';
  return 'box';
}

function ContextCard({
  list,
  loading,
  title,
  isMine,
  onChangeModel,
  onClearModel,
}: {
  list: ProductListDTO | null;
  loading: boolean;
  title: string;
  isMine: boolean;
  onChangeModel: () => void;
  onClearModel?: () => void;
}) {
  const { colors } = useTheme();
  const slug = list?.model?.familySlug ?? list?.family?.slug;
  const art = slug ? familyArt(slug) : null;
  const dark = !!art?.dark;
  const m = list?.model;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 24, overflow: 'hidden', backgroundColor: art ? (dark ? '#000' : colors.tint[art.tint]) : colors.surface2, padding: 18, minHeight: art ? 190 : 0 }}>
      {dark && <Glow style={{ left: 60, right: -80, top: 40, bottom: -80 }} />}
      {art && <Image source={{ uri: renderUrl(art.render) }} contentFit="contain" style={{ position: 'absolute', right: -14, bottom: 6, width: '46%', height: 130 }} />}
      {m && (
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: dark ? 'rgba(48,209,88,0.18)' : colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 8 }}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text variant="caption" color="success" weight="600">
            {isMine ? 'Your device' : 'Model'} · {m.aNumbers.join(' / ')}
          </Text>
        </View>
      )}
      {loading ? (
        <Skeleton width={200} height={28} />
      ) : (
        <Text variant="title2" color={dark ? '#f5f5f7' : 'fg'} accessibilityRole="header" style={{ maxWidth: art ? '62%' : '100%' }}>
          {title}
        </Text>
      )}
      {list && (
        <Text variant="footnote" color={dark ? '#a1a1a6' : 'muted'} style={{ marginTop: 4, maxWidth: art ? '60%' : '100%' }}>
          {m ? `${m.yearLabel}${m.chip ? ` · ${m.chip}` : ''} · ` : ''}
          {plural(list.total, 'part')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Pressable onPress={onChangeModel} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: dark ? 'rgba(255,255,255,0.14)' : colors.surface }}>
          <Text variant="footnote" weight="600" color={dark ? '#f5f5f7' : 'fg'}>
            {m ? 'Change model' : 'Pick your model'}
          </Text>
        </Pressable>
        {onClearModel && (
          <Pressable onPress={onClearModel} accessibilityRole="button" accessibilityLabel={`All ${m?.familyName ?? ''} parts`} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : colors.surface }}>
            <Text variant="footnote" weight="600" color={dark ? '#2997ff' : 'accent'}>
              All models
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ToolbarButton({ icon, label, onPress, active }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.line,
        backgroundColor: active ? colors.accentSoft : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Ionicons name={icon} size={16} color={active ? colors.accent : colors.fg} />
      <Text variant="footnote" weight="600" color={active ? 'accent' : 'fg'}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="headline">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({ label, on, onPress, dot }: { label: string; on: boolean; onPress: () => void; dot?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface }}>
      {dot && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, borderWidth: 1, borderColor: colors.line }} />}
      <Text variant="footnote" weight="500">
        {label}
      </Text>
    </Pressable>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="body">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.success, false: colors.line }} accessibilityLabel={label} />
    </View>
  );
}
