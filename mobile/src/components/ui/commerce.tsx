import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CONDITION_SHORT,
  CONDITION_TONE,
  formatINR,
  percentOff,
  STATUS_LABEL,
  STATUS_TONE,
  type Condition,
  type OrderStatus,
  type Tone,
} from '@/shared';
import { useTheme } from '@/theme/ThemeProvider';
import { GRADIENTS, RADIUS, tintFor, toneColors, type TintName } from '@/theme/tokens';
import { Text, type IconName } from './core';
import { font } from '@/theme/fonts';

// ---------------------------------------------------------------- Screen
export function Screen({ children, edges = [], style }: { children: ReactNode; edges?: ('top' | 'bottom')[]; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.bg, paddingTop: edges.includes('top') ? insets.top : 0, paddingBottom: edges.includes('bottom') ? insets.bottom : 0 },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Keyboard-avoiding scroll container for forms. */
export function FormScroll({ children, contentStyle, footer }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle>; footer?: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: 32 }, contentStyle]}>
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

/** Sticky bottom action bar (respects home indicator). */
export function BottomBar({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.lineSubtle,
        gap: 10,
      }}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- Badges
export function Badge({ label, tone = 'neutral', icon, style }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: c.bg, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 }, style]}>
      {icon && <Ionicons name={icon} size={11} color={c.fg} />}
      <RNText maxFontSizeMultiplier={1.3} style={{ color: c.fg, fontSize: 11.5, ...font('600') }}>
        {label}
      </RNText>
    </View>
  );
}

export const ConditionBadge = ({ condition, long, style }: { condition: Condition | string; long?: boolean; style?: StyleProp<ViewStyle> }) => {
  const c = condition as Condition;
  const label = long ? (c.startsWith('GENUINE') ? `Genuine · ${CONDITION_SHORT[c]}` : 'Compatible · New') : (CONDITION_SHORT[c] ?? String(condition));
  return <Badge label={label} tone={CONDITION_TONE[c] ?? 'neutral'} style={style} />;
};

export const StatusBadge = ({ status, style }: { status: OrderStatus; style?: StyleProp<ViewStyle> }) => (
  <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} style={style} />
);

// ---------------------------------------------------------------- Price
export function Price({ price, mrp, size = 'md', showOff }: { price: number; mrp?: number | null; size?: 'sm' | 'md' | 'lg' | 'xl'; showOff?: boolean }) {
  const { colors } = useTheme();
  const fs = { sm: 15, md: 17, lg: 22, xl: 32 }[size];
  const off = percentOff(price, mrp);
  return (
    <View style={{ flexDirection: size === 'xl' || size === 'lg' ? 'row' : 'column', alignItems: size === 'xl' || size === 'lg' ? 'baseline' : 'flex-start', gap: size === 'xl' ? 10 : 2, flexWrap: 'wrap' }}>
      <RNText maxFontSizeMultiplier={1.4} style={{ fontSize: fs, ...font('700'), color: colors.fg, letterSpacing: -0.3 }} accessibilityLabel={`Price ${formatINR(price)}`}>
        {formatINR(price)}
      </RNText>
      {!!mrp && mrp > price && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <RNText maxFontSizeMultiplier={1.3} style={{ fontSize: size === 'xl' ? 15 : 12, color: colors.subtle, textDecorationLine: 'line-through' }} accessibilityLabel={`MRP ${formatINR(mrp)}`}>
            {size === 'xl' ? 'MRP ' : ''}
            {formatINR(mrp)}
          </RNText>
          {showOff && off > 0 && <Badge label={`${off}% off`} tone="danger" />}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Product image on tinted stage
export function ProductImage({
  src,
  alt,
  tint,
  style,
  radius = RADIUS.card,
  padding = '10%',
  aspect = 1,
}: {
  src?: string | null;
  alt: string;
  tint?: string | null;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  padding?: `${number}%` | number;
  aspect?: number;
}) {
  const { colors } = useTheme();
  const t: TintName = tintFor(tint);
  return (
    <View style={[{ backgroundColor: colors.tint[t], borderRadius: radius, overflow: 'hidden', aspectRatio: aspect, alignItems: 'center', justifyContent: 'center', padding }, style]}>
      {src ? (
        <Image source={{ uri: src }} accessibilityLabel={alt} contentFit="contain" transition={200} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Ionicons name="cube-outline" size={32} color={colors.subtle} accessibilityLabel={alt} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Qty stepper
export function QtyStepper({ value, onChange, min = 1, max = 10, compact }: { value: number; onChange: (n: number) => void; min?: number; max?: number; compact?: boolean }) {
  const { colors } = useTheme();
  const h = compact ? 34 : 46;
  const btn = (icon: IconName, label: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(next)}
      hitSlop={4}
      style={({ pressed }) => ({ width: h, height: h, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={compact ? 16 : 18} color={colors.fg} />
    </Pressable>
  );
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`Quantity ${value}`}
      style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: RADIUS.pill, height: h }}>
      {btn(value <= min && min === 0 ? 'trash-outline' : 'remove', 'Decrease quantity', value - 1, value <= min && min !== 0)}
      <RNText maxFontSizeMultiplier={1.3} style={{ minWidth: 22, textAlign: 'center', fontSize: compact ? 15 : 16, ...font('600'), color: colors.fg }}>
        {value}
      </RNText>
      {btn('add', 'Increase quantity', value + 1, value >= max)}
    </View>
  );
}

// ---------------------------------------------------------------- Bottom sheet
export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '88%',
              paddingBottom: footer ? 0 : Math.max(insets.bottom, 16),
              width: '100%',
              maxWidth: 640,
              alignSelf: 'center',
            }}>
            <View style={{ alignItems: 'center', paddingTop: 8 }}>
              <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text variant="title3" accessibilityRole="header">
                {title}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 16 }}>
              {children}
            </ScrollView>
            {footer && <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: colors.lineSubtle }}>{footer}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- Decorative
/** Soft radial glow (indigo/purple) used behind hero renders. */
export function Glow({ style, colorsList = ['rgba(88,86,214,0.55)', 'rgba(175,82,222,0.35)'] }: { style?: StyleProp<ViewStyle>; colorsList?: [string, string] }) {
  // closest-side keeps both glows fully faded inside the box (no hard edges).
  const bg = `radial-gradient(closest-side at 50% 55%, ${colorsList[0]} 0%, transparent 100%), radial-gradient(closest-side at 70% 40%, ${colorsList[1]} 0%, transparent 100%)`;
  const s = Platform.OS === 'web' ? ({ backgroundImage: bg } as unknown as ViewStyle) : ({ experimental_backgroundImage: bg } as ViewStyle);
  return <View pointerEvents="none" style={[{ position: 'absolute' }, s, style]} />;
}

export function Gradient({ name, style, children }: { name: keyof typeof GRADIENTS; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const g = GRADIENTS[name];
  return (
    <LinearGradient colors={[g[0], g[1], g[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

export function Logo({ size = 28, light }: { size?: number; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="image" accessibilityLabel="Unibody">
      <Gradient name="brand" style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="construct-outline" size={size * 0.58} color="#fff" />
      </Gradient>
      <RNText maxFontSizeMultiplier={1.3} style={{ fontSize: 18, ...font('700'), letterSpacing: -0.4, color: light ? '#f5f5f7' : colors.fg }}>
        Unibody
      </RNText>
    </View>
  );
}
