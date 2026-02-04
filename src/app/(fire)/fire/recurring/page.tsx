'use client';

import { useState, useMemo } from 'react';
import {
  colors,
  SidebarTrigger,
  Card,
  Loader,
  IconTrash,
  IconPause,
  IconPlay,
  Button,
  IconPlus,
} from '@/components/fire/ui';
import { getCategoryIcon } from '@/components/fire/ui/category-icons';
import { AddFlowDialog } from '@/components/fire/add-flow';
import { useRecurringSchedules, useAssets, useUserPreferences } from '@/hooks/fire/use-fire-data';
import { recurringScheduleApi } from '@/lib/fire/api';
import { formatCurrency } from '@/lib/fire/utils';
import type { RecurringScheduleWithDetails, ScheduleFrequency, AssetWithBalance } from '@/types/fire';

// Frequency labels
const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  const diffDays = Math.ceil((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays <= 7) {
    return `In ${diffDays} days`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

// Get flow color based on type
function getFlowColor(type: string): string {
  switch (type) {
    case 'income':
      return colors.positive;
    case 'expense':
      return colors.negative;
    default:
      return colors.text;
  }
}

export default function RecurringPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);

  // Fetch recurring schedules
  const { schedules, isLoading, mutate } = useRecurringSchedules({ limit: 100 });

  // Fetch assets for name lookup
  const { assets } = useAssets({ limit: 200 });

  // Get user preferences for currency
  const { preferences } = useUserPreferences();
  const displayCurrency = preferences?.convert_all_to_preferred
    ? preferences.preferred_currency
    : 'USD';

  // Create asset lookup map
  const assetMap = useMemo(() => {
    const map = new Map<string, AssetWithBalance>();
    assets.forEach((asset) => map.set(asset.id, asset));
    return map;
  }, [assets]);

  // Filter active schedules only (or show all with status)
  const activeSchedules = useMemo(() => {
    return schedules.filter((s) => s.is_active);
  }, [schedules]);

  const inactiveSchedules = useMemo(() => {
    return schedules.filter((s) => !s.is_active);
  }, [schedules]);

  // Group by frequency
  const groupedSchedules = useMemo(() => {
    const groups: Record<ScheduleFrequency, RecurringScheduleWithDetails[]> = {
      weekly: [],
      biweekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };

    activeSchedules.forEach((schedule) => {
      groups[schedule.frequency].push(schedule);
    });

    // Sort each group by next_run_date
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => new Date(a.next_run_date).getTime() - new Date(b.next_run_date).getTime());
    });

    return groups;
  }, [activeSchedules]);

  // Calculate totals
  const totals = useMemo(() => {
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    activeSchedules.forEach((schedule) => {
      const amount = schedule.flow_template.amount;
      let monthlyAmount = amount;

      // Convert to monthly equivalent
      switch (schedule.frequency) {
        case 'weekly':
          monthlyAmount = amount * 4.33;
          break;
        case 'biweekly':
          monthlyAmount = amount * 2.17;
          break;
        case 'quarterly':
          monthlyAmount = amount / 3;
          break;
        case 'yearly':
          monthlyAmount = amount / 12;
          break;
      }

      if (schedule.flow_template.type === 'income') {
        monthlyIncome += monthlyAmount;
      } else if (schedule.flow_template.type === 'expense') {
        monthlyExpense += monthlyAmount;
      }
    });

    return { monthlyIncome, monthlyExpense, netMonthly: monthlyIncome - monthlyExpense };
  }, [activeSchedules]);

  const getFromTo = (schedule: RecurringScheduleWithDetails): string => {
    const template = schedule.flow_template;
    const fromAsset = template.from_asset_id ? assetMap.get(template.from_asset_id) : null;
    const toAsset = template.to_asset_id ? assetMap.get(template.to_asset_id) : null;

    const from = fromAsset?.name ||
      (template.metadata as Record<string, unknown>)?.source_name as string ||
      'External';
    const to = toAsset?.name || 'External';
    return `${from} → ${to}`;
  };

  const handleToggleActive = async (schedule: RecurringScheduleWithDetails) => {
    setTogglingId(schedule.id);
    try {
      await recurringScheduleApi.update(schedule.id, { is_active: !schedule.is_active });
      await mutate();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (schedule: RecurringScheduleWithDetails) => {
    if (!confirm(`Delete this recurring ${schedule.flow_template.type}?`)) return;

    setDeletingId(schedule.id);
    try {
      await recurringScheduleApi.delete(schedule.id);
      await mutate();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const renderScheduleRow = (schedule: RecurringScheduleWithDetails, index: number, total: number) => {
    const template = schedule.flow_template;
    const isDeleting = deletingId === schedule.id;
    const isToggling = togglingId === schedule.id;

    return (
      <div
        key={schedule.id}
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: schedule.is_active ? colors.surfaceLight : colors.surface,
          borderBottom: index < total - 1 ? `1px solid ${colors.surfaceLight}` : 'none',
          opacity: schedule.is_active ? 1 : 0.6,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span>{getCategoryIcon(template.category || template.type, 16)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium capitalize truncate"
                style={{ color: colors.text }}
              >
                {template.category || template.type}
              </span>
              {!schedule.is_active && (
                <span
                  className="text-[10px] px-1 rounded"
                  style={{ backgroundColor: colors.muted, color: colors.surface }}
                >
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs truncate" style={{ color: colors.muted }}>
              {getFromTo(schedule)}
              {template.description && ` · ${template.description}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Next occurrence */}
          <div className="text-right">
            <div className="text-xs" style={{ color: colors.muted }}>
              Next
            </div>
            <div className="text-xs font-medium" style={{ color: colors.text }}>
              {formatDate(schedule.next_run_date)}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right min-w-[80px]">
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: getFlowColor(template.type) }}
            >
              {template.type === 'income' ? '+' : template.type === 'expense' ? '−' : ''}
              {formatCurrency(template.amount, { currency: template.currency })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleActive(schedule)}
              disabled={isToggling}
              className="p-1 rounded-sm hover:bg-[var(--hover)] disabled:opacity-50"
              style={{
                color: schedule.is_active ? colors.muted : colors.positive,
                '--hover': colors.surfaceLight,
              } as React.CSSProperties}
              title={schedule.is_active ? 'Pause' : 'Resume'}
            >
              {schedule.is_active ? <IconPause size={14} /> : <IconPlay size={14} />}
            </button>
            <button
              onClick={() => handleDelete(schedule)}
              disabled={isDeleting}
              className="p-1 rounded-sm hover:bg-[var(--hover)] disabled:opacity-50"
              style={{
                color: colors.negative,
                '--hover': colors.surfaceLight,
              } as React.CSSProperties}
              title="Delete"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>
            Recurring Flows
          </h1>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsAddFlowOpen(true)}
          className="gap-1.5"
        >
          <IconPlus size={12} />
          <span>Add Recurring</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Monthly Income
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: colors.positive }}>
                  {formatCurrency(totals.monthlyIncome, { currency: displayCurrency })}
                </p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Monthly Expenses
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: colors.negative }}>
                  {formatCurrency(totals.monthlyExpense, { currency: displayCurrency })}
                </p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Net Monthly
                </p>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: totals.netMonthly >= 0 ? colors.positive : colors.negative }}
                >
                  {totals.netMonthly >= 0 ? '+' : ''}
                  {formatCurrency(totals.netMonthly, { currency: displayCurrency })}
                </p>
              </div>
            </Card>
          </div>

          {/* Active Recurring Schedules */}
          <Card title={`Active Schedules (${activeSchedules.length})`}>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader size="md" variant="bar" />
              </div>
            ) : activeSchedules.length === 0 ? (
              <div
                className="h-[200px] flex flex-col items-center justify-center text-sm gap-2"
                style={{ color: colors.muted }}
              >
                <span>No recurring flows set up yet</span>
                <span className="text-xs">
                  Create a flow with a recurring frequency to get started
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {(['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly'] as ScheduleFrequency[]).map((freq) => {
                  const schedulesInGroup = groupedSchedules[freq];
                  if (schedulesInGroup.length === 0) return null;

                  return (
                    <div key={freq}>
                      <div
                        className="text-xs font-medium uppercase tracking-wide px-2 py-1 mb-1"
                        style={{ color: colors.muted }}
                      >
                        {FREQUENCY_LABELS[freq]} ({schedulesInGroup.length})
                      </div>
                      <div
                        className="rounded-sm overflow-hidden"
                        style={{ border: `1px solid ${colors.surfaceLight}` }}
                      >
                        {schedulesInGroup.map((schedule, index) =>
                          renderScheduleRow(schedule, index, schedulesInGroup.length)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Paused Schedules */}
          {inactiveSchedules.length > 0 && (
            <Card title={`Paused (${inactiveSchedules.length})`}>
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: `1px solid ${colors.surfaceLight}` }}
              >
                {inactiveSchedules.map((schedule, index) =>
                  renderScheduleRow(schedule, index, inactiveSchedules.length)
                )}
              </div>
            </Card>
          )}

          {/* Info */}
          <div
            className="text-xs text-center p-3 rounded-sm"
            style={{
              backgroundColor: colors.surfaceLight,
              color: colors.muted,
              border: `1px solid ${colors.surfaceLight}`,
            }}
          >
            Recurring flows are automatically created based on your schedules.
            <br />
            Monthly totals are estimates based on frequency conversion.
          </div>
        </div>
      </main>

      {/* Add Recurring Schedule Dialog */}
      <AddFlowDialog open={isAddFlowOpen} onOpenChange={setIsAddFlowOpen} recurringOnly />
    </div>
  );
}
