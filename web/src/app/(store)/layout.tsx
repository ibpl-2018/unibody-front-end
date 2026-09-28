import { StoreProviders } from '@/lib/store/providers';
import { getStoreConfig } from '@/lib/store/data';
import { StoreShell } from '@/components/store/chrome/shell';
import { FocusFooter, StoreFooter } from '@/components/store/chrome/footer';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const config = await getStoreConfig();
  return (
    <StoreProviders config={config}>
      <StoreShell footer={<StoreFooter config={config} />} focusFooter={<FocusFooter config={config} />}>
        {children}
      </StoreShell>
    </StoreProviders>
  );
}
