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
import { colors } from './theme';

// Re-export with dark theme styling applied

export function SidebarProvider({ children, ...props }: React.ComponentProps<typeof BaseSidebarProvider>) {
  return <BaseSidebarProvider {...props}>{children}</BaseSidebarProvider>;
}

export function Sidebar({ children, style, className, ...props }: React.ComponentProps<typeof BaseSidebar>) {
  return (
    <BaseSidebar
      style={{
        '--sidebar-background': 'transparent',
        '--sidebar-foreground': colors.text,
        '--sidebar-border': colors.border,
        ...style,
      } as React.CSSProperties}
      className={`${className || ''} [&_[data-slot=sidebar-inner]]:bg-transparent`}
      {...props}
    >
      {children}
    </BaseSidebar>
  );
}

export function SidebarInset({ children, style, className, ...props }: React.ComponentProps<typeof BaseSidebarInset>) {
  return (
    <BaseSidebarInset
      style={{
        backgroundColor: 'transparent',
        height: '100vh',
        overflow: 'auto',
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </BaseSidebarInset>
  );
}

export function SidebarTrigger({ className, ...props }: Omit<React.ComponentProps<typeof BaseSidebarTrigger>, 'style'>) {
  return (
    <BaseSidebarTrigger
      className={`${className || ''} transition-all duration-150 hover:bg-[#1C1C1E] hover:border-white/[0.15] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50`}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '6px',
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
      className={`${className || ''} rounded-md px-3 py-2 transition-all duration-150 ${!isActive ? 'hover:bg-white/[0.04]' : ''}`}
      style={
        isActive
          ? {
              backgroundColor: colors.surfaceLight,
              color: colors.text,
              fontWeight: 500,
              ...style,
            }
          : {
              color: colors.muted,
              backgroundColor: 'transparent',
              fontWeight: 400,
              ...style,
            }
      }
      {...props}
    />
  );
}
