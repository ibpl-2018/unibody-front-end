'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DeviceModelDTO } from '@unibody/shared';
import { KEYS, readJSON, writeJSON } from './storage';
import { modelShort } from './catalog';

/** The shopper's own device ("My device") — remembered in localStorage and used for "Fits your …" hints. */
export interface MyDevice {
  id: string;
  familySlug: string;
  familyName: string;
  name: string;
  fullName: string;
  short: string;
  aNumbers: string[];
}

export const toMyDevice = (m: DeviceModelDTO): MyDevice => ({
  id: m.id,
  familySlug: m.familySlug,
  familyName: m.familyName,
  name: m.name,
  fullName: m.fullName,
  short: modelShort(m),
  aNumbers: m.aNumbers,
});

interface DeviceCtx {
  device: MyDevice | null;
  setDevice: (m: DeviceModelDTO | MyDevice | null) => void;
  /** true if the product (by its modelIds) fits the saved device */
  fits: (modelIds: string[]) => boolean;
}
const Ctx = createContext<DeviceCtx>({ device: null, setDevice: () => {}, fits: () => false });

export function MyDeviceProvider({ children }: { children: React.ReactNode }) {
  const [device, setState] = useState<MyDevice | null>(null);
  useEffect(() => {
    const d = readJSON<MyDevice | null>(KEYS.device, null);
    if (d && typeof d.id === 'string') setState(d);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.device) setState(readJSON<MyDevice | null>(KEYS.device, null));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const setDevice = useCallback((m: DeviceModelDTO | MyDevice | null) => {
    const d = m ? ('short' in m ? m : toMyDevice(m)) : null;
    setState(d);
    writeJSON(KEYS.device, d);
  }, []);
  const fits = useCallback((ids: string[]) => !!device && ids.includes(device.id), [device]);
  const value = useMemo(() => ({ device, setDevice, fits }), [device, setDevice, fits]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMyDevice = () => useContext(Ctx);
