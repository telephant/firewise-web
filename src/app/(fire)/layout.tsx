import { PortfolioSidebar } from '@/components/fire/portfolio-sidebar';
import { FireTopBar } from '@/components/fire/top-bar';

export default function FireLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0B' }}>
      <PortfolioSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <FireTopBar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
