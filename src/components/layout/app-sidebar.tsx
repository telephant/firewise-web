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
        <SidebarHeader className="border-b">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookIcon className="h-4 w-4" />
            </div>
            <span className="font-semibold">Firewise</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Ledgers</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setCreateDialogOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <SidebarMenuItem key={i}>
                        <Skeleton className="h-8 w-full" />
                      </SidebarMenuItem>
                    ))}
                  </>
                ) : ledgers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No ledgers yet.
                    <br />
                    <button
                      onClick={() => setCreateDialogOpen(true)}
                      className="text-primary hover:underline"
                    >
                      Create your first ledger
                    </button>
                  </div>
                ) : (
                  ledgers.map((ledger: Ledger) => (
                    <SidebarMenuItem key={ledger.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/dashboard/ledger/${ledger.id}`}
                      >
                        <Link href={`/dashboard/ledger/${ledger.id}`}>
                          <BookIcon className="h-4 w-4" />
                          <span className="truncate">{ledger.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
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
