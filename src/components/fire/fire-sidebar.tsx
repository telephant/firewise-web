'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  colors,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  IconHome,
  IconTransfer,
  IconChart,
  IconBell,
  IconArrow,
  IconSettings,
  IconRepeat,
  IconDebt,
  IconEye,
  IconEyeOff,
} from '@/components/fire/ui';
import { TaxSettingsDialog } from '@/components/fire/tax-settings-dialog';
import { CurrencyPreferencesDialog } from '@/components/fire/currency-preferences-dialog';
import { FamilySettingsDialog } from '@/components/fire/family/family-settings-dialog';
import { ViewModeSwitcher } from '@/components/fire/family/view-mode-switcher';
import { transactionApi } from '@/lib/fire/api';
import { usePrivacy } from '@/contexts/fire/privacy-context';

const navItems = [
  {
    title: 'Dashboard',
    href: '/fire',
    icon: IconHome,
  },
  {
    title: 'Transactions',
    href: '/fire/transactions',
    icon: IconTransfer,
  },
  {
    title: 'Recurring',
    href: '/fire/recurring',
    icon: IconRepeat,
  },
  {
    title: 'Assets',
    href: '/fire/assets',
    icon: IconChart,
  },
  {
    title: 'Debts',
    href: '/fire/debts',
    icon: IconDebt,
  },
  {
    title: 'Review',
    href: '/fire/review',
    icon: IconBell,
    showBadge: true,
  },
];

export function FireSidebar() {
  const pathname = usePathname();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [taxSettingsOpen, setTaxSettingsOpen] = useState(false);
  const [currencySettingsOpen, setCurrencySettingsOpen] = useState(false);
  const [familySettingsOpen, setFamilySettingsOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  // Fetch review count for badge
  const { data: reviewCount } = useSWR(
    '/fire/transactions/review-count',
    async () => {
      const res = await transactionApi.getReviewCount();
      return res.success ? res.data?.count || 0 : 0;
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/fire" className="flex items-center gap-2 px-1 transition-opacity duration-150 hover:opacity-80">
            <div>
              <span className="text-base font-bold tracking-tight" style={{ color: colors.text }}>
                FIRE
              </span>
              <span className="block text-[10px] -mt-0.5" style={{ color: colors.muted }}>
                Financial Independence
              </span>
            </div>
          </Link>
          <button
            onClick={togglePrivacyMode}
            className="p-1.5 rounded-md transition-colors hover:bg-[#252528]"
            style={{ color: isPrivacyMode ? colors.accent : colors.muted }}
            title={isPrivacyMode ? 'Show amounts' : 'Hide amounts'}
          >
            {isPrivacyMode ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>
        <ViewModeSwitcher className="mt-2" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const badgeCount = item.showBadge && reviewCount ? reviewCount : 0;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2">
                          <Icon size={16} />
                          <span>{item.title}</span>
                        </span>
                        {badgeCount > 0 && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                            style={{
                              backgroundColor: colors.warning,
                              color: colors.text,
                            }}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings section */}
        <SidebarGroup>
          <div className="px-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}>
                  <span className="flex items-center gap-2">
                    <IconSettings size={16} />
                    <span>Settings</span>
                  </span>
                  <span
                    className="text-[10px] ml-auto transition-transform"
                    style={{
                      color: colors.muted,
                      transform: settingsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▶
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {settingsMenuOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setFamilySettingsOpen(true)} className="pl-6">
                      <span className="text-xs">Family</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrencySettingsOpen(true)} className="pl-6">
                      <span className="text-xs">Currency</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setTaxSettingsOpen(true)} className="pl-6">
                      <span className="text-xs">Tax Rates</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div
          className="rounded-md p-2 transition-colors duration-150 hover:bg-[#252528]"
          style={{
            backgroundColor: colors.surfaceLight,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
          }}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-between text-xs transition-colors duration-150 hover:text-[#EDEDEF]"
            style={{ color: colors.muted }}
          >
            <span>Expense Tracker</span>
            <IconArrow size={12} />
          </Link>
        </div>
      </SidebarFooter>

      <TaxSettingsDialog open={taxSettingsOpen} onOpenChange={setTaxSettingsOpen} />
      <CurrencyPreferencesDialog open={currencySettingsOpen} onOpenChange={setCurrencySettingsOpen} />
      <FamilySettingsDialog open={familySettingsOpen} onOpenChange={setFamilySettingsOpen} />
    </Sidebar>
  );
}
