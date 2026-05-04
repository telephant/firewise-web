'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import type { Dividend, DividendCalendarResponse, DividendCalendarMonthDividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  calendarData: DividendCalendarResponse | null;
  calendarLoading: boolean;
  currency: string;
  taxMode: 'gross' | 'net';
  year: number;
  onYearChange: (y: number) => void;
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

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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
  currency,
  taxMode,
  year,
  onYearChange,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Track container width responsively
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

  // Cap calendar width at 640px so it doesn't look too sparse on wide screens
  const calWidth = Math.min(containerWidth, 640);

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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  function getMonthDisplay(monthIdx: number) {
    const actualDivs = actualByMonth.get(monthIdx) ?? [];
    const calMonth = calendarData?.months[monthIdx];
    const forecastedDivs = (calMonth?.dividends ?? []).filter(d => d.isForecasted);
    const taxRate = calendarData?.taxRates.us ?? 0.3;

    const actualTotal = actualDivs.reduce((sum, d) =>
      sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);
    const forecastedTotal = forecastedDivs.reduce((sum, d) =>
      sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0);

    const actualTickers = new Set(actualDivs.map(d => d.ticker));
    const forecastedTickers = new Set(forecastedDivs.map(d => d.ticker).filter(t => !actualTickers.has(t)));

    return {
      total: actualTotal + forecastedTotal,
      tickerCount: actualTickers.size + forecastedTickers.size,
      hasActual: actualDivs.length > 0,
      hasForecasted: forecastedDivs.length > 0,
    };
  }

  const drawerActual: Dividend[] = selectedMonth !== null ? (actualByMonth.get(selectedMonth) ?? []) : [];
  const drawerForecasted: DividendCalendarMonthDividend[] = useMemo(() => {
    if (selectedMonth === null || !calendarData) return [];
    const actualTickers = new Set((actualByMonth.get(selectedMonth) ?? []).map(d => d.ticker));
    return (calendarData.months[selectedMonth]?.dividends ?? [])
      .filter(d => d.isForecasted && !actualTickers.has(d.ticker));
  }, [selectedMonth, calendarData, actualByMonth]);

  const taxRate = calendarData?.taxRates.us ?? 0.3;
  const drawerActualTotal = drawerActual.reduce((sum, d) =>
    sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);
  const drawerForecastedTotal = drawerForecasted.reduce((sum, d) =>
    sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0);
  const drawerTotal = drawerActualTotal + drawerForecastedTotal;

  const drawerOpen = selectedMonth !== null;

  // Annual summary: realized + projected + derived stats
  const annualSummary = useMemo(() => {
    const taxRate = calendarData?.taxRates.us ?? 0.3;
    let realized = 0;
    let projected = 0;
    let monthsReceived = 0;
    let bestMonth = { idx: -1, amount: 0 };

    for (let m = 0; m < 12; m++) {
      const actualDivs = actualByMonth.get(m) ?? [];
      const calMonth = calendarData?.months[m];
      const forecastedDivs = (calMonth?.dividends ?? []).filter(d => d.isForecasted);

      const actualTotal = actualDivs.reduce((sum, d) =>
        sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);
      const forecastedTotal = forecastedDivs.reduce((sum, d) =>
        sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0);

      realized += actualTotal;
      projected += forecastedTotal;

      if (actualDivs.length > 0) monthsReceived++;
      const monthTotal = actualTotal + forecastedTotal;
      if (monthTotal > bestMonth.amount) bestMonth = { idx: m, amount: monthTotal };
    }

    const total = realized + projected;
    const avgPerMonth = monthsReceived > 0 ? realized / monthsReceived : 0;
    const progressPct = total > 0 ? Math.min((realized / total) * 100, 100) : 0;

    return { realized, projected, total, monthsReceived, avgPerMonth, bestMonth, progressPct };
  }, [actualByMonth, calendarData, taxMode]);

  // Border color for grid lines
  const gridBorder = `1px solid ${colors.border}`;

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingLeft: 24 }}>

      {/* Left stats panel */}
      <div style={{ width: 148, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Year nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => onYearChange(year - 1)}
            style={{ background: 'none', border: gridBorder, borderRadius: 6, padding: '3px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
          >‹</button>
          <span style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            style={{ background: 'none', border: gridBorder, borderRadius: 6, padding: '3px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
          >›</button>
        </div>

        {[
          { label: 'Realized', value: annualSummary.realized, color: colors.positive },
          { label: 'Projected', value: annualSummary.projected, color: colors.muted },
          { label: 'Full Year', value: annualSummary.total, color: colors.text },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '12px 0', borderTop: gridBorder }}>
            <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
              {label}
            </div>
            <div style={{ color, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {fmtFull(value, currency)}
            </div>
          </div>
        ))}

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
            {annualSummary.monthsReceived > 0 ? fmtFull(annualSummary.avgPerMonth, currency) : '—'}
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
                {fmtFull(annualSummary.bestMonth.amount, currency)}
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

      {/* Calendar — fixed width, drawer attaches directly to its right */}
      <div style={{ width: calWidth, flexShrink: 0 }}>
      <div>
        {calendarLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <>
            {/* 4×3 grid with shared borders */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              border: gridBorder,
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const { total, tickerCount, hasActual, hasForecasted } = getMonthDisplay(idx);
                const isSelected = selectedMonth === idx;
                const isCurrent = idx === currentMonth && year === currentYear;
                const isEmpty = tickerCount === 0;
                // Draw right border except last in each row, bottom border except last row
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
                    {/* Selected indicator bar */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 2,
                        backgroundColor: colors.accent,
                      }} />
                    )}

                    {/* Month name — large and prominent */}
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
                        {/* Amount */}
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: hasActual ? colors.positive : colors.muted,
                          marginBottom: 6,
                          letterSpacing: '-0.01em',
                        }}>
                          {fmt(total, currency)}
                        </div>
                        {/* Ticker count + badges */}
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

          </>
        )}
      </div>
      </div>

      {/* Right drawer */}
      <div style={{
        width: drawerOpen ? 256 : 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}>
        <div style={{ width: 256, paddingLeft: 16, borderLeft: gridBorder }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: colors.text, fontSize: 13, fontWeight: 700 }}>
              {selectedMonth !== null ? `${MONTH_NAMES_FULL[selectedMonth]} ${year}` : ''}
            </span>
            <button
              onClick={() => setSelectedMonth(null)}
              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {/* Actual section */}
            {drawerActual.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.positive, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Received
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drawerActual.map(d => {
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

            {/* Forecasted section */}
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
                          <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>{fmtFull(amount, currency)}</span>
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

            {/* Month total */}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: colors.muted, fontSize: 11, fontWeight: 600 }}>Month Total</span>
              <span style={{ color: colors.positive, fontSize: 13, fontWeight: 700 }}>{fmtFull(drawerTotal, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
