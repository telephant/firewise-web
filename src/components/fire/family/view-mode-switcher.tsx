'use client';

import { useViewModeSafe } from '@/contexts/fire/view-mode-context';
import { colors } from '@/components/fire/ui';
import type { ViewMode } from '@/types/family';

interface ViewModeSwitcherProps {
  className?: string;
}

// Square avatar
function AvatarWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="relative w-10 h-10">
      {/* Pixel shadow layer */}
      <div
        className="absolute top-[3px] left-[3px] w-full h-full"
        style={{ backgroundColor: 'transparent' }}
      />
      {/* Main avatar */}
      <div
        className="relative w-full h-full flex items-center justify-center text-lg"
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${active ? colors.accent : colors.border}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PersonalAvatar({ active }: { active: boolean }) {
  return (
    <AvatarWrapper active={active}>
      👤
    </AvatarWrapper>
  );
}

function FamilyAvatar({ active }: { active: boolean }) {
  return (
    <AvatarWrapper active={active}>
      👨‍👩‍👧
    </AvatarWrapper>
  );
}

export function ViewModeSwitcher({ className }: ViewModeSwitcherProps) {
  const context = useViewModeSafe();

  // If context not available or user is not in a family, don't render
  if (!context || !context.isInFamily) {
    return null;
  }

  const { viewMode, setViewMode, family } = context;

  const options: { value: ViewMode; label: string; avatar: typeof PersonalAvatar }[] = [
    { value: 'personal', label: 'Personal', avatar: PersonalAvatar },
    { value: 'family', label: family?.name || 'Family', avatar: FamilyAvatar },
  ];

  return (
    <div className={className}>
      <div className="flex gap-4">
        {options.map((option) => {
          const isActive = viewMode === option.value;
          const Avatar = option.avatar;
          return (
            <button
              key={option.value}
              onClick={() => setViewMode(option.value)}
              className="flex flex-col items-center gap-1.5 group transition-all hover:bg-white/[0.04] cursor-pointer"
            >
              <Avatar active={isActive} />
              <div className="flex flex-col items-center">
                <span
                  className="text-xs font-medium truncate max-w-[72px]"
                  style={{
                    color: isActive ? colors.text : colors.muted,
                  }}
                >
                  {option.label}
                </span>
                {/* Active underline */}
                <div className="relative mt-0.5 h-1" style={{ width: isActive ? '100%' : 0 }}>
                  {isActive && (
                    <>
                      {/* Shadow layer */}
                      <div
                        className="absolute top-[2px] left-[2px] w-full h-full"
                        style={{ backgroundColor: 'transparent' }}
                      />
                      {/* Main bar */}
                      <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ backgroundColor: colors.accent }}
                      />
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
