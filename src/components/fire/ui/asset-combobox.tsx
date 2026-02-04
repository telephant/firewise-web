'use client';

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { colors } from './theme';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { IconPlus } from './icons';
import type { Asset, AssetType } from '@/types/fire';
import { ASSET_TYPE_LABELS } from '@/types/fire';

export interface AssetComboboxProps {
  label?: string;
  value?: string;
  assets: Asset[];
  onChange?: (assetId: string) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  placeholder?: string;
  /** Show balance in the option list */
  showBalance?: boolean;
  /** Show a "Create new" button */
  allowCreate?: boolean;
  /** Callback when "Create new" is clicked */
  onCreateNew?: () => void;
}

export function AssetCombobox({
  label,
  value,
  assets,
  onChange,
  disabled,
  className,
  error,
  placeholder = 'Select asset...',
  showBalance = true,
  allowCreate = false,
  onCreateNew,
}: AssetComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const hasError = !!error;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  // When inside a Radix Dialog (modal), react-remove-scroll blocks wheel events on
  // portaled elements outside the dialog DOM tree. Fix: portal into the dialog content
  // element so the popover is inside the scroll-lock's allowed zone.
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const dialog = triggerRef.current.closest('[role="dialog"]');
      setPortalContainer(dialog as HTMLElement | null);
    }
  }, [open]);

  const selectedAsset = assets.find((a) => a.id === value);

  const handleSelect = (assetId: string) => {
    onChange?.(assetId);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearch('');
    onCreateNew?.();
  };

  // Format balance for display
  const formatBalance = (asset: Asset) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: asset.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(asset.balance);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-1 font-medium"
          style={{ color: hasError ? colors.negative : colors.text }}
        >
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild disabled={disabled}>
            <button
              ref={triggerRef}
              type="button"
              className={cn(
                'flex-1 px-3 py-2 rounded-md text-sm text-left flex items-center justify-between gap-2',
                'outline-none transition-all duration-150',
                'border bg-[#1C1C1E]',
                hasError
                  ? 'border-[#F87171]'
                  : 'border-white/[0.08] hover:border-white/[0.15]',
                'focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20',
                'data-[state=open]:border-[#5E6AD2]/60 data-[state=open]:ring-2 data-[state=open]:ring-[#5E6AD2]/20',
                disabled && 'opacity-50 cursor-not-allowed',
                hasError && 'animate-shake',
                className
              )}
              style={{
                color: selectedAsset ? colors.text : colors.muted,
              }}
            >
              <span className="truncate">
                {selectedAsset ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{selectedAsset.name}</span>
                    {selectedAsset.ticker && (
                      <span style={{ color: colors.muted }}>({selectedAsset.ticker})</span>
                    )}
                  </span>
                ) : (
                  placeholder
                )}
              </span>
              <ChevronDown size={14} strokeWidth={1.5} style={{ color: colors.muted }} />
            </button>
          </Popover.Trigger>

          <Popover.Portal container={portalContainer ?? undefined}>
            <Popover.Content
              className="z-[9999] rounded-lg"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                width: 'var(--radix-popover-trigger-width)',
              }}
              sideOffset={4}
              align="start"
            >
              <Command className="flex flex-col w-full" shouldFilter={true}>
                <div
                  className="flex-shrink-0 px-2 py-2"
                  style={{ borderBottom: `1px solid ${colors.border}` }}
                >
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search asset..."
                    className="w-full px-2 py-1.5 text-sm rounded-md outline-none transition-all duration-150 border border-white/[0.08] bg-[#1C1C1E] text-[#EDEDEF] placeholder:text-[#7C7C82] focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20"
                  />
                </div>
                <Command.List className="p-1" style={{ maxHeight: '200px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    <Command.Empty
                      className="px-3 py-2 text-xs text-center"
                      style={{ color: colors.muted }}
                    >
                      No asset found
                    </Command.Empty>
                    {assets.map((asset) => (
                      <Command.Item
                        key={asset.id}
                        value={`${asset.name} ${asset.ticker || ''} ${ASSET_TYPE_LABELS[asset.type]}`}
                        onSelect={() => handleSelect(asset.id)}
                        className={cn(
                          'px-3 py-2 text-sm cursor-pointer rounded-md',
                          'transition-colors duration-100',
                          'data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white',
                          value === asset.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
                        )}
                        style={{ color: colors.text }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 flex-shrink-0 flex items-center justify-center">
                              {value === asset.id && (
                                <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{asset.name}</span>
                                {asset.ticker && (
                                  <span
                                    className="text-xs flex-shrink-0"
                                    style={{ color: colors.muted }}
                                  >
                                    ({asset.ticker})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs" style={{ color: colors.muted }}>
                                {ASSET_TYPE_LABELS[asset.type]}
                              </div>
                            </div>
                          </div>
                          {showBalance && (
                            <span
                              className="text-xs font-mono flex-shrink-0"
                              style={{ color: colors.muted }}
                            >
                              {formatBalance(asset)}
                            </span>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                </Command.List>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Create new button */}
        {allowCreate && onCreateNew && (
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={disabled}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center',
              'outline-none transition-all duration-150',
              'bg-[#141415] border border-white/[0.08] text-[#EDEDEF]',
              !disabled && 'hover:bg-[#1C1C1E] hover:border-white/[0.15]',
              'focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50',
              'active:scale-[0.97]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <IconPlus size={14} />
          </button>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs">
          <span
            className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
            style={{ backgroundColor: colors.negative }}
          >
            !
          </span>
          <span style={{ color: colors.negative }}>{error}</span>
        </div>
      )}
    </div>
  );
}
