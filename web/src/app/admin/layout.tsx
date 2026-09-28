import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Unibody Admin' },
  robots: { index: false, follow: false },
};

/** /admin has its own chrome (no storefront header/footer). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
