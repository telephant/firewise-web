'use client';

import { retro, retroStyles, getCategoryIcon, ButtonGroup, type ButtonGroupOption } from '@/components/fire/ui';
import { FlowCategoryPreset, FLOW_CATEGORY_PRESETS } from '@/types/fire';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelect: (preset: FlowCategoryPreset) => void;
}

// Simplified grouping for cleaner UI
const DISPLAY_GROUPS = [
  {
    label: 'Money In',
    categories: ['salary', 'bonus', 'freelance', 'rental', 'gift', 'dividend', 'interest'],
  },
  {
    label: 'Money Out',
    categories: ['expense', 'invest', 'pay_debt'],
  },
  {
    label: 'Move Money',
    categories: ['transfer', 'deposit', 'sell', 'reinvest'],
  },
  {
    label: 'Add Debt',
    categories: ['add_mortgage', 'add_loan'],
  },
];

// Convert preset to ButtonGroup option
function toButtonGroupOption(preset: FlowCategoryPreset): ButtonGroupOption<string> {
  return {
    id: preset.id,
    label: preset.label,
    icon: getCategoryIcon(preset.id, 20),
  };
}

export function CategorySelector({
  selectedCategory,
  onSelect,
}: CategorySelectorProps) {
  const handleChange = (id: string) => {
    const preset = FLOW_CATEGORY_PRESETS.find((p) => p.id === id);
    if (preset) {
      onSelect(preset);
    }
  };

  return (
    <div className="space-y-5">
      {DISPLAY_GROUPS.map((group) => {
        const presets = group.categories
          .map((id) => FLOW_CATEGORY_PRESETS.find((p) => p.id === id))
          .filter((p): p is FlowCategoryPreset => p !== undefined);

        if (presets.length === 0) return null;

        const options = presets.map(toButtonGroupOption);

        return (
          <ButtonGroup
            key={group.label}
            options={options}
            value={selectedCategory}
            onChange={handleChange}
            label={group.label}
            columns={4}
            size="sm"
          />
        );
      })}

      {/* Other option */}
      <div
        className="pt-3"
        style={{ borderTop: `1px solid ${retro.bevelMid}` }}
      >
        <button
          type="button"
          onClick={() => onSelect(FLOW_CATEGORY_PRESETS.find((p) => p.id === 'other')!)}
          className="flex items-center gap-2 px-3 py-2 rounded-sm transition-all active:translate-y-[1px] text-sm hover:opacity-90"
          style={{
            ...retroStyles.raised,
            color: retro.text,
          }}
        >
          <span>{getCategoryIcon('other', 16)}</span>
          <span>Other</span>
        </button>
      </div>
    </div>
  );
}
