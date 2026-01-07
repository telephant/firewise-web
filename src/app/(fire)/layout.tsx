'use client';

import { SidebarProvider, SidebarInset, retro } from '@/components/fire/ui';
import { FireSidebar } from '@/components/fire/fire-sidebar';
import { FlowDataProvider } from '@/contexts/fire/flow-data-context';
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
        {/* Left side blue shape */}
        <path
          d="M 0,30
             C 8,32 15,40 12,52
             C 9,64 3,68 0,70
             Z"
          fill={retro.bgBlue}
        />

        {/* Main blue shape - top right flowing down */}
        <path
          d="M 100,0
             L 65,0
             C 50,0 45,15 50,28
             C 55,42 70,48 100,52
             Z"
          fill={retro.bgBlue}
        />

        {/* Second blue shape - right side middle */}
        <path
          d="M 100,42
             C 80,45 70,55 72,68
             C 74,80 85,88 100,92
             Z"
          fill={retro.bgBlue}
        />

        {/* Third blue shape - bottom flowing left */}
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
      <TwoToneBackground />
      <SidebarProvider>
        <FireSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </FlowDataProvider>
  );
}
