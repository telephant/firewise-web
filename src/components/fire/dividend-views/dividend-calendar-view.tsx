'use client';

import { useState, useMemo } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import type { Dividend, DividendCalendarResponse, DividendCalendarMonthDividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];       // actual dividends from DB (already loaded)
  calendarData: DividendCalendarResponse | null;
  calendarLoading: boolean;
  currency: string;
  taxMode: 'gross' | 'net';
  year: number;
  month: number; // 0-11
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendCalendarView({
  dividends,
  calendarData,
  calendarLoading,
  currency,
  taxMode,
  year,
  month,
  onYearChange,
  onMonthChange,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 'YYYY-MM-DD'

  // Build a map: date string -> list of MonthDividend (forecasted) + Dividend (actual)
  const calendarDividendsByDate = useMemo(() => {
    if (!calendarData) return new Map<string, DividendCalendarMonthDividend[]>();
    const map = new Map<string, DividendCalendarMonthDividend[]>();
    const monthData = calendarData.months[month];
    if (!monthData) return map;
    monthData.dividends.forEach(d => {
      if (!d.date) return; // forecasted with no specific date — skip in daily view
      if (!map.has(d.date)) map.set(d.date, []);
      map.get(d.date)!.push(d);
    });
    return map;
  }, [calendarData, month]);

  // Actual dividends (from DB) for the selected month
  const actualByDate = useMemo(() => {
    const map = new Map<string, Dividend[]>();
    dividends.forEach(d => {
      const dd = new Date(d.ex_date);
      if (dd.getFullYear() === year && dd.getMonth() === month) {
        if (!map.has(d.ex_date)) map.set(d.ex_date, []);
        map.get(d.ex_date)!.push(d);
      }
    });
    return map;
  }, [dividends, year, month]);

  // All dates that have any activity (ex_date from actual, date from calendarData)
  const activeDates = useMemo(() => {
    const set = new Set<string>();
    actualByDate.forEach((_, date) => set.add(date));
    calendarDividendsByDate.forEach((_, date) => set.add(date));
    return set;
  }, [actualByDate, calendarDividendsByDate]);

  // Detail panel data
  const panelActual: Dividend[] = selectedDate ? (actualByDate.get(selectedDate) ?? []) : [];
  const panelCalendar: DividendCalendarMonthDividend[] = selectedDate ? (calendarDividendsByDate.get(selectedDate) ?? []) : [];
  const panelOpen = selectedDate !== null;

  // Build calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0 offset

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function toDateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div style={{ display: 'flex', position: 'relative', gap: 0 }}>
      {/* Main calendar area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                if (month === 0) { onYearChange(year - 1); onMonthChange(11); }
                else onMonthChange(month - 1);
              }}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 14 }}
            >‹</button>
            <span style={{ color: colors.text, fontWeight: 600, fontSize: 14, minWidth: 120, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={() => {
                if (month === 11) { onYearChange(year + 1); onMonthChange(0); }
                else onMonthChange(month + 1);
              }}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 14 }}
            >›</button>
          </div>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onYearChange(year - 1)}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
            >‹ {year - 1}</button>
            <button
              onClick={() => onYearChange(year + 1)}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
            >{year + 1} ›</button>
          </div>
        </div>

        {calendarLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <>
            {/* Day header row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: 600, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const dateStr = toDateStr(day);
                const hasActual = actualByDate.has(dateStr);
                const hasCalendar = calendarDividendsByDate.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    style={{
                      borderRadius: 6,
                      padding: '6px 4px 4px',
                      minHeight: 52,
                      cursor: activeDates.has(dateStr) ? 'pointer' : 'default',
                      backgroundColor: isSelected
                        ? `${colors.accent}20`
                        : 'transparent',
                      border: isSelected
                        ? `1px solid ${colors.accent}50`
                        : `1px solid ${isToday ? colors.border : 'transparent'}`,
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? colors.accent : (activeDates.has(dateStr) ? colors.text : colors.muted),
                      textAlign: 'center',
                      marginBottom: 4,
                    }}>
                      {day}
                    </div>
                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {hasActual && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.accent }} title="Ex-date" />
                      )}
                      {hasCalendar && !hasActual && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.warning, opacity: 0.7 }} title="Forecasted" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.accent }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Actual (ex-date)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.warning, opacity: 0.7 }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Forecasted</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right detail panel */}
      <div
        style={{
          width: panelOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 240,
          borderLeft: `1px solid ${colors.border}`,
          paddingLeft: 16,
          paddingTop: 4,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          {panelActual.length === 0 && panelCalendar.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 12 }}>No dividends on this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {panelActual.map(d => {
                const amount = taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount;
                return (
                  <div key={d.id} style={{ padding: '10px 12px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>{d.ticker}</span>
                      <span style={{ color: colors.positive, fontSize: 13, fontWeight: 600 }}>{fmtFull(amount, d.currency)}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>
                      {d.shares_at_exdate.toFixed(4)} shares · {(d.tax_rate * 100).toFixed(0)}% tax
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3, fontWeight: 500,
                        backgroundColor: d.source === 'auto' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)',
                        color: d.source === 'auto' ? colors.accent : colors.muted,
                        border: `1px solid ${d.source === 'auto' ? 'rgba(94,106,210,0.3)' : colors.border}`,
                      }}>{d.source}</span>
                    </div>
                  </div>
                );
              })}
              {panelCalendar.map((d, i) => (
                <div key={`fc-${i}`} style={{ padding: '10px 12px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px dashed ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>{d.ticker}</span>
                    <span style={{ color: colors.warning, fontSize: 13, fontWeight: 600 }}>{fmtFull(d.amount, currency)}</span>
                  </div>
                  <div style={{ color: colors.muted, fontSize: 11 }}>
                    Forecasted{d.frequency ? ` · ${d.frequency}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
