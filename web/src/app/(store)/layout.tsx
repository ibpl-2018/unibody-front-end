import { StoreProviders } from '@/lib/store/providers';
import { getStoreConfig } from '@/lib/store/data';
import { StoreShell } from '@/components/store/chrome/shell';
import { FocusFooter, StoreFooter } from '@/components/store/chrome/footer';
import { StoreLaunchIntro } from '@/components/store/launch-intro';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const config = await getStoreConfig();
  return (
    <>
      {/* Once-per-session brand intro; server-rendered so its first frame paints with the HTML */}
      <StoreLaunchIntro />
      <StoreProviders config={config}>
        <StoreShell footer={<StoreFooter config={config} />} focusFooter={<FocusFooter config={config} />}>
          {children}
        </StoreShell>
      </StoreProviders>
    </>
  );
}
