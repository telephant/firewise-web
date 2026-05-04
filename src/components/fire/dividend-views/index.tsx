'use client';

import { useState, useEffect, useRef } from 'react';
import { colors } from '@/components/fire/ui';
import { dividendCalendarApi } from '@/lib/fire/api';
import type { Dividend, DividendCalendarResponse } from '@/lib/fire/api';
import { DividendTableView } from './dividend-table-view';
import { DividendStatsView } from './dividend-stats-view';
import { DividendMonthCalendarView } from './dividend-month-calendar-view';

type DividendSubView = 'table' | 'stats' | 'calendar';
type TaxMode = 'gross' | 'net';

interface Props {
  dividends: Dividend[];
  currency: string;
  onAddDividend: () => void;
}

const SUB_VIEWS: { id: DividendSubView; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'stats', label: 'Stats' },
  { id: 'calendar', label: 'Calendar' },
];

function fmtTotal(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendViews({ dividends, currency, onAddDividend }: Props) {
  const [view, setView] = useState<DividendSubView>('table');
  const [taxMode, setTaxMode] = useState<TaxMode>('gross');

  const grandTotal = dividends.reduce((sum, d) =>
    sum + (taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount), 0);

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarData, setCalendarData] = useState<DividendCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const loadedYears = useRef<Set<number>>(new Set());

  // Load calendar data lazily when Calendar view is activated, or year changes
  useEffect(() => {
    if (view !== 'calendar') return;
    if (loadedYears.current.has(calendarYear)) return;

    setCalendarLoading(true);
    dividendCalendarApi.get(calendarYear).then(res => {
      if (res.success && res.data) {
        setCalendarData(res.data);
        loadedYears.current.add(calendarYear);
      }
      setCalendarLoading(false);
    });
  }, [view, calendarYear]);

  return (
    <div>
      {/* Segmented control + Tax toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Segmented control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: colors.surfaceLight,
          borderRadius: 8,
          padding: 3,
          border: `1px solid ${colors.border}`,
          gap: 2,
        }}>
          {SUB_VIEWS.map(sv => (
            <button
              key={sv.id}
              onClick={() => setView(sv.id)}
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

        {/* Total — shown in stats view, sits between segmented control and tax toggle */}
        {view === 'stats' && dividends.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: colors.muted, fontSize: 11, fontWeight: 500 }}>Total</span>
            <span style={{ color: colors.positive, fontSize: 13, fontWeight: 700 }}>
              {fmtTotal(grandTotal, currency)}
            </span>
          </div>
        )}

        {/* Tax toggle */}
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

      {/* Active view */}
      {view === 'table' && (
        <DividendTableView
          dividends={dividends}
          currency={currency}
          taxMode={taxMode}
          onAdd={onAddDividend}
        />
      )}
      {view === 'stats' && (
        <DividendStatsView
          dividends={dividends}
          currency={currency}
          taxMode={taxMode}
        />
      )}
      {view === 'calendar' && (
        <DividendMonthCalendarView
          dividends={dividends}
          calendarData={calendarData}
          calendarLoading={calendarLoading}
          currency={currency}
          taxMode={taxMode}
          year={calendarYear}
          onYearChange={setCalendarYear}
        />
      )}
    </div>
  );
}
