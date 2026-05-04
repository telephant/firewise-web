'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { colors, Button } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';
import { dividendCalendarApi } from '@/lib/fire/api';
import type { Dividend, DividendCalendarResponse } from '@/lib/fire/api';
import { DividendTableView } from './dividend-table-view';
import { DividendStatsView } from './dividend-stats-view';
import { DividendMonthCalendarView } from './dividend-month-calendar-view';

type DividendSubView = 'table' | 'stats' | 'calendar';
type TaxMode = 'gross' | 'net';
type TimeRange = 'year' | 'last12' | 'all';

interface Props {
  dividends: Dividend[];
  currency: string;
  onAddDividend: () => void;
}

const SUB_VIEWS: { id: DividendSubView; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'stats', label: 'Stats' },
  { id: 'table', label: 'Table' },
];

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: 'year', label: 'Year' },
  { id: 'last12', label: 'Last 12M' },
  { id: 'all', label: 'All' },
];

export function DividendViews({ dividends, currency, onAddDividend }: Props) {
  const { fmt } = useCurrency();
  const [view, setView] = useState<DividendSubView>('calendar');
  const [taxMode, setTaxMode] = useState<TaxMode>('gross');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  // Calendar always uses year mode; table/stats support all three ranges
  const [timeRange, setTimeRange] = useState<TimeRange>('year');

  // Effective range: calendar always forces 'year'
  const effectiveRange: TimeRange = view === 'calendar' ? 'year' : timeRange;

  const filteredDividends = useMemo(() => {
    if (effectiveRange === 'all') return dividends;
    if (effectiveRange === 'last12') {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return dividends.filter(d => new Date(d.ex_date) >= cutoff);
    }
    // 'year'
    return dividends.filter(d => new Date(d.ex_date).getFullYear() === selectedYear);
  }, [dividends, effectiveRange, selectedYear]);

  const grandTotal = filteredDividends.reduce((sum, d) =>
    sum + (taxMode === 'net'
      ? (d.amount_usd ?? 0) * (1 - d.tax_rate)
      : (d.amount_usd ?? 0)), 0);

  const [calendarData, setCalendarData] = useState<DividendCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const loadedYears = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (view !== 'calendar') return;
    if (loadedYears.current.has(selectedYear)) return;

    setCalendarLoading(true);
    dividendCalendarApi.get(selectedYear).then(res => {
      if (res.success && res.data) {
        setCalendarData(res.data);
        loadedYears.current.add(selectedYear);
      }
      setCalendarLoading(false);
    });
  }, [view, selectedYear]);

  // When switching to calendar, force year range
  const handleViewChange = (v: DividendSubView) => {
    setView(v);
  };

  const showYearNav = effectiveRange === 'year';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Top bar — fixed, never scrolls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexShrink: 0 }}>
        {/* Segmented control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: colors.surfaceLight,
          borderRadius: 8,
          padding: 3,
          border: `1px solid ${colors.border}`,
          gap: 2,
          flexShrink: 0,
        }}>
          {SUB_VIEWS.map(sv => (
            <button
              key={sv.id}
              onClick={() => handleViewChange(sv.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: view === sv.id ? colors.surface : 'transparent',
                color: view === sv.id ? colors.text : colors.muted,
                boxShadow: view === sv.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {sv.label}
            </button>
          ))}
        </div>

        {/* Time range + year nav + total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
          {/* Range selector — hidden in calendar view (always year) */}
          {view !== 'calendar' && (
            <div style={{
              display: 'inline-flex',
              backgroundColor: colors.surfaceLight,
              borderRadius: 8,
              padding: 3,
              border: `1px solid ${colors.border}`,
              gap: 2,
            }}>
              {TIME_RANGES.map(tr => (
                <button
                  key={tr.id}
                  onClick={() => setTimeRange(tr.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    backgroundColor: timeRange === tr.id ? colors.surface : 'transparent',
                    color: timeRange === tr.id ? colors.text : colors.muted,
                    boxShadow: timeRange === tr.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          )}

          {/* Year nav — shown when range=year or in calendar view */}
          {showYearNav && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
              >‹</button>
              <span style={{ color: colors.text, fontWeight: 600, fontSize: 13, minWidth: 36, textAlign: 'center' }}>{selectedYear}</span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
              >›</button>
            </div>
          )}

          {/* Total */}
          {filteredDividends.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: colors.muted, fontSize: 11, fontWeight: 500 }}>Total</span>
              <span style={{ color: colors.positive, fontSize: 13, fontWeight: 700 }}>
                {fmt(grandTotal)}
              </span>
            </div>
          )}
        </div>

        {/* Add Dividend + Tax toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Button variant="outline" onClick={onAddDividend} style={{ fontSize: 12, height: 30, padding: '0 12px' }}>Add Dividend</Button>
        <div style={{
          display: 'inline-flex',
          backgroundColor: colors.surfaceLight,
          borderRadius: 8,
          padding: 3,
          border: `1px solid ${colors.border}`,
          gap: 2,
        }}>
          {(['gross', 'net'] as TaxMode[]).map(tm => (
            <button
              key={tm}
              onClick={() => setTaxMode(tm)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: taxMode === tm ? colors.surface : 'transparent',
                color: taxMode === tm ? colors.text : colors.muted,
                boxShadow: taxMode === tm ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {tm}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'table' && (
          <DividendTableView
            dividends={filteredDividends}
            currency={currency}
            taxMode={taxMode}
          />
        )}
        {view === 'stats' && (
          <DividendStatsView
            dividends={filteredDividends}
            taxMode={taxMode}
          />
        )}
        {view === 'calendar' && (
          <DividendMonthCalendarView
            dividends={filteredDividends}
            calendarData={calendarData}
            calendarLoading={calendarLoading}
            taxMode={taxMode}
            year={selectedYear}
          />
        )}
      </div>
    </div>
  );
}
