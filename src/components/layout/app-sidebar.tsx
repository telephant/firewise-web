'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CreateLedgerDialog } from '@/components/ledger/create-ledger-dialog';
import { useLedgers } from '@/hooks/use-ledgers';
import type { Ledger } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { ledgers, loading, createLedger } = useLedgers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateLedger = async (data: { name: string; description?: string }) => {
    await createLedger(data);
    setCreateDialogOpen(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-4">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
              <FlameIcon className="h-5 w-5" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight">Firewise</span>
              <span className="text-[10px] text-muted-foreground font-medium">Expense Tracker</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledgers</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => setCreateDialogOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <SidebarMenuItem key={i}>
                        <Skeleton className="h-10 w-full rounded-lg" />
                      </SidebarMenuItem>
                    ))}
                  </>
                ) : ledgers.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <SparklesIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">No ledgers yet</p>
                    <button
                      onClick={() => setCreateDialogOpen(true)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Create your first ledger
                    </button>
                  </div>
                ) : (
                  ledgers.map((ledger: Ledger) => {
                    const isActive = pathname === `/dashboard/ledger/${ledger.id}`;
                    return (
                      <SidebarMenuItem key={ledger.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`h-10 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium shadow-sm'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <Link href={`/dashboard/ledger/${ledger.id}`}>
                            <BookIcon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                            <span className="truncate">{ledger.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

      </Sidebar>

      <CreateLedgerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateLedger}
      />
    </>
  );
}
