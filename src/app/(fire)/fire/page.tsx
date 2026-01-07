'use client';

import { useEffect, useState } from 'react';
import { AddFlowDialog } from '@/components/fire/add-flow';
import {
  retro,
  Button,
  SidebarTrigger,
  IconDollar,
  IconArrow,
  IconChart,
  IconTransfer,
  IconPlus,
} from '@/components/fire/ui';
import {
  NetWorthCard,
  FireProgressCard,
  AssetList,
  FlowList,
  ExpenseCard,
  StatsRow,
} from '@/components/fire/dashboard';

// Quick action buttons for common flows
const QUICK_ACTIONS = [
  { id: 'salary', label: 'Got Paid', Icon: IconDollar, rotate: 0 },
  { id: 'expense', label: 'Spent', Icon: IconArrow, rotate: 90 },
  { id: 'invest', label: 'Invested', Icon: IconChart, rotate: 0 },
  { id: 'transfer', label: 'Transferred', Icon: IconTransfer, rotate: 0 },
];

export default function FireDashboardPage() {
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState<string>('');

  // Set date on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }));
  }, []);

  const openWithCategory = (categoryId?: string) => {
    setInitialCategory(categoryId);
    setIsAddFlowOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `2px solid ${retro.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: retro.text }}>
            FIRE Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: retro.muted }}>
            {currentDate}
          </span>
          <Button size="sm" variant="primary" onClick={() => openWithCategory()} className="gap-1.5">
            <IconPlus size={12} />
            <span>Record</span>
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          Quick Actions
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className="px-4 py-2.5"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `2px solid ${retro.border}`,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              size="sm"
              onClick={() => openWithCategory(action.id)}
              className="gap-1.5"
            >
              <span style={{ display: 'inline-block', transform: action.rotate ? `rotate(${action.rotate}deg)` : undefined }}>
                <action.Icon size={14} />
              </span>
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Main Content - All components fetch their own data via SWR
      ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* ROW 1: Hero Cards (Net Worth + FIRE Progress) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NetWorthCard />
            <FireProgressCard />
          </div>

          {/* ROW 2: Quick Stats (4 metrics) */}
          <StatsRow />

          {/* ROW 3: Details (Assets + Expenses + Recent Flows) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AssetList />
            <ExpenseCard />
            <FlowList />
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          Add Flow Dialog
      ═══════════════════════════════════════════════════════════════ */}
      <AddFlowDialog
        open={isAddFlowOpen}
        onOpenChange={(open) => {
          setIsAddFlowOpen(open);
          if (!open) setInitialCategory(undefined);
        }}
        initialCategory={initialCategory}
      />
    </div>
  );
}
