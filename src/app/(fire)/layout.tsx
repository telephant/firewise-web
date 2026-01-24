'use client';

import { SidebarProvider, SidebarInset, retro, Celebration } from '@/components/fire/ui';
import { FireSidebar } from '@/components/fire/fire-sidebar';
import { FlowDataProvider } from '@/contexts/fire/flow-data-context';
import { FinancialStatsProvider } from '@/contexts/fire/financial-stats-context';
import { Toaster } from '@/components/ui/sonner';

// Two-tone background with curved divider (matching ui-example4.png)
function TwoToneBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base wheat color */}
      <div className="absolute inset-0" style={{ backgroundColor: retro.bgWheat }} />

      {/* Multiple blue flowing shapes with smooth curves */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Top left corner */}
        <path
          d="M 0,0
             L 18,0
             C 14,6 10,12 6,16
             C 2,20 0,18 0,12
             Z"
          fill={retro.bgBlue}
        />

        {/* Left side upper */}
        <path
          d="M 0,30
             C 8,32 15,40 12,52
             C 9,64 3,68 0,70
             Z"
          fill={retro.bgBlue}
        />

        {/* Left side lower */}
        <path
          d="M 0,78
             C 6,80 10,86 8,94
             C 6,100 0,100 0,100
             Z"
          fill={retro.bgBlue}
        />

        {/* Top center blob */}
        <path
          d="M 35,8
             C 42,5 50,8 52,15
             C 54,22 48,28 40,28
             C 32,28 28,22 30,15
             C 31,10 33,9 35,8
             Z"
          fill={retro.bgBlue}
        />

        {/* Main blue shape - top right */}
        <path
          d="M 100,0
             L 65,0
             C 50,0 45,15 50,28
             C 55,42 70,48 100,52
             Z"
          fill={retro.bgBlue}
        />

        {/* Center blob */}
        <path
          d="M 45,45
             C 52,42 60,46 62,54
             C 64,62 58,68 50,68
             C 42,68 36,62 38,54
             C 39,48 42,46 45,45
             Z"
          fill={retro.bgBlue}
        />

        {/* Right side middle */}
        <path
          d="M 100,42
             C 80,45 70,55 72,68
             C 74,80 85,88 100,92
             Z"
          fill={retro.bgBlue}
        />

        {/* Bottom left blob */}
        <path
          d="M 20,85
             C 28,82 36,86 38,94
             C 39,100 30,100 22,100
             L 12,100
             C 12,95 14,88 20,85
             Z"
          fill={retro.bgBlue}
        />

        {/* Bottom center */}
        <path
          d="M 55,90
             C 62,88 70,92 72,100
             L 58,100
             C 54,98 53,94 55,90
             Z"
          fill={retro.bgBlue}
        />

        {/* Bottom right flowing */}
        <path
          d="M 100,82
             C 85,82 65,88 45,100
             L 100,100
             Z"
          fill={retro.bgBlue}
        />
      </svg>
    </div>
  );
}

export default function FireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FlowDataProvider>
      <FinancialStatsProvider>
        <TwoToneBackground />
        <SidebarProvider>
          <FireSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
          <Toaster />
          <Celebration />
        </SidebarProvider>
      </FinancialStatsProvider>
    </FlowDataProvider>
  );
}
