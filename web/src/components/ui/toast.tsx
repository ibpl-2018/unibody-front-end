'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }
const Ctx = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Lightweight toasts: const toast = useToast(); toast('Saved'); toast('Failed', 'error') */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-fg px-4 py-2.5 text-sm text-bg shadow-xl')}>
            {t.kind === 'success' ? <CheckCircle2 className="size-4 text-[#30d158]" /> : t.kind === 'error' ? <AlertCircle className="size-4 text-[#ff453a]" /> : <Info className="size-4" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
