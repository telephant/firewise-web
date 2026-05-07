import { PortfolioSidebar } from '@/components/fire/portfolio-sidebar';
import { FireTopBar } from '@/components/fire/top-bar';
import { PageContextProvider } from '@/components/fire/page-context';
import { CurrencyProvider } from '@/components/fire/currency-context';
import { PrivacyProvider } from '@/components/fire/privacy-context';

export default function FireLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyProvider>
    <CurrencyProvider>
      <PageContextProvider>
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0A0A0B', overflow: 'hidden' }}>
          <PortfolioSidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <FireTopBar />
            <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {children}
            </main>
          </div>
        </div>
      </PageContextProvider>
    </CurrencyProvider>
    </PrivacyProvider>
  );
}
