import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, TextInput, View, useWindowDimensions } from 'react-native';

import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { EmptyState, ErrorState, Screen, Text } from '@/components/ui';
import { useAsync, useDebounced } from '@/hooks/use-async';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';

const SUGGESTIONS = ['A2337', 'Battery', 'Display Air M1', 'Keyboard', 'A1466', 'Trackpad', 'MagSafe charger', 'iPhone 13 screen'];

export default function Search() {
  const { colors, scheme } = useTheme();
  const { width: w } = useWindowDimensions();
  const width = Math.min(w, 720);
  const { recentSearches, addSearch, clearSearches } = useSession();
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 350);
  const inputRef = useRef<TextInput>(null);
  const cardW = (width - 32 - 12) / 2;

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }, []),
  );

  const active = dq.length >= 2;
  const isANumber = /^a\d{3,4}$/i.test(dq);
  const products = useAsync(() => api.store.products({ q: dq, pageSize: 24 }), [dq], { enabled: active });
  const models = useAsync(() => api.store.findModel(dq), [dq], { enabled: active });

  const submit = (text = q) => {
    if (text.trim().length >= 2) addSearch(text.trim());
  };

  return (
    <Screen edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Text variant="title1" accessibilityRole="header" style={{ marginTop: 8, marginBottom: 12 }}>
          Search
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: RADIUS.md, backgroundColor: colors.surface2, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => submit()}
            placeholder="Part, model or A-number"
            placeholderTextColor={colors.subtle}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            keyboardAppearance={scheme}
            accessibilityLabel="Search parts"
            style={{ flex: 1, fontSize: 16, color: colors.fg, paddingVertical: 10 }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.subtle} />
            </Pressable>
          )}
        </View>
      </View>

      {!active ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }}
          ListHeaderComponent={
            <View style={{ gap: 24 }}>
              {recentSearches.length > 0 && (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="headline">Recent</Text>
                    <Pressable onPress={clearSearches} accessibilityRole="button" hitSlop={8}>
                      <Text variant="subhead" color="accent">
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                  {recentSearches.map((s) => (
                    <Pressable key={s} onPress={() => setQ(s)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                      <Ionicons name="time-outline" size={18} color={colors.muted} />
                      <Text variant="body" style={{ flex: 1 }}>
                        {s}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.subtle} style={{ transform: [{ rotate: '-45deg' }] }} />
                    </Pressable>
                  ))}
                </View>
              )}
              <View style={{ gap: 10 }}>
                <Text variant="headline">Try searching for</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} onPress={() => setQ(s)} accessibilityRole="button" style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.surface2 }}>
                      <Text variant="subhead">{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: colors.accentSoft }}>
                <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
                <Text variant="footnote" style={{ flex: 1 }}>
                  Tip: search by the <Text variant="footnote" weight="600">A-number</Text> printed on the bottom of your Mac (like A2337) to see only parts that fit.
                </Text>
              </View>
            </View>
          }
        />
      ) : (
        <FlatList
          data={products.loading ? [] : (products.data?.items ?? [])}
          keyExtractor={(p) => p.id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            submit();
          }}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}
          renderItem={({ item }) => (
            <View onTouchStart={() => submit()}>
              <ProductCard product={item} width={cardW} />
            </View>
          )}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {(models.data ?? []).slice(0, isANumber ? 4 : 3).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    submit();
                    router.push(`/parts?model=${m.id}`);
                  }}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS.md, backgroundColor: colors.successSoft }}>
                  <Ionicons name="laptop-outline" size={20} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text variant="callout" weight="600">
                      {m.fullName}
                    </Text>
                    <Text variant="footnote" color="muted">
                      {m.aNumbers.join(' / ')} · {plural(m.productCount ?? 0, 'part')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
              {products.data && (
                <Text variant="footnote" color="muted" style={{ marginTop: 4 }}>
                  {plural(products.data.total, 'result')} for “{dq}”
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            products.loading ? (
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
                <ProductCardSkeleton width={cardW} />
                <ProductCardSkeleton width={cardW} />
              </View>
            ) : products.error ? (
              <ErrorState message={products.error} onRetry={products.reload} />
            ) : (
              <EmptyState icon="search-outline" title="No matches" body={`We couldn’t find parts for “${dq}”. Try a model number like A2337, or a part name like “battery”.`} />
            )
          }
          ListFooterComponent={
            products.data && products.data.total > products.data.items.length ? (
              <Pressable onPress={() => router.push(`/parts?q=${encodeURIComponent(dq)}`)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
                <Text variant="subhead" color="accent" weight="600">
                  See all {products.data.total} results ›
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
