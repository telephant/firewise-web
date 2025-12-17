'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ExpenseList } from '@/components/expense/expense-list';
import { LedgerSettings } from '@/components/ledger/ledger-settings';
import { InviteUserDialog } from '@/components/ledger/invite-user-dialog';
import { useLedgers } from '@/hooks/use-ledgers';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { Ledger } from '@/types';

export default function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ledgerId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { ledgers, loading, updateLedger, deleteLedger } = useLedgers();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && ledgers.length > 0) {
      const found = ledgers.find((l) => l.id === ledgerId);
      if (found) {
        setLedger(found);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [ledgerId, ledgers, loading, router]);

  const handleUpdate = async (data: { name?: string; description?: string }) => {
    if (!ledger) return;
    const updated = await updateLedger(ledger.id, data);
    setLedger({ ...ledger, ...updated });
  };

  const handleDelete = async () => {
    if (!ledger) return;
    await deleteLedger(ledger.id);
    router.replace('/dashboard');
  };

  if (loading || !ledger) {
    return (
      <>
        <Header>
          <Skeleton className="h-6 w-32" />
        </Header>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={ledger.name}>
        <LedgerSettings
          ledger={ledger}
          onMembersClick={() => setMembersDialogOpen(true)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Header>

      <ExpenseList ledgerId={ledgerId} />

      {user && (
        <InviteUserDialog
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          ledger={ledger}
          currentUserId={user.id}
        />
      )}
    </>
  );
}
