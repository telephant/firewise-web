'use client';

import { useState, useMemo } from 'react';
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

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Annual',
  biweekly: 'Bi-weekly',
  weekly: 'Weekly',
};

export function DividendMonthCalendarView({
  dividends,
  calendarData,
  calendarLoading,
  currency,
  taxMode,
  year,
  onYearChange,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 0-11

  // Build per-month actual dividends from the DB dividends prop
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

  // For a given month, compute display total respecting taxMode
  // Priority: use calendarData (which has both actual+forecast blended) for the total,
  // but apply taxMode on top via the actual dividends we have locally.
  function getMonthDisplay(monthIdx: number): { total: number; tickerCount: number; hasActual: boolean; hasForecasted: boolean } {
    const actualDivs = actualByMonth.get(monthIdx) ?? [];
    const calMonth = calendarData?.months[monthIdx];

    const actualTotal = actualDivs.reduce((sum, d) =>
      sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);

    const forecastedDivs = (calMonth?.dividends ?? []).filter(d => d.isForecasted);
    // For forecasted, calendar API returns gross — apply net if needed (use US tax rate as default)
    const taxRate = calendarData?.taxRates.us ?? 0.3;
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

  // Drawer content for selected month
  const drawerActual: Dividend[] = selectedMonth !== null ? (actualByMonth.get(selectedMonth) ?? []) : [];
  const drawerForecasted: DividendCalendarMonthDividend[] = useMemo(() => {
    if (selectedMonth === null || !calendarData) return [];
    const actualTickers = new Set((actualByMonth.get(selectedMonth) ?? []).map(d => d.ticker));
    return (calendarData.months[selectedMonth]?.dividends ?? [])
      .filter(d => d.isForecasted && !actualTickers.has(d.ticker));
  }, [selectedMonth, calendarData, actualByMonth]);

  const drawerOpen = selectedMonth !== null;

  const drawerActualTotal = drawerActual.reduce((sum, d) =>
    sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);
  const drawerForecastedTotal = drawerForecasted.reduce((sum, d) => {
    const taxRate = calendarData?.taxRates.us ?? 0.3;
    return sum + (taxMode === 'net' ? d.amount * (1 - taxRate) : d.amount);
  }, 0);
  const drawerTotal = drawerActualTotal + drawerForecastedTotal;

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Main grid */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Year nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => onYearChange(year - 1)}
            style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 13 }}
          >‹</button>
          <span style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 13 }}
          >›</button>
        </div>

        {calendarLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <>
            {/* 6×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              {MONTH_NAMES_SHORT.map((name, idx) => {
                const { total, tickerCount, hasActual, hasForecasted } = getMonthDisplay(idx);
                const isSelected = selectedMonth === idx;
                const isCurrent = idx === currentMonth && year === currentYear;
                const isEmpty = tickerCount === 0;

                return (
                  <div
                    key={idx}
                    onClick={() => !isEmpty && setSelectedMonth(isSelected ? null : idx)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isSelected
                        ? `1px solid ${colors.accent}60`
                        : `1px solid ${isCurrent ? colors.accent + '30' : colors.border}`,
                      backgroundColor: isSelected
                        ? `${colors.accent}12`
                        : isCurrent
                          ? `${colors.accent}06`
                          : colors.surface,
                      cursor: isEmpty ? 'default' : 'pointer',
                      transition: 'all 0.12s',
                      minHeight: 96,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Month label */}
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isCurrent ? colors.accent : colors.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6,
                    }}>
                      {name}
                    </div>

                    {isEmpty ? (
                      <div style={{ color: colors.border, fontSize: 12 }}>—</div>
                    ) : (
                      <div>
                        {/* Total */}
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: hasActual ? colors.positive : colors.muted,
                          marginBottom: 3,
                        }}>
                          {fmt(total, currency)}
                        </div>
                        {/* Ticker count + badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ color: colors.muted, fontSize: 10 }}>
                            {tickerCount} stock{tickerCount !== 1 ? 's' : ''}
                          </span>
                          {hasActual && (
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              backgroundColor: `${colors.positive}18`,
                              color: colors.positive,
                              fontWeight: 600,
                            }}>received</span>
                          )}
                          {hasForecasted && (
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              backgroundColor: `${colors.muted}18`,
                              color: colors.muted,
                              fontWeight: 600,
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
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
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

      {/* Right drawer */}
      <div style={{
        width: drawerOpen ? 256 : 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}>
        <div style={{ width: 256, paddingLeft: 16, borderLeft: `1px solid ${colors.border}` }}>
          {/* Drawer header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
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
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.positive, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
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
                <div style={{ fontSize: 10, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Estimated
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drawerForecasted.map((d, i) => {
                    const taxRate = calendarData?.taxRates.us ?? 0.3;
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
