'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  retro,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  Label,
  getCategoryIcon,
} from '@/components/fire/ui';
import { flowApi } from '@/lib/fire/api';
import { mutateFlows, mutateAssets, useRecurringSchedules } from '@/hooks/fire/use-fire-data';
import { formatCurrency } from '@/lib/fire/utils';
import type { FlowWithDetails, RecurringFrequency } from '@/types/fire';
import { RECURRING_FREQUENCY_OPTIONS } from '@/types/fire';

interface EditFlowDialogProps {
  flow: FlowWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFlowDialog({
  flow,
  open,
  onOpenChange,
}: EditFlowDialogProps) {
  const prevOpenRef = useRef(open);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('none');
  const [adjustBalances, setAdjustBalances] = useState(false);

  // Fetch schedules to get recurring info
  const { schedules } = useRecurringSchedules({ limit: 100 });

  // Find the schedule for this flow
  const schedule = flow?.schedule_id
    ? schedules.find((s) => s.id === flow.schedule_id)
    : null;

  // Initialize form when dialog opens with a flow
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && flow) {
      // Dialog just opened - initialize from flow
      setAmount(flow.amount.toString());
      setDate(flow.date);
      setDescription(flow.description || '');
      // Get recurring frequency from linked schedule if it exists
      const scheduleFrequency = flow.schedule_id && schedule
        ? schedule.frequency
        : 'none';
      setRecurringFrequency(scheduleFrequency);
      setAdjustBalances(false);
    } else if (wasOpen && !open) {
      // Dialog just closed - reset form
      setAmount('');
      setDate('');
      setDescription('');
      setRecurringFrequency('none');
      setAdjustBalances(false);
    }
  }, [open, flow, schedule]);

  // Calculate difference and affected assets
  const balanceAdjustment = useMemo(() => {
    if (!flow) return null;

    const newAmount = parseFloat(amount) || 0;
    const oldAmount = flow.amount;
    const difference = newAmount - oldAmount;

    if (difference === 0) return null;

    const flowCurrency = flow.currency;
    const adjustments: { asset: string; delta: number; assetCurrency: string; needsConversion: boolean }[] = [];
    const flowType = flow.type;

    if (flowType === 'income' && flow.to_asset) {
      // Income: to_asset gets the money
      const assetCurrency = flow.to_asset.currency || 'USD';
      adjustments.push({
        asset: flow.to_asset.name,
        delta: difference,
        assetCurrency,
        needsConversion: assetCurrency.toLowerCase() !== flowCurrency.toLowerCase(),
      });
    } else if (flowType === 'expense' && flow.from_asset) {
      // Expense: from_asset loses the money
      const assetCurrency = flow.from_asset.currency || 'USD';
      adjustments.push({
        asset: flow.from_asset.name,
        delta: -difference,
        assetCurrency,
        needsConversion: assetCurrency.toLowerCase() !== flowCurrency.toLowerCase(),
      });
    } else if (flowType === 'transfer') {
      // Transfer: from_asset loses, to_asset gains
      if (flow.from_asset) {
        const assetCurrency = flow.from_asset.currency || 'USD';
        adjustments.push({
          asset: flow.from_asset.name,
          delta: -difference,
          assetCurrency,
          needsConversion: assetCurrency.toLowerCase() !== flowCurrency.toLowerCase(),
        });
      }
      if (flow.to_asset) {
        const assetCurrency = flow.to_asset.currency || 'USD';
        adjustments.push({
          asset: flow.to_asset.name,
          delta: difference,
          assetCurrency,
          needsConversion: assetCurrency.toLowerCase() !== flowCurrency.toLowerCase(),
        });
      }
    }

    const hasConversion = adjustments.some(a => a.needsConversion);
    return { difference, adjustments, hasConversion, flowCurrency };
  }, [flow, amount]);

  if (!flow) return null;

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Other';
    const labels: Record<string, string> = {
      salary: 'Salary',
      bonus: 'Bonus',
      freelance: 'Freelance',
      rental: 'Rental Income',
      gift: 'Gift',
      dividend: 'Dividend',
      interest: 'Interest',
      invest: 'Investment',
      sell: 'Sell',
      reinvest: 'Reinvest',
      transfer: 'Transfer',
      deposit: 'Deposit',
      expense: 'Expense',
      pay_debt: 'Debt Payment',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const response = await flowApi.update(flow.id, {
        amount: parsedAmount,
        date,
        description: description.trim() || null,
        recurring_frequency: recurringFrequency,
        adjust_balances: adjustBalances,
      });

      if (response.success) {
        toast.success(adjustBalances ? 'Flow and balances updated' : 'Flow updated');
        await mutateFlows();
        if (adjustBalances) {
          await mutateAssets();
        }
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to update flow');
      }
    } catch {
      toast.error('Failed to update flow');
    } finally {
      setLoading(false);
    }
  };

  const from = flow.from_asset?.name ||
    (flow.metadata as Record<string, unknown>)?.source_name as string ||
    'External';
  const to = flow.to_asset?.name || flow.debt?.name || 'External';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              {getCategoryIcon(flow.category || flow.type, 18)}
              <span>Edit {getCategoryLabel(flow.category)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Flow Info (Read-only) */}
              <div
                className="text-xs p-2 rounded-sm space-y-1"
                style={{ backgroundColor: retro.surfaceLight }}
              >
                <div className="flex justify-between">
                  <span style={{ color: retro.muted }}>From:</span>
                  <span style={{ color: retro.text }}>{from}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: retro.muted }}>To:</span>
                  <span style={{ color: retro.text }}>{to}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: retro.muted }}>Currency:</span>
                  <span style={{ color: retro.text }}>{flow.currency}</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Amount</Label>
                  <span className="text-xs" style={{ color: retro.muted }}>
                    was {formatCurrency(flow.amount, { currency: flow.currency })}
                  </span>
                </div>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                {/* Adjust Balances Toggle - only show if amount changed */}
                {balanceAdjustment && balanceAdjustment.adjustments.length > 0 && (
                  <div className="mt-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adjustBalances}
                        onChange={(e) => setAdjustBalances(e.target.checked)}
                        className="mt-0.5"
                        style={{ accentColor: retro.accent }}
                      />
                      <div className="flex-1">
                        <span
                          className="text-xs"
                          style={{ color: retro.text }}
                        >
                          Also adjust asset balances
                        </span>
                        {adjustBalances && (
                          <div className="mt-1 space-y-0.5">
                            {balanceAdjustment.adjustments.map((adj, i) => (
                              <div
                                key={i}
                                className="text-xs flex gap-1"
                              >
                                <span style={{ color: retro.muted }}>
                                  {adj.asset}:
                                </span>
                                <span
                                  style={{
                                    color: adj.delta >= 0 ? retro.positive : retro.negative,
                                  }}
                                >
                                  {adj.delta >= 0 ? '+' : ''}
                                  {formatCurrency(adj.delta, { currency: flow.currency })}
                                  {adj.needsConversion && (
                                    <span style={{ color: retro.muted }}>
                                      {' '}→ {adj.assetCurrency}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                            {balanceAdjustment.hasConversion && (
                              <div
                                className="text-[10px] mt-1"
                                style={{ color: retro.muted }}
                              >
                                * Will be converted at current exchange rate
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <Label>Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description (optional)</Label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note..."
                />
              </div>

              {/* Recurring Frequency */}
              <div>
                <Label>Recurring</Label>
                <Select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                  options={RECURRING_FREQUENCY_OPTIONS}
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
