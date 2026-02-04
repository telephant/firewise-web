'use client';

import { useMemo } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { formatCurrency, calculateNetWorth } from '@/lib/fire/utils';
import { useAssets, useFlowFreedom, useRunway } from '@/hooks/fire/use-fire-data';

interface HumanInsightCardProps {
  currency?: string;
}

interface Insight {
  icon: string;
  message: string;
  detail?: string;
  type: 'positive' | 'warning' | 'info' | 'neutral';
}

/**
 * Human Insight Card
 * Shows ONE meaningful, contextual insight based on the user's financial data.
 * The goal is to answer "What should I know right now?" in human language.
 */
export function HumanInsightCard({ currency = 'USD' }: HumanInsightCardProps) {
  const { assets, isLoading: assetsLoading } = useAssets();
  const { data: freedomData, isLoading: freedomLoading } = useFlowFreedom();
  const { data: runwayData, isLoading: runwayLoading } = useRunway();

  const isLoading = assetsLoading || freedomLoading || runwayLoading;

  const { netWorth } = useMemo(() => calculateNetWorth(assets), [assets]);

  const insight = useMemo((): Insight | null => {
    if (!freedomData || !runwayData) return null;

    const flowFreedom = freedomData.flowFreedom.current * 100;
    const passiveIncome = freedomData.passiveIncome.monthly;
    const expenses = freedomData.expenses.monthly;
    const gap = expenses - passiveIncome;
    const runwayYears = runwayData.projection.runway_years;
    const runwayStatus = runwayData.projection.runway_status;

    // Priority 1: Celebrate achievements
    if (runwayStatus === 'infinite' || flowFreedom >= 100) {
      return {
        icon: '🎉',
        message: "You've achieved financial independence!",
        detail: 'Your passive income covers all your expenses. You are free.',
        type: 'positive',
      };
    }

    // Priority 2: Critical warnings
    if (runwayStatus === 'critical' || runwayYears < 5) {
      return {
        icon: '⚠️',
        message: `Your runway is only ${runwayYears} years`,
        detail: 'Consider reducing expenses or increasing income to extend your runway.',
        type: 'warning',
      };
    }

    // Priority 3: Close to milestones
    if (flowFreedom >= 75) {
      const toGo = expenses - passiveIncome;
      return {
        icon: '🔥',
        message: `You're ${Math.round(flowFreedom)}% to financial freedom!`,
        detail: `Just ${formatCurrency(toGo, { currency, compact: true })}/mo more passive income to go.`,
        type: 'positive',
      };
    }

    if (flowFreedom >= 50) {
      return {
        icon: '📈',
        message: 'Halfway to financial freedom!',
        detail: `Your passive income covers ${Math.round(flowFreedom)}% of expenses. Keep building!`,
        type: 'positive',
      };
    }

    // Priority 4: Actionable insights
    if (gap > 0) {
      const neededFor50 = (expenses * 0.5) - passiveIncome;
      if (neededFor50 > 0) {
        return {
          icon: '💡',
          message: `To reach 50% freedom, you need ${formatCurrency(neededFor50, { currency, compact: true })}/mo more passive income`,
          detail: `Currently: ${formatCurrency(passiveIncome, { currency, compact: true })}/mo covers ${Math.round(flowFreedom)}% of expenses`,
          type: 'info',
        };
      }
    }

    // Priority 5: Encouragement based on runway
    if (runwayYears >= 30) {
      return {
        icon: '✨',
        message: `Your money could last ${runwayYears}+ years`,
        detail: "You're in a strong position. Focus on growing passive income.",
        type: 'positive',
      };
    }

    if (runwayYears >= 15) {
      return {
        icon: '📊',
        message: `${runwayYears} years of runway`,
        detail: `Your passive income covers ${Math.round(flowFreedom)}% of expenses. Room to grow!`,
        type: 'neutral',
      };
    }

    // Default: Show the gap
    return {
      icon: '💰',
      message: `Monthly gap: ${formatCurrency(gap, { currency, compact: true })}`,
      detail: `This is how much you need to withdraw from savings each month.`,
      type: 'neutral',
    };
  }, [freedomData, runwayData, currency]);

  if (isLoading) {
    return (
      <div
        className="p-4 rounded-md flex items-center justify-center"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
      >
        <Loader size="sm" variant="bar" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div
        className="p-4 rounded-md text-center"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
      >
        <span className="text-sm" style={{ color: colors.muted }}>
          Add income and expenses to see insights
        </span>
      </div>
    );
  }

  const bgColor = {
    positive: colors.positive + '15',
    warning: colors.warning + '15',
    info: colors.info + '15',
    neutral: colors.surfaceLight,
  }[insight.type];

  const borderColor = {
    positive: colors.positive + '40',
    warning: colors.warning + '40',
    info: colors.info + '40',
    neutral: colors.border,
  }[insight.type];

  return (
    <div
      className="p-4 rounded-md"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {insight.message}
          </p>
          {insight.detail && (
            <p className="text-xs mt-1" style={{ color: colors.muted }}>
              {insight.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
