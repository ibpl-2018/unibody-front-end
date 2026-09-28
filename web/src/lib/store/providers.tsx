'use client';
import type { StoreConfigDTO } from '@unibody/shared';
import { StoreConfigProvider } from './config';
import { CartProvider } from './cart';
import { MyDeviceProvider } from './device';
import { SessionProvider } from './session';

export function StoreProviders({ config, children }: { config: StoreConfigDTO; children: React.ReactNode }) {
  return (
    <StoreConfigProvider config={config}>
      <SessionProvider>
        <MyDeviceProvider>
          <CartProvider>{children}</CartProvider>
        </MyDeviceProvider>
      </SessionProvider>
    </StoreConfigProvider>
  );
}
