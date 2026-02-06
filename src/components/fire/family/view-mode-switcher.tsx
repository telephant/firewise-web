'use client';

import { useViewModeSafe } from '@/contexts/fire/view-mode-context';
import { colors } from '@/components/fire/ui';
import type { ViewMode } from '@/types/family';

interface ViewModeSwitcherProps {
  className?: string;
}

export function ViewModeSwitcher({ className }: ViewModeSwitcherProps) {
  const context = useViewModeSafe();

  // If context not available or user is not in a family, don't render
  if (!context || !context.isInFamily) {
    return null;
  }

  const { viewMode, setViewMode, family } = context;

  const options: { value: ViewMode; label: string; emoji: string }[] = [
    { value: 'personal', label: 'Personal', emoji: '👤' },
    { value: 'family', label: family?.name || 'Family', emoji: '👨‍👩‍👧' },
  ];

  return (
    <div className={className}>
      {/* Pill container */}
      <div
        className="flex p-1 rounded-lg gap-1"
        style={{
          backgroundColor: colors.surfaceLight,
          border: `1px solid ${colors.border}`,
        }}
      >
        {options.map((option) => {
          const isActive = viewMode === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setViewMode(option.value)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: isActive ? colors.accent : 'transparent',
                color: isActive ? '#fff' : colors.muted,
              }}
            >
              <span className="text-sm">{option.emoji}</span>
              <span className="truncate max-w-[60px]">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
