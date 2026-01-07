'use client';

import * as React from 'react';
import {
  Sidebar as BaseSidebar,
  SidebarContent as BaseSidebarContent,
  SidebarFooter as BaseSidebarFooter,
  SidebarGroup as BaseSidebarGroup,
  SidebarGroupContent as BaseSidebarGroupContent,
  SidebarHeader as BaseSidebarHeader,
  SidebarInset as BaseSidebarInset,
  SidebarMenu as BaseSidebarMenu,
  SidebarMenuButton as BaseSidebarMenuButton,
  SidebarMenuItem as BaseSidebarMenuItem,
  SidebarProvider as BaseSidebarProvider,
  SidebarTrigger as BaseSidebarTrigger,
} from '@/components/ui/sidebar';
import { retro, retroStyles } from './theme';

// Re-export with Retro styling applied

export function SidebarProvider({ children, ...props }: React.ComponentProps<typeof BaseSidebarProvider>) {
  return <BaseSidebarProvider {...props}>{children}</BaseSidebarProvider>;
}

export function Sidebar({ children, style, ...props }: React.ComponentProps<typeof BaseSidebar>) {
  return (
    <BaseSidebar
      style={{
        '--sidebar-background': 'transparent',
        '--sidebar-foreground': retro.text,
        '--sidebar-border': retro.border,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </BaseSidebar>
  );
}

export function SidebarInset({ children, style, ...props }: React.ComponentProps<typeof BaseSidebarInset>) {
  return (
    <BaseSidebarInset
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        ...style,
      }}
      {...props}
    >
      {children}
    </BaseSidebarInset>
  );
}

export function SidebarTrigger({ className, ...props }: Omit<React.ComponentProps<typeof BaseSidebarTrigger>, 'style'>) {
  return (
    <BaseSidebarTrigger
      className={className}
      style={{
        backgroundColor: retro.surface,
        border: `2px solid ${retro.border}`,
        boxShadow: `inset -1px -1px 0 ${retro.bevelDark}, inset 1px 1px 0 ${retro.bevelLight}, 2px 2px 0 ${retro.bevelDark}`,
        color: retro.text,
        borderRadius: '2px',
      }}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<typeof BaseSidebarHeader>) {
  return <BaseSidebarHeader className={className || 'p-3'} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<typeof BaseSidebarContent>) {
  return <BaseSidebarContent className={className || 'px-2'} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<typeof BaseSidebarFooter>) {
  return <BaseSidebarFooter className={className || 'p-3'} {...props} />;
}

export function SidebarGroup(props: React.ComponentProps<typeof BaseSidebarGroup>) {
  return <BaseSidebarGroup {...props} />;
}

export function SidebarGroupContent(props: React.ComponentProps<typeof BaseSidebarGroupContent>) {
  return <BaseSidebarGroupContent {...props} />;
}

export function SidebarMenu(props: React.ComponentProps<typeof BaseSidebarMenu>) {
  return <BaseSidebarMenu {...props} />;
}

export function SidebarMenuItem(props: React.ComponentProps<typeof BaseSidebarMenuItem>) {
  return <BaseSidebarMenuItem {...props} />;
}

export function SidebarMenuButton({
  isActive,
  className,
  style,
  ...props
}: React.ComponentProps<typeof BaseSidebarMenuButton>) {
  return (
    <BaseSidebarMenuButton
      isActive={isActive}
      className={className || 'rounded-sm px-3 py-2 transition-all'}
      style={
        isActive
          ? {
              ...retroStyles.sunken,
              color: retro.text,
              fontWeight: 500,
              ...style,
            }
          : {
              color: retro.text,
              backgroundColor: 'transparent',
              fontWeight: 400,
              ...style,
            }
      }
      {...props}
    />
  );
}
