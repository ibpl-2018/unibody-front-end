import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

// Fixed brand palette (app-icon gradient + store accent) — the intro looks the same in light and dark,
// like the native splash it continues from.
const BG = '#000000'; // app.json → expo-splash-screen.backgroundColor (light + dark)
const INDIGO = '#5e5ce6';
const PURPLE = '#af52de';
const PINK = '#ff375f';
const BLUE = '#2997ff';
const WHITE = '#ffffff';

// app.json → expo-splash-screen.image / imageWidth. The first frame renders this image at this size, centred.
const SPLASH_IMAGE = require('../../assets/images/splash-icon.png');
const LOGO = 96;

const HOLD = 300; // ms on the exact launch frame
const EXIT_AT = 2450; // ms — curtains start (unless tapped earlier)
const CURTAIN_MS = 620;
const CURTAIN_GAP = 110;
const WORD = 'Unibody'.split('');
const GLOW = 340;

/** Stable pseudo-random 0…1 (keeps render pure — no Math.random). */
const jitter = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Kind = 'screw' | 'chip' | 'paper';
type Particle = { kind: Kind; angle: number; dist: number; size: number; color: string; spin: number; drop: number };

/**
 * Animated launch intro, shown over the first screen (Home) on every app start.
 *
 * Launch frame holds → the logo squeezes and springs up with a glow and pulsing rings → four corner brackets
 * snap onto it and a burst of screws, chips and paper confetti flies out → "Unibody" pops in letter by letter,
 * then the tagline → the logo zooms out and three torn-paper curtains split from the middle, revealing the app.
 * Tap anywhere to skip to the reveal. With Reduce Motion it's a 0.25 s fade.
 */
export function LaunchIntro({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReducedMotion();

  const cx = W / 2;
  const cy = H / 2; // the native splash centres the image on the full screen
  const LIFT = -Math.round(H * 0.085); // logo rises to make room for the wordmark
  const BIG = 1.55;

  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const glow = useSharedValue(0);
  const rings = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const snap = useSharedValue(0);
  const burst = useSharedValue(0);
  const wobble = useSharedValue(0);
  // One per letter of "Unibody" (7) — explicit calls keep the hook order fixed.
  const letters = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const tagline = useSharedValue(0);
  const content = useSharedValue(1); // 1 → 0 on exit
  const curtains = [useSharedValue(0), useSharedValue(0), useSharedValue(0)]; // front → back: 0 closed, 1 open
  const fade = useSharedValue(1); // reduce-motion path
  const [split, setSplit] = useState(false); // drops the solid backdrop once the curtains start moving
  const exiting = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const kind: Kind = i % 3 === 0 ? 'paper' : i % 3 === 1 ? 'chip' : 'screw';
        return {
          kind,
          angle: (i / 26) * Math.PI * 2 + (jitter(i, 1) - 0.5) * 0.4,
          dist: 120 + jitter(i, 2) * 130,
          size: kind === 'paper' ? 9 + jitter(i, 3) * 8 : kind === 'chip' ? 8 + jitter(i, 3) * 5 : 7 + jitter(i, 3) * 4,
          color: [INDIGO, PURPLE, PINK, BLUE, WHITE][i % 5]!,
          spin: (jitter(i, 4) - 0.5) * 900,
          drop: 30 + jitter(i, 5) * 60,
        };
      }),
    [],
  );

  const light = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;
    timers.current.forEach(clearTimeout);
    if (reduce) {
      fade.value = withTiming(0, { duration: 250 }, (fin) => {
        if (fin) scheduleOnRN(onDone);
      });
      return;
    }
    light();
    setSplit(true);
    content.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) });
    curtains.forEach((c, i) => {
      c.value = withDelay(
        90 + i * CURTAIN_GAP,
        withTiming(1, { duration: CURTAIN_MS, easing: Easing.inOut(Easing.cubic) }, (fin) => {
          if (fin && i === curtains.length - 1) scheduleOnRN(onDone);
        }),
      );
    });
  };

  useEffect(() => {
    const pending = timers.current;
    if (reduce) {
      pending.push(setTimeout(exit, 450));
      return () => pending.forEach(clearTimeout);
    }
    const t0 = HOLD;
    // Comes alive: a small squeeze, then springs up bigger and rises.
    scale.value = withDelay(t0, withSequence(withTiming(0.86, { duration: 150, easing: Easing.out(Easing.quad) }), withSpring(BIG, { damping: 8, stiffness: 150 })));
    lift.value = withDelay(t0 + 180, withSpring(LIFT, { damping: 12, stiffness: 120 }));
    glow.value = withDelay(t0 + 120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    rings.forEach((r, i) => {
      r.value = withDelay(t0 + 160 + i * 200, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    });
    // Parts snap on, then everything bursts out.
    snap.value = withDelay(t0 + 120, withTiming(1, { duration: 260, easing: Easing.in(Easing.back(1.6)) }));
    burst.value = withDelay(t0 + 380, withTiming(1, { duration: 1150, easing: Easing.out(Easing.cubic) }));
    wobble.value = withDelay(t0 + 700, withRepeat(withSequence(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 520, easing: Easing.inOut(Easing.sin) })), -1, true));
    letters.forEach((l, i) => {
      l.value = withDelay(t0 + 800 + i * 70, withSpring(1, { damping: 12, stiffness: 210 }));
    });
    tagline.value = withDelay(t0 + 1450, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));

    pending.push(setTimeout(light, t0 + 380), setTimeout(exit, EXIT_AT));
    return () => pending.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per launch
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }, { rotate: `${wobble.value * 2}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 0.35, 1], [0, 1, 0.8]),
    transform: [{ translateY: lift.value }, { scale: interpolate(glow.value, [0, 1], [0.3, 1.2]) }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ scale: interpolate(content.value, [0, 1], [1.15, 1]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [14, 0]) }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (reduce) {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: BG }, fadeStyle]} accessibilityLabel="Unibody">
        <StatusBar style="light" />
        <Image source={SPLASH_IMAGE} style={{ width: LOGO, height: LOGO }} />
      </Animated.View>
    );
  }

  const logoTop = cy - LOGO / 2;
  const wordTop = cy + LIFT + (LOGO * BIG) / 2 + 34;
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={exit} accessibilityRole="button" accessibilityLabel="Unibody. Tap to skip the intro." accessibilityViewIsModal>
      <StatusBar style="light" />
      {/* Torn-paper curtains, back → front: pink, purple, black (the launch background). */}
      {[PINK, PURPLE, BG].map((color, i) => (
        <Curtain key={color} color={color} progress={curtains[2 - i]!} W={W} H={H} seed={i} />
      ))}
      {/* Solid launch background until the curtains start to move (hides the seams between halves). */}
      {!split && <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} pointerEvents="none" />}

      <Animated.View style={[StyleSheet.absoluteFill, contentStyle]} pointerEvents="none">
        <Animated.View style={[styles.abs, { left: cx - GLOW / 2, top: cy - GLOW / 2, width: GLOW, height: GLOW }, glowStyle]}>
          <Svg width={GLOW} height={GLOW}>
            <Defs>
              <RadialGradient id="ubGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={PURPLE} stopOpacity={0.6} />
                <Stop offset="0.4" stopColor={INDIGO} stopOpacity={0.3} />
                <Stop offset="1" stopColor={INDIGO} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#ubGlow)" />
          </Svg>
        </Animated.View>

        {rings.map((r, i) => (
          <Ring key={i} progress={r} lift={lift} cx={cx} cy={cy} />
        ))}

        {particles.map((p, i) => (
          <Piece key={i} p={p} progress={burst} cx={cx} cy={cy + LIFT} />
        ))}

        {/* The logo — starts as the exact native splash image */}
        <Animated.View style={[styles.abs, { left: cx - LOGO / 2, top: logoTop, width: LOGO, height: LOGO }, logoStyle]}>
          <Image source={SPLASH_IMAGE} style={{ width: LOGO, height: LOGO }} />
          {[0, 1, 2, 3].map((c) => (
            <Bracket key={c} corner={c} progress={snap} />
          ))}
        </Animated.View>

        <View style={[styles.abs, styles.word, { left: 0, right: 0, top: wordTop }]}>
          {WORD.map((ch, i) => (
            <Letter key={i} ch={ch} progress={letters[i]!} />
          ))}
        </View>
        <Animated.Text style={[styles.abs, styles.tagline, { left: 0, right: 0, top: wordTop + 52 }, taglineStyle]}>Genuine parts for every Mac</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** An L-shaped corner bracket that flies in and snaps onto one corner of the logo. */
function Bracket({ corner, progress }: { corner: number; progress: SharedValue<number> }) {
  const sx = corner % 2 === 0 ? -1 : 1;
  const sy = corner < 2 ? -1 : 1;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [sx * 70, 0]) }, { translateY: interpolate(progress.value, [0, 1], [sy * 70, 0]) }],
  }));
  const pos = { [sx < 0 ? 'left' : 'right']: -7, [sy < 0 ? 'top' : 'bottom']: -7 };
  const border = {
    [sx < 0 ? 'borderLeftWidth' : 'borderRightWidth']: 3,
    [sy < 0 ? 'borderTopWidth' : 'borderBottomWidth']: 3,
    [`border${sy < 0 ? 'Top' : 'Bottom'}${sx < 0 ? 'Left' : 'Right'}Radius`]: 9,
  };
  return <Animated.View style={[styles.bracket, pos, border, style]} />;
}

/** A pulsing ring that expands from the logo and fades. */
function Ring({ progress, lift, cx, cy }: { progress: SharedValue<number>; lift: SharedValue<number>; cx: number; cy: number }) {
  const R = 120;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ translateY: lift.value }, { scale: interpolate(progress.value, [0, 1], [0.5, 2.1]) }],
  }));
  return <Animated.View style={[styles.abs, styles.ring, { left: cx - R / 2, top: cy - R / 2, width: R, height: R, borderRadius: R / 2 }, style]} />;
}

/** One burst piece: a screw head, a chip or a spinning paper confetto. */
function Piece({ p, progress, cx, cy }: { p: Particle; progress: SharedValue<number>; cx: number; cy: number }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: interpolate(t, [0, 0.05, 0.7, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: Math.cos(p.angle) * p.dist * t },
        { translateY: Math.sin(p.angle) * p.dist * t + p.drop * t * t },
        { rotate: `${p.spin * t}deg` },
        { scale: interpolate(t, [0, 0.15, 1], [0.2, 1, 0.8]) },
      ],
    };
  });
  const w = p.kind === 'paper' ? p.size * 0.55 : p.size;
  const shape =
    p.kind === 'screw'
      ? { borderRadius: p.size / 2, borderWidth: 2, borderColor: p.color, backgroundColor: 'transparent' }
      : p.kind === 'chip'
        ? { borderRadius: 2, backgroundColor: p.color }
        : { borderRadius: 1, backgroundColor: p.color };
  return (
    <Animated.View style={[styles.abs, styles.center, { left: cx - w / 2, top: cy - p.size / 2, width: w, height: p.size }, shape, style]}>
      {p.kind === 'screw' && <View style={{ width: p.size * 0.55, height: 2, backgroundColor: p.color }} />}
    </Animated.View>
  );
}

/** One wordmark letter that pops in with a bouncy spring. */
function Letter({ ch, progress }: { ch: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [22, 0]) }, { scale: interpolate(progress.value, [0, 1], [0.5, 1]) }],
  }));
  return <Animated.Text style={[styles.letter, style]}>{ch}</Animated.Text>;
}

/** Zig-zag "torn" edge x-offsets down the middle of the screen (deterministic per curtain). */
function tornEdge(H: number, seed: number) {
  const steps = 26;
  return Array.from({ length: steps + 1 }, (_, i) => ({ y: (i / steps) * H, dx: (i % 2 ? 1 : -1) * (6 + jitter(i, seed + 7) * 10) }));
}

/** A full-screen curtain that splits along a torn edge; each half slides out to its side. */
function Curtain({ color, progress, W, H, seed }: { color: string; progress: SharedValue<number>; W: number; H: number; seed: number }) {
  const half = W / 2;
  const edge = useMemo(() => tornEdge(H, seed), [H, seed]);
  const OVERLAP = 1.5; // halves overlap slightly so no hairline shows while closed
  const leftPts = [`0,0`, ...edge.map((e) => `${half + e.dx + OVERLAP},${e.y}`), `0,${H}`].join(' ');
  const rightPts = [`${W},0`, ...edge.map((e) => `${half + e.dx - OVERLAP},${e.y}`), `${W},${H}`].join(' ');
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -progress.value * (half + 30) }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * (half + 30) }] }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, leftStyle]} pointerEvents="none">
        <Svg width={W} height={H}>
          <Polygon points={leftPts} fill={color} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, rightStyle]} pointerEvents="none">
        <Svg width={W} height={H}>
          <Polygon points={rightPts} fill={color} />
        </Svg>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  bracket: { position: 'absolute', width: 26, height: 26, borderColor: WHITE },
  ring: { borderWidth: 2, borderColor: PURPLE },
  word: { flexDirection: 'row', justifyContent: 'center' },
  letter: { color: WHITE, fontSize: 40, fontWeight: '800', letterSpacing: -0.8 },
  tagline: { textAlign: 'center', color: BLUE, fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
});
