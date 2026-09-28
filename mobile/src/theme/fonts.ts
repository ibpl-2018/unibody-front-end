import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import type { TextStyle } from 'react-native';

/** Only the weights the app uses (per-weight imports keep the other 13 Inter files out of the bundle). */
export const INTER_FONTS = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold };

const FACE: Record<string, keyof typeof INTER_FONTS> = {
  normal: 'Inter_400Regular',
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
};

/**
 * Inter at a given weight. Custom fonts are one family per weight in React Native (Android ignores
 * fontWeight for them), so the family carries the weight and fontWeight is reset to avoid faux-bold on iOS.
 */
export function font(weight: TextStyle['fontWeight'] = '400'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily: FACE[String(weight)] ?? 'Inter_400Regular', fontWeight: 'normal' };
}
