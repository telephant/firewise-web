import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

export type PeriodOption = 'all' | 'this-month' | 'last-month' | 'last-7-days' | 'last-30-days' | 'custom';

export interface DateRange {
  start_date?: string;
  end_date?: string;
}

export interface CustomDateRange {
  start: Date;
  end: Date;
}

/**
 * Get the date range for a given period option
 * Returns start_date and end_date in 'yyyy-MM-dd' format for API consumption
 */
export function getPeriodDateRange(
  period: PeriodOption,
  customRange?: CustomDateRange
): DateRange {
  const now = new Date();

  switch (period) {
    case 'all':
      return {};

    case 'this-month':
      return {
        start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      };

    case 'last-month': {
      const lastMonth = subMonths(now, 1);
      return {
        start_date: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }

    case 'last-7-days':
      return {
        start_date: format(subDays(startOfDay(now), 6), 'yyyy-MM-dd'),
        end_date: format(endOfDay(now), 'yyyy-MM-dd'),
      };

    case 'last-30-days':
      return {
        start_date: format(subDays(startOfDay(now), 29), 'yyyy-MM-dd'),
        end_date: format(endOfDay(now), 'yyyy-MM-dd'),
      };

    case 'custom':
      if (customRange) {
        return {
          start_date: format(customRange.start, 'yyyy-MM-dd'),
          end_date: format(customRange.end, 'yyyy-MM-dd'),
        };
      }
      return {};

    default:
      return {};
  }
}

/**
 * Get display label for a period option
 */
export function getPeriodLabel(period: PeriodOption, customRange?: CustomDateRange): string {
  switch (period) {
    case 'all':
      return 'All Time';
    case 'this-month':
      return 'This Month';
    case 'last-month':
      return 'Last Month';
    case 'last-7-days':
      return 'Last 7 Days';
    case 'last-30-days':
      return 'Last 30 Days';
    case 'custom':
      if (customRange) {
        return `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d, yyyy')}`;
      }
      return 'Custom Range';
    default:
      return 'All Time';
  }
}

/**
 * Period options for dropdown
 */
export const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range...' },
];
