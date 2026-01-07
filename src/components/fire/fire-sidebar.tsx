'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  retro,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/fire/ui';

const navItems = [
  {
    title: 'Dashboard',
    href: '/fire',
  },
  {
    title: 'Flows',
    href: '/fire/flows',
  },
  {
    title: 'Assets',
    href: '/fire/assets',
  },
];

export function FireSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/fire" className="flex items-center gap-2">
          <span className="text-lg font-medium" style={{ color: retro.text }}>
            FIRE
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Link
          href="/dashboard"
          className="text-sm transition-colors"
          style={{ color: retro.muted }}
        >
          Expense Tracker →
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
