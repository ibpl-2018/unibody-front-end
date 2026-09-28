import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider, useCart } from '@/state/cart';
import { SessionProvider, useSession } from '@/state/session';
import { StoreConfigProvider } from '@/state/store-config';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { colors, scheme, ready: themeReady } = useTheme();
  const { ready: cartReady } = useCart();
  const { ready: sessionReady } = useSession();
  const ready = themeReady && cartReady && sessionReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.accent, background: colors.bg, card: colors.bg, text: colors.fg, border: colors.lineSubtle, notification: colors.danger },
    };
  }, [scheme, colors]);

  if (!ready) return null;

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.fg, fontWeight: '600' },
          headerStyle: { backgroundColor: colors.bg },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
        <Stack.Screen name="shop/[family]" options={{ title: '' }} />
        <Stack.Screen name="parts" options={{ title: 'Parts' }} />
        <Stack.Screen name="product/[slug]" options={{ title: '' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="confirmation/[orderNo]" options={{ title: 'Order placed', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="order/[orderNo]" options={{ title: 'Track order' }} />
        <Stack.Screen name="track" options={{ title: 'Track an order' }} />
        <Stack.Screen name="more" options={{ title: 'Help & settings' }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StoreConfigProvider>
          <SessionProvider>
            <CartProvider>
              <Navigator />
            </CartProvider>
          </SessionProvider>
        </StoreConfigProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
