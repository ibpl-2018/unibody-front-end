'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Short beep: high = OK, low = problem (warehouse feedback without looking at the screen). */
export function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1200 : 220;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.35));
  } catch {}
}

/**
 * Barcode entry: a USB / Bluetooth scanner "types" the code and presses Enter into this field.
 * On phones with a camera, "Use camera" reads Code 128 labels via the browser's BarcodeDetector.
 */
export function ScanInput({ onScan, disabled, placeholder = 'Scan a unit barcode (or type the code and press Enter)', busy }: { onScan: (code: string) => void | Promise<void>; disabled?: boolean; placeholder?: string; busy?: boolean }) {
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDetector = typeof window !== 'undefined' && !!window.BarcodeDetector;

  useEffect(() => {
    if (!disabled && !busy) inputRef.current?.focus();
  }, [disabled, busy]);

  useEffect(() => {
    if (!camera || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let stop = false;
    let last = '';
    const detector = new window.BarcodeDetector({ formats: ['code_128'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        while (!stop) {
          const found = await detector.detect(videoRef.current).catch(() => []);
          const v = found[0]?.rawValue?.trim();
          if (v && v !== last) {
            last = v;
            await onScan(v.toUpperCase());
            setTimeout(() => (last = ''), 1500);
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setCamera(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, onScan]);

  const submit = async () => {
    const v = code.trim().toUpperCase();
    if (!v) return;
    setCode('');
    await onScan(v);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className={cn('flex h-12 flex-1 items-center gap-2 rounded-xl border-2 bg-surface px-3 transition', disabled ? 'border-line opacity-60' : 'border-accent')}>
          <ScanLine className="size-5 shrink-0 text-accent" />
          <input
            ref={inputRef}
            aria-label="Scan unit code"
            value={code}
            disabled={disabled}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void submit())}
            placeholder={placeholder}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] uppercase tracking-wider outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-subtle"
          />
        </div>
        <Button className="h-12" onClick={submit} disabled={disabled || !code.trim()} loading={busy}>
          Add
        </Button>
        {hasDetector && (
          <Button variant="outline" className="h-12 px-3" aria-label={camera ? 'Stop camera' : 'Use camera'} onClick={() => setCamera((c) => !c)} disabled={disabled}>
            {camera ? <CameraOff className="size-5" /> : <Camera className="size-5" />}
          </Button>
        )}
      </div>
      {camera && <video ref={videoRef} className="aspect-video w-full max-w-md rounded-2xl bg-black object-cover" muted playsInline />}
    </div>
  );
}
