'use client';

import { useState } from 'react';
import { colors, getCategoryIcon, IconChevronDown } from '@/components/fire/ui';
import { FlowCategoryPreset, FLOW_CATEGORY_PRESETS } from '@/types/fire';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelect: (preset: FlowCategoryPreset) => void;
}

// Quick actions - most common transactions
const QUICK_ACTIONS = ['expense', 'salary', 'transfer', 'invest'];

// Grouped categories for "More" section
const MORE_CATEGORIES = [
  {
    label: 'Income',
    categories: ['bonus', 'freelance', 'rental', 'gift', 'dividend', 'interest'],
  },
  {
    label: 'Investments',
    categories: ['sell', 'reinvest', 'deposit'],
  },
  {
    label: 'Debt',
    categories: ['pay_debt', 'add_mortgage', 'add_loan'],
  },
];

function CategoryButton({
  preset,
  onSelect,
  size = 'default',
}: {
  preset: FlowCategoryPreset;
  onSelect: (preset: FlowCategoryPreset) => void;
  size?: 'default' | 'small';
}) {
  const isSmall = size === 'small';

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className="flex items-center gap-2.5 w-full text-left rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        padding: isSmall ? '10px 12px' : '14px 16px',
        backgroundColor: colors.surfaceLight,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span
        className="flex items-center justify-center rounded-md"
        style={{
          width: isSmall ? 28 : 36,
          height: isSmall ? 28 : 36,
          backgroundColor: colors.surface,
        }}
      >
        {getCategoryIcon(preset.id, isSmall ? 16 : 20)}
      </span>
      <span
        className="font-medium"
        style={{
          color: colors.text,
          fontSize: isSmall ? 13 : 14,
        }}
      >
        {preset.label}
      </span>
    </button>
  );
}

export function CategorySelector({
  onSelect,
}: CategorySelectorProps) {
  const [showMore, setShowMore] = useState(false);

  const quickPresets = QUICK_ACTIONS
    .map((id) => FLOW_CATEGORY_PRESETS.find((p) => p.id === id))
    .filter((p): p is FlowCategoryPreset => p !== undefined);

  return (
    <div className="space-y-4">
      {/* Quick Actions - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {quickPresets.map((preset) => (
          <CategoryButton key={preset.id} preset={preset} onSelect={onSelect} />
        ))}
      </div>

      {/* More Options Toggle */}
      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm transition-colors"
        style={{ color: colors.muted }}
      >
        <span>More options</span>
        <span
          className="transition-transform"
          style={{ transform: showMore ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <IconChevronDown size={14} />
        </span>
      </button>

      {/* More Categories */}
      {showMore && (
        <div className="space-y-4 pt-2">
          {MORE_CATEGORIES.map((group) => {
            const presets = group.categories
              .map((id) => FLOW_CATEGORY_PRESETS.find((p) => p.id === id))
              .filter((p): p is FlowCategoryPreset => p !== undefined);

            if (presets.length === 0) return null;

            return (
              <div key={group.label}>
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-2"
                  style={{ color: colors.muted }}
                >
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {presets.map((preset) => (
                    <CategoryButton
                      key={preset.id}
                      preset={preset}
                      onSelect={onSelect}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Other option */}
          <div className="pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
            <button
              type="button"
              onClick={() => onSelect(FLOW_CATEGORY_PRESETS.find((p) => p.id === 'other')!)}
              className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: colors.muted }}
            >
              <span>{getCategoryIcon('other', 14)}</span>
              <span>Other transaction</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
