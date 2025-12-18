// Shared category color definitions for consistent styling across the app

export interface CategoryColorSet {
  badge: string;    // For badge backgrounds with text color
  bar: string;      // For color indicator bars
}

const CATEGORY_COLORS: CategoryColorSet[] = [
  { badge: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400', bar: 'bg-rose-300' },
  { badge: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', bar: 'bg-orange-300' },
  { badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', bar: 'bg-amber-300' },
  { badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', bar: 'bg-emerald-300' },
  { badge: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400', bar: 'bg-teal-300' },
  { badge: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400', bar: 'bg-cyan-300' },
  { badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', bar: 'bg-blue-300' },
  { badge: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', bar: 'bg-violet-300' },
  { badge: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400', bar: 'bg-purple-300' },
  { badge: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400', bar: 'bg-pink-300' },
];

// Generate a consistent color based on category name
export function getCategoryColor(name: string): CategoryColorSet {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// Get just the bar color (for the thin indicator)
export function getCategoryBarColor(name: string): string {
  return getCategoryColor(name).bar;
}

// Get just the badge classes
export function getCategoryBadgeColor(name: string): string {
  return getCategoryColor(name).badge;
}
