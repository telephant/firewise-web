'use client';

import { SidebarProvider, SidebarInset, Celebration } from '@/components/fire/ui';
import { FireSidebar } from '@/components/fire/fire-sidebar';
import { FlowDataProvider } from '@/contexts/fire/flow-data-context';
import { FinancialStatsProvider } from '@/contexts/fire/financial-stats-context';
import { ViewModeProvider } from '@/contexts/fire/view-mode-context';
import { Toaster } from '@/components/ui/sonner';

export default function FireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewModeProvider>
      <FlowDataProvider>
        <FinancialStatsProvider>
          <div className="fixed inset-0 -z-10 bg-[#0A0A0B]" />
          <div className="dark">
            <SidebarProvider>
              <FireSidebar />
              <SidebarInset>
                {children}
              </SidebarInset>
              <Toaster />
              <Celebration />
            </SidebarProvider>
          </div>
        </FinancialStatsProvider>
      </FlowDataProvider>
    </ViewModeProvider>
  );
}
