'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLedgers } from '@/hooks/use-ledgers';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { ledgers, loading } = useLedgers();

  useEffect(() => {
    if (!loading && ledgers.length > 0) {
      router.replace(`/dashboard/ledger/${ledgers[0].id}`);
    }
  }, [loading, ledgers, router]);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  }

  if (ledgers.length === 0) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] p-4 text-center">
          <h2 className="text-2xl font-semibold mb-2">Welcome to Firewise</h2>
          <p className="text-muted-foreground mb-4">
            Create your first ledger to start tracking expenses.
          </p>
          <p className="text-sm text-muted-foreground">
            Click &quot;+&quot; in the sidebar to create a ledger.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </>
  );
}
