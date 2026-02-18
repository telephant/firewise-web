'use client';

import { useState, useEffect } from 'react';
import { Card, colors, Button, Loader, IconChevronDown, Amount } from '@/components/fire/ui';
import { dividendCalendarApi, MonthDividend, MonthData, DividendCalendarData, TaxRates } from '@/lib/fire/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DividendCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [withTax, setWithTax] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DividendCalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await dividendCalendarApi.get(year);
        console.log('Dividend calendar response:', response);
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch dividend calendar');
        }
      } catch (err) {
        setError('Failed to fetch dividend calendar');
        console.error('Dividend calendar error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [year]);

  const taxRates: TaxRates = data?.taxRates ?? { us: 0.30, sg: 0.00 };
  const currency = data?.currency || 'USD';

  // Helper to get tax rate for a market
  const getTaxRateForMarket = (market: string | null | undefined): number => {
    if (market === 'SG') return taxRates.sg;
    return taxRates.us; // Default to US rate
  };

  // Collect unique markets from all dividends
  const marketsInData = new Set<string>();
  data?.months.forEach((month) => {
    month.dividends.forEach((div) => {
      const market = div.market || 'US';
      marketsInData.add(market);
    });
  });
  const hasUS = marketsInData.has('US');
  const hasSG = marketsInData.has('SG');

  // Build tax label based on markets present
  const taxLabel = (() => {
    const parts: string[] = [];
    if (hasUS) parts.push(`🇺🇸 ${Math.round(taxRates.us * 100)}%`);
    if (hasSG) parts.push(`🇸🇬 ${Math.round(taxRates.sg * 100)}%`);
    if (parts.length === 0) parts.push(`🇺🇸 ${Math.round(taxRates.us * 100)}%`);
    return parts.join(' · ');
  })();

  // Calculate tax-adjusted amounts when withTax is enabled
  const months = (data?.months || MONTH_NAMES.map((name, index) => ({
    month: index,
    name,
    dividends: [],
    total: 0,
  }))).map((month) => {
    if (!withTax) return month;

    const adjustedDividends = month.dividends.map((div) => {
      const divTaxRate = getTaxRateForMarket(div.market);
      const afterTaxAmount = div.amount * (1 - divTaxRate);
      return {
        ...div,
        amount: afterTaxAmount,
        originalAmount: div.originalAmount ? div.originalAmount * (1 - divTaxRate) : undefined,
      };
    });

    const adjustedTotal = adjustedDividends.reduce((sum, d) => sum + d.amount, 0);

    return {
      ...month,
      dividends: adjustedDividends,
      total: adjustedTotal,
    };
  });

  const annualTotal = months.reduce((sum, m) => sum + m.total, 0);

  return (
    <Card
      title="Dividend Calendar"
      action={
        <label
          className="flex items-center gap-1.5 cursor-pointer text-[10px]"
          style={{ color: colors.muted }}
          title={`Dividend withholding tax${hasUS ? ` - US: ${Math.round(taxRates.us * 100)}%` : ''}${hasSG ? ` - SG: ${Math.round(taxRates.sg * 100)}%` : ''}`}
        >
          <span>{taxLabel}</span>
          <button
            type="button"
            role="switch"
            aria-checked={withTax}
            onClick={() => setWithTax(!withTax)}
            className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
            style={{
              backgroundColor: withTax ? colors.accent : colors.border,
            }}
          >
            <span
              className="inline-block h-3 w-3 transform rounded-full transition-transform"
              style={{
                backgroundColor: colors.surface,
                transform: withTax ? 'translateX(14px)' : 'translateX(2px)',
              }}
            />
          </button>
        </label>
      }
    >
      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setYear((y) => y - 1)}
          style={{ color: colors.muted }}
        >
          &larr;
        </Button>
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {year}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setYear((y) => y + 1)}
          style={{ color: colors.muted }}
        >
          &rarr;
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <span className="text-sm" style={{ color: colors.negative }}>{error}</span>
        </div>
      ) : (
        <>
          {/* 6x2 Month Grid - First Row (Jan-Jun) */}
          <div
            className="grid grid-cols-6 gap-px overflow-hidden"
            style={{
              backgroundColor: colors.border,
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderBottomLeftRadius: isExpanded ? '0' : '8px',
              borderBottomRightRadius: isExpanded ? '0' : '8px',
            }}
          >
            {months.slice(0, 6).map((monthData) => (
              <MonthCell
                key={monthData.month}
                data={monthData}
                currency={currency}
              />
            ))}
          </div>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 transition-colors hover:bg-white/5"
            style={{
              backgroundColor: colors.surfaceLight,
              borderLeft: `1px solid ${colors.border}`,
              borderRight: `1px solid ${colors.border}`,
              borderBottom: isExpanded ? 'none' : `1px solid ${colors.border}`,
              borderBottomLeftRadius: isExpanded ? '0' : '8px',
              borderBottomRightRadius: isExpanded ? '0' : '8px',
            }}
          >
            <span className="text-[10px]" style={{ color: colors.muted }}>
              {isExpanded ? 'Show less' : 'Jul - Dec'}
            </span>
            <span
              className="transition-transform duration-200"
              style={{
                color: colors.muted,
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <IconChevronDown size={12} />
            </span>
          </button>

          {/* Second Row (Jul-Dec) - Collapsible */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: isExpanded ? '120px' : '0px',
              opacity: isExpanded ? 1 : 0,
            }}
          >
            <div
              className="grid grid-cols-6 gap-px rounded-b-lg overflow-hidden"
              style={{ backgroundColor: colors.border }}
            >
              {months.slice(6, 12).map((monthData) => (
                <MonthCell
                  key={monthData.month}
                  data={monthData}
                  currency={currency}
                />
              ))}
            </div>
          </div>

          {/* Footer with totals */}
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span className="text-xs" style={{ color: colors.muted }}>
              * forecasted
            </span>
            <div className="text-right">
              <span className="text-xs" style={{ color: colors.muted }}>
                Annual Total:{' '}
              </span>
              <span className="text-sm font-medium" style={{ color: colors.positive }}>
                <Amount value={annualTotal} currency={currency} size="sm" weight="medium" color="positive" />
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

interface MonthCellProps {
  data: MonthData;
  currency: string;
}

function MonthCell({ data, currency }: MonthCellProps) {
  const currentMonth = new Date().getMonth();
  const isCurrentMonth = data.month === currentMonth;

  return (
    <div
      className="p-1.5 min-h-[80px]"
      style={{
        backgroundColor: colors.surface,
        borderLeft: isCurrentMonth ? `2px solid ${colors.accent}` : undefined,
      }}
    >
      {/* Month Name */}
      <div
        className="text-[10px] font-medium mb-1.5"
        style={{ color: isCurrentMonth ? colors.accent : colors.muted }}
      >
        {data.name}
      </div>

      {/* Dividends List */}
      <div className="space-y-1">
        {data.dividends.length === 0 ? (
          <div className="text-[10px]" style={{ color: colors.border }}>
            -
          </div>
        ) : (
          data.dividends.map((div, idx) => (
            <DividendRow key={`${div.ticker}-${idx}`} dividend={div} currency={currency} />
          ))
        )}
      </div>
    </div>
  );
}

interface DividendRowProps {
  dividend: MonthDividend;
  currency: string;
}

function DividendRow({ dividend, currency }: DividendRowProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const frequencyLabel =
    dividend.frequency === 'monthly'
      ? 'Monthly'
      : dividend.frequency === 'quarterly'
        ? 'Quarterly'
        : dividend.frequency === 'yearly'
          ? 'Annual'
          : '';

  return (
    <div
      className="flex items-center justify-between gap-1 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="text-[10px] font-medium truncate"
        style={{ color: dividend.isForecasted ? colors.muted : colors.text }}
      >
        {dividend.ticker}
      </span>
      <span
        className="text-[10px] tabular-nums"
        style={{ color: dividend.isForecasted ? colors.muted : colors.positive }}
      >
        {dividend.isForecasted ? '*' : ''}
        <Amount value={dividend.amount} currency={currency} size={10} compact color={dividend.isForecasted ? 'muted' : 'positive'} />
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-10 bottom-full left-0 mb-1 px-2 py-1 rounded text-[10px] whitespace-nowrap"
          style={{
            backgroundColor: colors.surfaceLight,
            border: `1px solid ${colors.border}`,
            color: colors.text,
          }}
        >
          {dividend.isForecasted ? (
            <>
              <span style={{ color: colors.muted }}>Forecasted</span>
              {frequencyLabel && (
                <>
                  {' '}
                  <span style={{ color: colors.info }}>({frequencyLabel})</span>
                </>
              )}
            </>
          ) : (
            <>
              Received on {new Date(dividend.date!).toLocaleDateString()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DividendCalendar;
