import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { useCart } from '@/state/cart';
import { useTheme } from '@/theme/ThemeProvider';

type IconPair = [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']];
const ICONS: Record<string, IconPair> = {
  index: ['home', 'home-outline'],
  shop: ['grid', 'grid-outline'],
  search: ['search', 'search-outline'],
  bag: ['bag-handle', 'bag-handle-outline'],
  orders: ['cube', 'cube-outline'],
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.lineSubtle,
          ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8 } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          const pair = ICONS[route.name] ?? ICONS.index;
          return <Ionicons name={focused ? pair[0] : pair[1]} size={size - 2} color={color} />;
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen
        name="bag"
        options={{
          title: 'Bag',
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: '#fff', fontSize: 11 },
          tabBarAccessibilityLabel: count > 0 ? `Bag, ${count} items` : 'Bag',
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
    </Tabs>
  );
}
