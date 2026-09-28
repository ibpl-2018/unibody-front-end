'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/** Code 128 barcode as SVG — read by any USB / Bluetooth barcode scanner. */
export function Barcode({ value, height = 40, width = 1.6, className }: { value: string; height?: number; width?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, value, { format: 'CODE128', height, width, margin: 0, displayValue: false, background: 'transparent' });
  }, [value, height, width]);
  return <svg ref={ref} className={className} role="img" aria-label={`Barcode ${value}`} data-code={value} />;
}
