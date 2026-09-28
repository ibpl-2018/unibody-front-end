import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './ui';

/** 6-box OTP entry backed by one hidden TextInput (supports SMS autofill / paste). */
export function OtpInput({ value, onChange, onComplete, error, autoFocus = true }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; error?: boolean; autoFocus?: boolean }) {
  const { colors, scheme } = useTheme();
  const ref = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="One-time code" accessibilityHint="Enter the 6-digit code sent by SMS">
      <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="none">
        {digits.map((d, i) => {
          const focused = i === Math.min(value.length, 5);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 54,
                maxWidth: 52,
                borderRadius: 12,
                borderWidth: focused ? 2 : 1,
                borderColor: error ? colors.danger : focused ? colors.accent : colors.line,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text variant="title2">{d.trim()}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, '').slice(0, 6);
          onChange(v);
          if (v.length === 6) onComplete?.(v);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        keyboardAppearance={scheme}
        maxLength={6}
        autoFocus={autoFocus}
        caretHidden
        style={{ position: 'absolute', opacity: 0.011, width: '100%', height: '100%' }}
        accessibilityLabel="One-time code"
      />
    </Pressable>
  );
}
