'use client';
import Link from 'next/link';
import { ChevronLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui';

/** Toolbar + grey backdrop for printable documents. Paper is always white (it is a document). */
export function PrintFrame({ back, title, children, pageCss }: { back: { href: string; label: string }; title: string; children: React.ReactNode; pageCss: string }) {
  return (
    <div className="min-h-dvh bg-bg-2 print:bg-white">
      <style>{`@media print { @page { ${pageCss} } html, body { background: #fff !important; } }`}</style>
      <div className="no-print glass sticky top-0 z-10 flex items-center gap-3 border-b border-line-subtle px-4 py-3 sm:px-6">
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
        <p className="mx-auto hidden text-sm font-semibold sm:block">{title}</p>
        <Button size="sm" onClick={() => window.print()} className="ml-auto sm:ml-0">
          <Printer className="size-4" />
          Print
        </Button>
      </div>
      <div className="px-3 py-6 sm:px-6 sm:py-10 print:p-0">{children}</div>
    </div>
  );
}
