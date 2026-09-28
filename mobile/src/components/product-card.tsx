import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { memo } from 'react';
import { Platform, Pressable, View } from 'react-native';

import type { ProductCardDTO } from '@/shared';
import { useCart } from '@/state/cart';
import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS } from '@/theme/tokens';
import { ConditionBadge, Price, ProductImage, Text } from './ui';

export const haptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** Short "fits" line: drop the family prefix to keep cards compact. */
export function shortFits(p: Pick<ProductCardDTO, 'fitsLabel' | 'familyName'>) {
  return p.fitsLabel.startsWith(p.familyName + ' ') ? p.fitsLabel.slice(p.familyName.length + 1) : p.fitsLabel;
}

function ProductCardInner({ product, width }: { product: ProductCardDTO; width?: number }) {
  const { colors, scheme } = useTheme();
  const { add, myDevice, cart } = useCart();
  const inBag = cart.lines.find((l) => l.productId === product.id)?.qty ?? 0;
  const fitsMine = !!myDevice && product.modelIds.includes(myDevice.id);
  const out = product.stock <= 0;
  return (
    <Pressable
      onPress={() => router.push(`/product/${product.slug}`)}
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${product.condition}, ${product.price / 100} rupees`}
      style={({ pressed }) => ({
        width,
        flex: width ? undefined : 1,
        backgroundColor: colors.surface,
        borderRadius: RADIUS.card,
        overflow: 'hidden',
        borderWidth: scheme === 'dark' ? 0 : 1,
        borderColor: colors.lineSubtle,
        boxShadow: colors.shadow,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <ProductImage src={product.image} alt={product.title} tint={product.icon} radius={0} aspect={1.1} padding="12%" />
      <View style={{ padding: 12, gap: 4, flex: 1 }}>
        <ConditionBadge condition={product.condition} />
        <Text variant="subhead" weight="600" numberOfLines={2} style={{ marginTop: 2 }}>
          {product.title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {shortFits(product)}
        </Text>
        {fitsMine && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text variant="caption" color="success" numberOfLines={1} style={{ flex: 1 }}>
              Fits your {myDevice!.name}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 }}>
          {out ? (
            <Text variant="footnote" color="muted" weight="600">
              Out of stock
            </Text>
          ) : (
            <Price price={product.price} mrp={product.mrp} size="md" />
          )}
          {!out && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={inBag ? `Add another ${product.title} to bag, ${inBag} in bag` : `Add ${product.title} to bag`}
              hitSlop={8}
              onPress={() => {
                haptic();
                add(product);
              }}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: inBag ? colors.success : colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}>
              <Ionicons name={inBag ? 'checkmark' : 'add'} size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardInner);

export function ProductCardSkeleton({ width }: { width?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width, flex: width ? undefined : 1, borderRadius: RADIUS.card, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSubtle }}>
      <View style={{ aspectRatio: 1.1, backgroundColor: colors.surface2 }} />
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ width: 60, height: 14, borderRadius: 7, backgroundColor: colors.surface2 }} />
        <View style={{ width: '90%', height: 14, borderRadius: 7, backgroundColor: colors.surface2 }} />
        <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.surface2 }} />
        <View style={{ width: 70, height: 18, borderRadius: 7, backgroundColor: colors.surface2, marginTop: 6 }} />
      </View>
    </View>
  );
}
