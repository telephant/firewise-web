'use client';

import { SidebarProvider, SidebarInset, Celebration } from '@/components/fire/ui';
import { FireSidebar } from '@/components/fire/fire-sidebar';
import { FinancialStatsProvider } from '@/contexts/fire/financial-stats-context';
import { ViewModeProvider } from '@/contexts/fire/view-mode-context';
import { PrivacyProvider } from '@/contexts/fire/privacy-context';
import { ChatProvider, useChat } from '@/contexts/fire/chat-context';
import { ChatSidePanel, ChatToggleButton, PreviewPanel } from '@/components/fire/chat';
import { Toaster } from '@/components/ui/sonner';
import { useIsMobile } from '@/hooks/use-mobile';

// Inner layout that has access to chat context
function FireLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, previewData, clearPreview, confirmPreview } = useChat();
  const isMobile = useIsMobile();

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-[#0A0A0B]" />
      <div className="dark h-screen flex flex-col overflow-hidden">
        <SidebarProvider>
          <div className="flex flex-1 min-h-0">
            <FireSidebar />
            <SidebarInset>
              {/* Main content with optional preview overlay */}
              <div className="relative h-full">
                {children}

                {/* Preview Panel - Main Stage Hijack (overlays main content, not chat) */}
                {previewData && (
                  <PreviewPanel
                    previewData={previewData}
                    onConfirm={confirmPreview}
                    onCancel={clearPreview}
                  />
                )}
              </div>
            </SidebarInset>

            {/* Desktop: Side panel in layout flow */}
            {isOpen && !isMobile && <ChatSidePanel />}
          </div>
          <Toaster />
          <Celebration />

          {/* Mobile: Full-screen overlay */}
          {isOpen && isMobile && <ChatSidePanel isMobile />}

          {/* Floating toggle button (shown when chat is closed) */}
          {!isOpen && (
            <div className="fixed bottom-6 right-6 z-50">
              <ChatToggleButton className="w-14 h-14 rounded-full shadow-lg" />
            </div>
          )}
        </SidebarProvider>
      </div>
    </>
  );
}

export default function FireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewModeProvider>
      <PrivacyProvider>
        <FinancialStatsProvider>
          <ChatProvider>
            <FireLayoutInner>{children}</FireLayoutInner>
          </ChatProvider>
        </FinancialStatsProvider>
      </PrivacyProvider>
    </ViewModeProvider>
  );
}
