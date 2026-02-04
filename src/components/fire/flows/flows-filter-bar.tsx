'use client';

import { colors, FilterDropdown, Input } from '@/components/fire/ui';
import { getCategoryIcon } from '@/components/fire/ui/category-icons';
import type { FilterOption, FilterGroup } from '@/components/fire/ui';

// All available flow categories
const FLOW_CATEGORIES = [
  { id: 'salary', label: 'Salary', type: 'income' },
  { id: 'bonus', label: 'Bonus', type: 'income' },
  { id: 'freelance', label: 'Freelance', type: 'income' },
  { id: 'dividend', label: 'Dividend', type: 'income' },
  { id: 'interest', label: 'Interest', type: 'income' },
  { id: 'rental', label: 'Rental', type: 'income' },
  { id: 'gift', label: 'Gift', type: 'income' },
  { id: 'expense', label: 'Expense', type: 'expense' },
  { id: 'invest', label: 'Invest', type: 'expense' },
  { id: 'pay_debt', label: 'Debt Payment', type: 'expense' },
  { id: 'transfer', label: 'Transfer', type: 'transfer' },
  { id: 'deposit', label: 'Deposit', type: 'transfer' },
  { id: 'sell', label: 'Sell', type: 'transfer' },
  { id: 'reinvest', label: 'Reinvest', type: 'transfer' },
] as const;

type FlowCategory = typeof FLOW_CATEGORIES[number]['id'];

interface FlowsFilterBarProps {
  // Category filter
  selectedCategories: FlowCategory[];
  onCategoriesChange: (categories: FlowCategory[]) => void;
  // Date range filter
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Prepare filter options with icons
const CATEGORY_OPTIONS: FilterOption[] = FLOW_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  group: cat.type,
  icon: getCategoryIcon(cat.id, 14),
}));

const CATEGORY_GROUPS: FilterGroup[] = [
  { id: 'income', label: 'Money In' },
  { id: 'expense', label: 'Money Out' },
  { id: 'transfer', label: 'Transfers' },
];

export function FlowsFilterBar({
  selectedCategories,
  onCategoriesChange,
  startDate,
  endDate,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
}: FlowsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Category Dropdown */}
      <FilterDropdown
        options={CATEGORY_OPTIONS}
        groups={CATEGORY_GROUPS}
        value={selectedCategories}
        onChange={(val) => onCategoriesChange(val as FlowCategory[])}
        multiple
        allLabel="All Categories"
      />

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onDateRangeChange(e.target.value, endDate)}
          className="px-2 py-1.5 text-xs"
        />
        <span style={{ color: colors.muted }}>to</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onDateRangeChange(startDate, e.target.value)}
          className="px-2 py-1.5 text-xs"
        />
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[150px] max-w-[250px]">
        <Input
          type="text"
          placeholder="Search flows..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="py-1.5 text-xs"
        />
      </div>

      {/* Active filters indicator */}
      {(selectedCategories.length > 0 || searchQuery) && (
        <button
          onClick={() => {
            onCategoriesChange([]);
            onSearchChange('');
          }}
          className="px-2 py-1 text-xs rounded-md transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
          style={{ color: colors.info }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export { FLOW_CATEGORIES };
export type { FlowCategory };
