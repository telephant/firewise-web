const CACHE_KEY = 'frequent_expenses';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day

interface FrequentExpense {
  name: string;
  category_id: string | null;
  count: number;
}

interface CacheData {
  expenses: FrequentExpense[];
  timestamp: number;
}

function getCacheKey(ledgerId: string): string {
  return `${CACHE_KEY}_${ledgerId}`;
}

export function getCachedFrequentExpenses(ledgerId: string): FrequentExpense[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(getCacheKey(ledgerId));
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(getCacheKey(ledgerId));
      return null;
    }

    return data.expenses;
  } catch {
    return null;
  }
}

export function setCachedFrequentExpenses(ledgerId: string, expenses: FrequentExpense[]): void {
  if (typeof window === 'undefined') return;

  try {
    const cache: CacheData = {
      expenses,
      timestamp: Date.now(),
    };
    localStorage.setItem(getCacheKey(ledgerId), JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export function clearFrequentExpenseCache(ledgerId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getCacheKey(ledgerId));
}
