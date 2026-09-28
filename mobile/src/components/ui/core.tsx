import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { RADIUS, type Palette } from '@/theme/tokens';
import { font } from '@/theme/fonts';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.fg} style={style} />;
}

// ---------------------------------------------------------------- Text
const VARIANTS = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  title1: { fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.6 },
  title2: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.4 },
  title3: { fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2 },
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof VARIANTS;
type ColorKey = 'fg' | 'muted' | 'subtle' | 'accent' | 'link' | 'success' | 'warning' | 'danger' | 'purple' | 'heroFg' | 'heroMuted' | 'onAccent' | 'onInverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorKey | (string & {});
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}

export function Text({ variant = 'body', color = 'fg', weight, center, style, maxFontSizeMultiplier = 1.6, ...rest }: TextProps) {
  const { colors } = useTheme();
  const c = (colors as unknown as Record<string, string>)[color] ?? color;
  // Final weight: style override > weight prop > variant — then map it to the matching Inter face.
  const w = StyleSheet.flatten(style)?.fontWeight ?? weight ?? VARIANTS[variant].fontWeight;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[VARIANTS[variant], { color: c }, center ? { textAlign: 'center' } : null, style, font(w)]}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------- Button
type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

function buttonColors(p: Palette, v: ButtonVariant): { bg: string; fg: string; border?: string } {
  switch (v) {
    case 'primary':
      return { bg: p.accent, fg: p.onAccent };
    case 'dark':
      return { bg: p.inverse, fg: p.onInverse };
    case 'light':
      return { bg: '#ffffff', fg: '#1d1d1f' };
    case 'glass':
      return { bg: 'rgba(255,255,255,0.14)', fg: '#ffffff', border: 'rgba(255,255,255,0.22)' };
    case 'secondary':
      return { bg: p.surface2, fg: p.fg };
    case 'outline':
      return { bg: 'transparent', fg: p.fg, border: p.line };
    case 'danger':
      return { bg: p.dangerSoft, fg: p.danger };
    default:
      return { bg: 'transparent', fg: p.accent };
  }
}

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', size = 'md', icon, iconRight, loading, full, disabled, style, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const c = buttonColors(colors, variant);
  const h = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  const fs = size === 'sm' ? 14 : size === 'lg' ? 17 : 16;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          minHeight: h,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          borderRadius: RADIUS.pill,
          backgroundColor: c.bg,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={fs + 2} color={c.fg} />}
          <RNText maxFontSizeMultiplier={1.4} style={{ color: c.fg, fontSize: fs, ...font('600') }} numberOfLines={1}>
            {title}
          </RNText>
          {iconRight && <Ionicons name={iconRight} size={fs + 1} color={c.fg} />}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 40,
  variant = 'secondary',
  color,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  size?: number;
  variant?: 'secondary' | 'primary' | 'ghost' | 'outline';
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surface2 : 'transparent';
  const fg = color ?? (variant === 'primary' ? colors.onAccent : colors.fg);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fg} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- Card / layout
export function Card({ children, style, padded = true, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; tone?: 'surface' | 'muted' }) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'muted' ? colors.surface2 : colors.surface,
          borderRadius: RADIUS.card,
          padding: padded ? 16 : 0,
          borderWidth: scheme === 'dark' || tone === 'muted' ? 0 : 1,
          borderColor: colors.lineSubtle,
          boxShadow: tone === 'muted' ? undefined : colors.shadow,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.lineSubtle, marginLeft: inset }, style]} />;
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }, style]}>
      <Text variant="title2" accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="subhead" color="accent" weight="500">
            {action}
          </Text>
          <AccentChevron />
        </Pressable>
      )}
    </View>
  );
}

function AccentChevron() {
  const { colors } = useTheme();
  return <Ionicons name="chevron-forward" size={14} color={colors.accent} />;
}

// ---------------------------------------------------------------- Input
export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: ReactNode;
  prefix?: string;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, error, hint, prefix, right, containerStyle, style, editable = true, ...rest }: InputProps) {
  const { colors, scheme } = useTheme();
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text variant="footnote" color="muted" weight="500">
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.line,
          backgroundColor: editable ? colors.surface : colors.surface2,
          paddingHorizontal: 14,
          gap: 8,
        }}>
        {prefix && (
          <Text variant="body" color="muted">
            {prefix}
          </Text>
        )}
        <TextInput
          placeholderTextColor={colors.subtle}
          keyboardAppearance={scheme}
          selectionColor={colors.accent}
          accessibilityLabel={label ?? rest.placeholder}
          editable={editable}
          maxFontSizeMultiplier={1.5}
          style={[
            { flex: 1, minWidth: 0, color: colors.fg, fontSize: 16, paddingVertical: 12 },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
            style,
          ]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        typeof hint === 'string' ? (
          <Text variant="footnote" color="muted">
            {hint}
          </Text>
        ) : (
          hint
        )
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Pills / segmented
export function Pill({ label, active, onPress, left, count }: { label: string; active?: boolean; onPress?: () => void; left?: ReactNode; count?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 40,
        paddingLeft: left ? 6 : 16,
        paddingRight: 16,
        borderRadius: RADIUS.pill,
        backgroundColor: active ? colors.inverse : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.inverse : colors.line,
        opacity: pressed ? 0.8 : 1,
      })}>
      {left}
      <RNText maxFontSizeMultiplier={1.3} style={{ color: active ? colors.onInverse : colors.fg, fontSize: 14, ...font('600') }}>
        {label}
        {count !== undefined ? ` · ${count}` : ''}
      </RNText>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: IconName }[]; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 12, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: active ? colors.surface : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : undefined,
            }}>
            {o.icon && <Ionicons name={o.icon} size={16} color={active ? colors.fg : colors.muted} />}
            <RNText maxFontSizeMultiplier={1.3} style={{ fontSize: 14, ...font('600'), color: active ? colors.fg : colors.muted }}>
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- Row
export function ListRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  chevron = true,
}: {
  icon?: IconName;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
      {icon && (
        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: iconBg ?? colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={iconColor ?? colors.fg} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="callout" weight="500">
          {title}
        </Text>
        {subtitle && (
          <Text variant="footnote" color="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {onPress && chevron && <Ionicons name="chevron-forward" size={18} color={colors.subtle} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Skeleton / states
export function Skeleton({ width, height = 16, radius = 8, style }: { width?: ViewStyle['width']; height?: ViewStyle['height']; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [v] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2, opacity: v }, style]} />;
}

export function EmptyState({ icon = 'cube-outline', title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text variant="title3" center>
        {title}
      </Text>
      {body && (
        <Text variant="subhead" color="muted" center style={{ maxWidth: 300 }}>
          {body}
        </Text>
      )}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn’t load this"
      body={message}
      action={onRetry ? <Button title="Try again" variant="secondary" icon="refresh-outline" onPress={onRetry} /> : undefined}
    />
  );
}

export function Notice({ tone = 'info', icon, children, style }: { tone?: 'info' | 'success' | 'warning' | 'danger'; icon?: IconName; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const map = {
    info: [colors.accentSoft, colors.accent],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[{ flexDirection: 'row', gap: 10, backgroundColor: bg, borderRadius: RADIUS.md, padding: 12, alignItems: 'flex-start' }, style]}>
      <Ionicons name={icon ?? (tone === 'success' ? 'checkmark-circle' : tone === 'info' ? 'information-circle-outline' : 'alert-circle-outline')} size={18} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text variant="footnote" color={fg}>{children}</Text> : children}</View>
    </View>
  );
}
