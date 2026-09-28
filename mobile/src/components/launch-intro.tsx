import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Fixed brand palette — the intro looks the same in light and dark, like the native splash it continues from.
const BG = '#000000';
const GRADIENT = ['#5e5ce6', '#af52de', '#ff375f'] as const; // app-icon gradient
const BEZEL = '#1c1c1e';
const ALU = ['#e5e5ea', '#aeaeb2', '#8e8e93'] as const;
const ACCENT = '#2997ff';

const TILE = 96; // native splash imageWidth (app.json) — the intro starts from this exact tile
const TILE_RADIUS = 22;
const EXIT_AT = 2650; // ms — when we zoom into the screen (unless tapped earlier)
const WORD = 'Unibody'.split('');
const GLOW_LAYERS = Array.from({ length: 12 }, (_, i) => 1 - i * 0.07); // 1 → 0.23
const ICON = require('../../assets/images/splash-icon.png');

/** Runs a JS callback after `ms` and returns a cancel function. */
const after = (ms: number, fn: () => void) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

/**
 * Animated launch intro, shown over the first screen on every app start.
 *
 * The app-icon tile grows into a MacBook display → the bezel and aluminium base assemble around it (clunk) →
 * the wrench ratchets twice (tick, tick) → a light sweep runs across the metal → "Unibody" rises in →
 * we zoom through the screen into the app. Tap to skip. With Reduce Motion it's a short fade.
 */
export function LaunchIntro({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReducedMotion();

  // Laptop geometry, centred on the display so the exit zoom lands exactly on the screen.
  const LW = Math.min(W * 0.66, 300);
  const LH = Math.round(LW * 0.64);
  const BEZ = Math.max(6, Math.round(LW * 0.028));
  const BW = LW + BEZ * 2 + LW * 0.14;
  const BH = Math.max(10, Math.round(LW * 0.05));
  const cx = W / 2;
  const cy = H / 2 - LH * 0.18;

  const iconFade = useSharedValue(1); // native-splash tile image → our live tile
  const morph = useSharedValue(0); // 0 = icon tile, 1 = laptop display
  const bezel = useSharedValue(0);
  const base = useSharedValue(0);
  const wrench = useSharedValue(0); // rotation, degrees
  const sheen = useSharedValue(0);
  const glow = useSharedValue(0);
  // One per letter of "Unibody" (7) — explicit calls keep the hook order fixed.
  const word = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const tagline = useSharedValue(0);
  const zoom = useSharedValue(0);
  const fade = useSharedValue(1);
  const exiting = useRef(false);
  const timers = useRef<(() => void)[]>([]);

  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;
    timers.current.forEach((c) => c());
    if (reduce) {
      fade.value = withTiming(0, { duration: 260 }, (fin) => {
        if (fin) scheduleOnRN(onDone);
      });
      return;
    }
    morph.value = withTiming(1, { duration: 120 }); // in case of an early tap
    bezel.value = withTiming(1, { duration: 120 });
    base.value = withTiming(1, { duration: 120 });
    zoom.value = withTiming(1, { duration: 560, easing: Easing.in(Easing.cubic) });
    fade.value = withDelay(380, withTiming(0, { duration: 260 }, (fin) => {
      if (fin) scheduleOnRN(onDone);
    }));
  };

  useEffect(() => {
    const pending = timers.current;
    if (reduce) {
      pending.push(after(700, exit));
      return () => pending.forEach((c) => c());
    }
    const tick = (style: Haptics.ImpactFeedbackStyle) => void Haptics.impactAsync(style).catch(() => {});
    const sel = () => void Haptics.selectionAsync().catch(() => {});

    iconFade.value = withDelay(120, withTiming(0, { duration: 220 }));
    morph.value = withDelay(150, withSpring(1, { damping: 17, stiffness: 120 }));
    glow.value = withDelay(250, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    bezel.value = withDelay(520, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    base.value = withDelay(640, withSpring(1, { damping: 13, stiffness: 150 }));
    // Two ratchet strokes: swing back, snap forward.
    const stroke = () => withSequence(withTiming(-38, { duration: 170, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 9, stiffness: 320 }));
    wrench.value = withDelay(1000, withSequence(stroke(), stroke()));
    sheen.value = withDelay(1250, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
    word.forEach((w, i) => {
      w.value = withDelay(1350 + i * 55, withSpring(1, { damping: 14, stiffness: 170 }));
    });
    tagline.value = withDelay(1850, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));

    pending.push(
      after(760, () => tick(Haptics.ImpactFeedbackStyle.Medium)), // base clunks into place
      after(1180, sel), // tick
      after(1520, sel), // tick
      after(EXIT_AT, exit),
    );
    return () => pending.forEach((c) => c());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per launch
  }, []);

  // Display: grows from the 96pt icon tile to the laptop screen.
  const displayStyle = useAnimatedStyle(() => ({
    width: interpolate(morph.value, [0, 1], [TILE, LW]),
    height: interpolate(morph.value, [0, 1], [TILE, LH]),
    borderRadius: interpolate(morph.value, [0, 1], [TILE_RADIUS, 4]),
  }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconFade.value }));
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(morph.value, [0, 1], [1, 1.15]) }, { rotate: `${wrench.value}deg` }],
  }));
  const bezelStyle = useAnimatedStyle(() => ({
    opacity: bezel.value,
    transform: [{ scale: interpolate(bezel.value, [0, 1], [1.12, 1]) }],
  }));
  const baseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(base.value, [0, 0.2, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(base.value, [0, 1], [H * 0.3, 0]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 0.4, 1], [0, 0.9, 0.55]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.4, 1]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [10, 0]) }],
  }));
  // Exit: everything but the display falls away while we scale through the screen.
  const zoomScale = (Math.max(W / LW, H / LH) * 1.25);
  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(zoom.value, [0, 1], [1, zoomScale]) }],
  }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: interpolate(zoom.value, [0, 0.35], [1, 0], 'clamp') }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (reduce) {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: BG }, rootStyle]} accessibilityLabel="Unibody">
        <StatusBar style="light" />
        <Image source={ICON} style={{ width: TILE, height: TILE }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: BG }, rootStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={exit} accessibilityRole="button" accessibilityLabel="Unibody. Tap to skip the intro." accessibilityViewIsModal>
        <StatusBar style="light" />
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [cx, cy, 0] }, stageStyle]} pointerEvents="none">
          {/* Soft coloured bloom behind the machine */}
          <Animated.View style={[styles.abs, { left: cx - LW, top: cy - LW, width: LW * 2, height: LW * 2 }, glowStyle]}>
            {/* Many faint layers read as a smooth radial falloff (no radial gradient in RN). */}
            {GLOW_LAYERS.map((s, i) => (
              <View
                key={s}
                style={[styles.abs, { left: LW * (1 - s), top: LW * (1 - s), width: LW * 2 * s, height: LW * 2 * s, borderRadius: LW * s, backgroundColor: GRADIENT[Math.min(2, Math.floor((i * 3) / GLOW_LAYERS.length))], opacity: 0.045 }]}
              />
            ))}
          </Animated.View>

          <Animated.View style={chromeStyle}>
            {/* Lid bezel */}
            <Animated.View
              style={[styles.abs, { left: cx - LW / 2 - BEZ, top: cy - LH / 2 - BEZ, width: LW + BEZ * 2, height: LH + BEZ * 2, borderRadius: 12, backgroundColor: BEZEL, borderWidth: 1, borderColor: '#3a3a3c' }, bezelStyle]}
            >
              <View style={[styles.camera, { left: (LW + BEZ * 2) / 2 - 2, top: BEZ / 2 - 2 }]} />
            </Animated.View>
            {/* Aluminium base with thumb notch */}
            <Animated.View style={[styles.abs, { left: cx - BW / 2, top: cy + LH / 2 + BEZ, width: BW, height: BH }, baseStyle]}>
              <LinearGradient colors={ALU} style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: BH, borderBottomRightRadius: BH, borderTopLeftRadius: 2, borderTopRightRadius: 2, overflow: 'hidden' }]}>
                <Sheen progress={sheen} width={BW} />
              </LinearGradient>
              <View style={[styles.notch, { left: BW / 2 - BW * 0.08, width: BW * 0.16, height: BH * 0.38 }]} />
            </Animated.View>
          </Animated.View>

          {/* Display (starts as the app-icon tile) */}
          <View style={[styles.abs, styles.center, { left: cx - LW / 2, top: cy - LH / 2, width: LW, height: LH }]}>
            <Animated.View style={[styles.center, { overflow: 'hidden' }, displayStyle]}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Sheen progress={sheen} width={LW} />
              <Animated.View style={glyphStyle}>
                <Ionicons name="build" size={TILE * 0.5} color="#fff" />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, iconStyle]}>
                <Image source={ICON} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.abs, { left: 0, right: 0, top: cy + LH / 2 + BEZ + BH + 36, alignItems: 'center' }, chromeStyle]}>
            <View style={styles.word}>
              {WORD.map((ch, i) => (
                <Letter key={i} ch={ch} progress={word[i]!} />
              ))}
            </View>
            <Animated.Text style={[styles.tagline, taglineStyle]}>Genuine. Tested. Delivered.</Animated.Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** One wordmark letter rising out of a mask. */
function Letter({ ch, progress }: { ch: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [40, 0]) }],
  }));
  return (
    <View style={styles.mask}>
      <Animated.Text style={[styles.letter, style]}>{ch}</Animated.Text>
    </View>
  );
}

/** A diagonal band of light sweeping left → right across brushed metal / glass. */
function Sheen({ progress, width }: { progress: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-width * 0.6, width * 1.2]) }, { skewX: '-20deg' }],
  }));
  return (
    <Animated.View style={[styles.sheen, { width: width * 0.35 }, style]} pointerEvents="none">
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#48484a' },
  notch: { position: 'absolute', top: 0, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: '#8e8e93' },
  sheen: { position: 'absolute', top: -20, bottom: -20, left: 0 },
  word: { flexDirection: 'row' },
  mask: { overflow: 'hidden', paddingBottom: 4 },
  letter: { color: '#fff', fontSize: 38, fontWeight: '700', letterSpacing: -0.8 },
  tagline: { marginTop: 6, color: ACCENT, fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
});

