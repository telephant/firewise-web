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

  // Annual summary: realized (actual dividends for selected year) + projected (forecasted months)
  const annualSummary = useMemo(() => {
    const taxRate = calendarData?.taxRates.us ?? 0.3;
    let realized = 0;
    let projected = 0;
    for (let m = 0; m < 12; m++) {
      const actualDivs = actualByMonth.get(m) ?? [];
      const calMonth = calendarData?.months[m];
      const forecastedDivs = (calMonth?.dividends ?? []).filter(d => d.isForecasted);

      realized += actualDivs.reduce((sum, d) =>
        sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);
      projected += forecastedDivs.reduce((sum, d) =>
        sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount), 0);
    }
    return { realized, projected, total: realized + projected };
  }, [actualByMonth, calendarData, taxMode]);

  // Border color for grid lines
  const gridBorder = `1px solid ${colors.border}`;

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
      {/* Calendar — fills available space, content capped at calWidth */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: calWidth }}>
        {/* Annual summary bar */}
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: 16,
          border: gridBorder,
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, padding: '10px 14px', borderRight: gridBorder }}>
            <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Realized {year}
            </div>
            <div style={{ color: colors.positive, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {fmtFull(annualSummary.realized, currency)}
            </div>
          </div>
          <div style={{ flex: 1, padding: '10px 14px', borderRight: gridBorder }}>
            <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Projected {year}
            </div>
            <div style={{ color: colors.muted, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {fmtFull(annualSummary.projected, currency)}
            </div>
          </div>
          <div style={{ flex: 1, padding: '10px 14px' }}>
            <div style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Full Year Est.
            </div>
            <div style={{ color: colors.text, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {fmtFull(annualSummary.total, currency)}
            </div>
          </div>
        </div>

        {/* Year nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => onYearChange(year - 1)}
            style={{ background: 'none', border: gridBorder, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 13 }}
          >‹</button>
          <span style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}>{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            style={{ background: 'none', border: gridBorder, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 13 }}
          >›</button>
        </div>

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

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${colors.positive}50` }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Received</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${colors.muted}40` }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Estimated</span>
              </div>
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
