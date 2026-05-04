'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';
import type { Dividend, DividendCalendarResponse, DividendCalendarMonthDividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  calendarData: DividendCalendarResponse | null;
  calendarLoading: boolean;
  taxMode: 'gross' | 'net';
  year: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Annual',
  biweekly: 'Bi-weekly',
  weekly: 'Weekly',
};

// Per-row native display (individual dividend rows in drawer)
function fmtFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendMonthCalendarView({
  dividends,
  calendarData,
  calendarLoading,
  taxMode,
  year,
}: Props) {
  // fmtDisplay: for actual dividends aggregated in USD (amount_usd) → user's display currency
  const { fmt: fmtDisplay } = useCurrency();

  // fmtCal: for forecasted amounts from calendarData (in preferredCurrency, not USD)
  const calCurrency = calendarData?.currency || 'USD';
  const fmtCal = (value: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: calCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const calWidth = Math.min(containerWidth, 640);

  // Group actual dividends by month index (for the selected year)
  const actualByMonth = useMemo(() => {
    const map = new Map<number, Dividend[]>();
    dividends.forEach(d => {
      const dd = new Date(d.ex_date);
      if (dd.getFullYear() === year) {
        const m = dd.getMonth();
        if (!map.has(m)) map.set(m, []);
        map.get(m)!.push(d);
      }
    });
    return map;
  }, [dividends, year]);

  // Per-month actual total in USD (using amount_usd — same source as Table tab)
  const actualUsdByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const [m, divs] of actualByMonth.entries()) {
      const total = divs.reduce((sum, d) => {
        const usd = d.amount_usd ?? 0;
        return sum + (taxMode === 'net' ? usd * (1 - d.tax_rate) : usd);
      }, 0);
      map.set(m, total);
    }
    return map;
  }, [actualByMonth, taxMode]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const taxRate = calendarData?.taxRates.us ?? 0.3;

  // Get forecasted dividends for a month (from calendarData, excluding tickers already received)
  function getForecastedForMonth(monthIdx: number): DividendCalendarMonthDividend[] {
    if (!calendarData) return [];
    const actualTickers = new Set((actualByMonth.get(monthIdx) ?? []).map(d => d.ticker));
    return (calendarData.months[monthIdx]?.dividends ?? [])
      .filter(d => d.isForecasted && !actualTickers.has(d.ticker));
  }

  // Forecasted total for a month in calCurrency
  function getForecastedTotal(monthIdx: number): number {
    return getForecastedForMonth(monthIdx).reduce(
      (sum, d) => sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0
    );
  }

  const drawerActual: Dividend[] = selectedMonth !== null ? (actualByMonth.get(selectedMonth) ?? []) : [];
  const drawerForecasted: DividendCalendarMonthDividend[] = useMemo(() => {
    if (selectedMonth === null) return [];
    return getForecastedForMonth(selectedMonth);
  }, [selectedMonth, calendarData, actualByMonth]);

  // Drawer totals
  // Actual: in USD → fmtDisplay
  const drawerActualUsdTotal = drawerActual.reduce((sum, d) => {
    const usd = d.amount_usd ?? 0;
    return sum + (taxMode === 'net' ? usd * (1 - d.tax_rate) : usd);
  }, 0);
  // Forecasted: in calCurrency → fmtCal
  const drawerForecastedTotal = drawerForecasted.reduce(
    (sum, d) => sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0
  );

  const drawerOpen = selectedMonth !== null;

  // Annual summary: realized uses amount_usd from dividends prop (consistent with Table tab)
  const annualSummary = useMemo(() => {
    // Realized: sum all actual dividends for this year in USD
    let realized = 0;
    for (const [, total] of actualUsdByMonth.entries()) {
      realized += total;
    }

    // Projected: sum forecasted from calendarData (in calCurrency)
    let projected = 0;
    let monthsReceived = 0;
    let bestMonth = { idx: -1, amount: 0 };

    for (let m = 0; m < 12; m++) {
      const actualUsd = actualUsdByMonth.get(m) ?? 0;
      const forecastedTotal = getForecastedTotal(m);

      if ((actualByMonth.get(m)?.length ?? 0) > 0) monthsReceived++;
      projected += forecastedTotal;

      // Best month by actual USD amount
      if (actualUsd > bestMonth.amount) bestMonth = { idx: m, amount: actualUsd };
    }

    const avgPerMonth = monthsReceived > 0 ? realized / monthsReceived : 0;
    // Progress: realized vs (realized + projected) — different currencies, so only show if projected=0
    const progressPct = realized > 0 ? Math.min(100, realized / (realized + projected * 1) * 100) : 0;

    return { realized, projected, monthsReceived, avgPerMonth, bestMonth, progressPct };
  }, [actualUsdByMonth, actualByMonth, calendarData, taxMode]);

  const gridBorder = `1px solid ${colors.border}`;

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingLeft: 48 }}>

      {/* Left stats panel */}
      <div style={{ width: 148, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Realized: in USD → display currency (same as Table total) */}
        <div style={{ padding: '12px 0', borderTop: gridBorder }}>
          <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Realized
          </div>
          <div style={{ color: colors.positive, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {fmtDisplay(annualSummary.realized)}
          </div>
        </div>

        {/* Projected: in calCurrency (estimated, different pipeline) */}
        <div style={{ padding: '12px 0', borderTop: gridBorder }}>
          <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Projected
          </div>
          <div style={{ color: colors.muted, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {fmtCal(annualSummary.projected)}
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: '12px 0', borderTop: gridBorder }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Progress
            </div>
            <span style={{ color: colors.muted, fontSize: 10 }}>
              {annualSummary.monthsReceived} / 12 mo
            </span>
          </div>
          <div style={{ height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${annualSummary.progressPct}%`,
              backgroundColor: colors.positive,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
            {annualSummary.progressPct.toFixed(0)}% of full year
          </div>
        </div>

        {/* Avg / month */}
        <div style={{ padding: '12px 0', borderTop: gridBorder }}>
          <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Avg / Month
          </div>
          <div style={{ color: colors.text, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {annualSummary.monthsReceived > 0 ? fmtDisplay(annualSummary.avgPerMonth) : '—'}
          </div>
        </div>

        {/* Best month */}
        <div style={{ padding: '12px 0', borderTop: gridBorder }}>
          <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
            Best Month
          </div>
          {annualSummary.bestMonth.idx >= 0 && annualSummary.bestMonth.amount > 0 ? (
            <>
              <div style={{ color: colors.text, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {fmtDisplay(annualSummary.bestMonth.amount)}
              </div>
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                {MONTH_NAMES_SHORT[annualSummary.bestMonth.idx]}
              </div>
            </>
          ) : (
            <div style={{ color: colors.muted, fontSize: 14 }}>—</div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20, paddingTop: 16, borderTop: gridBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${colors.positive}50`, flexShrink: 0 }} />
            <span style={{ color: colors.muted, fontSize: 11 }}>Received</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${colors.muted}40`, flexShrink: 0 }} />
            <span style={{ color: colors.muted, fontSize: 11 }}>Estimated</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ width: calWidth, flexShrink: 0 }}>
      <div>
        {calendarLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            border: gridBorder,
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {MONTH_NAMES_SHORT.map((name, idx) => {
              const actualUsd = actualUsdByMonth.get(idx) ?? 0;
              const forecastedTotal = getForecastedTotal(idx);
              const actualDivs = actualByMonth.get(idx) ?? [];
              const forecastedDivs = getForecastedForMonth(idx);
              const hasActual = actualDivs.length > 0;
              const hasForecasted = forecastedDivs.length > 0;
              const tickerCount = new Set([
                ...actualDivs.map(d => d.ticker),
                ...forecastedDivs.map(d => d.ticker),
              ]).size;
              const isEmpty = tickerCount === 0;

              const isSelected = selectedMonth === idx;
              const isCurrent = idx === currentMonth && year === currentYear;

              const col = idx % 4;
              const row = Math.floor(idx / 4);
              const borderRight = col < 3 ? gridBorder : 'none';
              const borderBottom = row < 2 ? gridBorder : 'none';

              return (
                <div
                  key={idx}
                  onClick={() => !isEmpty && setSelectedMonth(isSelected ? null : idx)}
                  style={{
                    padding: '14px 16px',
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: isEmpty ? 'default' : 'pointer',
                    borderRight,
                    borderBottom,
                    backgroundColor: isSelected
                      ? `${colors.accent}12`
                      : isCurrent
                        ? `${colors.accent}06`
                        : 'transparent',
                    transition: 'background 0.12s',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: 2,
                      backgroundColor: colors.accent,
                    }} />
                  )}

                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isCurrent ? colors.accent : isSelected ? colors.text : colors.muted,
                    letterSpacing: '0.02em',
                    marginBottom: 10,
                  }}>
                    {name}
                  </div>

                  {isEmpty ? (
                    <div style={{ color: colors.border, fontSize: 13, marginTop: 'auto' }}>—</div>
                  ) : (
                    <div style={{ marginTop: 'auto' }}>
                      {/* Actual amount in display currency */}
                      {hasActual && (
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: colors.positive,
                          marginBottom: hasForecasted ? 2 : 6,
                          letterSpacing: '-0.01em',
                        }}>
                          {fmtDisplay(actualUsd, { decimals: 0 })}
                        </div>
                      )}
                      {/* Forecasted amount in calCurrency */}
                      {hasForecasted && !hasActual && (
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: colors.muted,
                          marginBottom: 6,
                          letterSpacing: '-0.01em',
                        }}>
                          {fmtCal(forecastedTotal)}
                        </div>
                      )}
                      {hasForecasted && hasActual && (
                        <div style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>
                          +{fmtCal(forecastedTotal)} est.
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ color: colors.muted, fontSize: 10 }}>
                          {tickerCount} stock{tickerCount !== 1 ? 's' : ''}
                        </span>
                        {hasActual && (
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            backgroundColor: `${colors.positive}18`,
                            color: colors.positive,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}>rcvd</span>
                        )}
                        {hasForecasted && !hasActual && (
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            backgroundColor: `${colors.muted}15`,
                            color: colors.muted,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}>est.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Right drawer */}
      <div style={{ width: 256, flexShrink: 0, paddingLeft: 16, borderLeft: gridBorder }}>
        {!drawerOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
            <div style={{ fontSize: 20, opacity: 0.2 }}>↖</div>
            <span style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
              Click a month to<br />see details
            </span>
          </div>
        ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: colors.text, fontSize: 13, fontWeight: 700 }}>
              {MONTH_NAMES_FULL[selectedMonth!]} {year}
            </span>
            <button
              onClick={() => setSelectedMonth(null)}
              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {/* Actual dividends */}
            {drawerActual.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.positive, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Received
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drawerActual.map(d => {
                    // Per-row: show in native currency
                    const amount = taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount;
                    return (
                      <div key={d.id} style={{ padding: '8px 10px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ color: colors.text, fontWeight: 600, fontSize: 12 }}>{d.ticker}</span>
                          <span style={{ color: colors.positive, fontSize: 12, fontWeight: 600 }}>{fmtFull(amount, d.currency)}</span>
                        </div>
                        <div style={{ color: colors.muted, fontSize: 10 }}>
                          {d.ex_date}
                          {d.pay_date && ` · paid ${d.pay_date}`}
                          {` · ${(d.tax_rate * 100).toFixed(0)}% tax`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Forecasted dividends */}
            {drawerForecasted.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Estimated
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drawerForecasted.map((d, i) => {
                    const amount = taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount;
                    return (
                      <div key={`fc-${i}`} style={{ padding: '8px 10px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px dashed ${colors.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ color: colors.text, fontWeight: 600, fontSize: 12 }}>{d.ticker}</span>
                          <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>{fmtCal(amount, 2)}</span>
                        </div>
                        <div style={{ color: colors.muted, fontSize: 10 }}>
                          {d.frequency ? FREQ_LABEL[d.frequency] ?? d.frequency : 'Estimated'}
                          {d.market && ` · ${d.market}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month totals */}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
              {drawerActual.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: colors.muted, fontSize: 11 }}>Received</span>
                  <span style={{ color: colors.positive, fontSize: 13, fontWeight: 700 }}>{fmtDisplay(drawerActualUsdTotal, { decimals: 2 })}</span>
                </div>
              )}
              {drawerForecasted.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: colors.muted, fontSize: 11 }}>Estimated</span>
                  <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>{fmtCal(drawerForecastedTotal, 2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
