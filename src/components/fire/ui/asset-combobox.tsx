'use client';

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { retro, retroStyles } from './theme';
import { cn } from '@/lib/utils';
import { IconChevronDown, IconPlus } from './icons';
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
          style={{ color: hasError ? '#c53030' : retro.text }}
        >
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild disabled={disabled}>
            <button
              type="button"
              className={cn(
                'flex-1 px-3 py-2 rounded-sm text-sm text-left flex items-center justify-between gap-2',
                'focus:outline-none focus:ring-1',
                disabled && 'opacity-50 cursor-not-allowed',
                hasError && 'animate-shake',
                className
              )}
              style={{
                ...retroStyles.sunken,
                color: selectedAsset ? retro.text : retro.muted,
                ...(hasError
                  ? {
                      borderColor: '#c53030',
                      boxShadow: 'inset 2px 2px 0 rgba(197, 48, 48, 0.2)',
                    }
                  : {}),
              }}
            >
              <span className="truncate">
                {selectedAsset ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{selectedAsset.name}</span>
                    {selectedAsset.ticker && (
                      <span style={{ color: retro.muted }}>({selectedAsset.ticker})</span>
                    )}
                  </span>
                ) : (
                  placeholder
                )}
              </span>
              <span style={{ color: retro.muted }}>
                <IconChevronDown size={12} />
              </span>
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-[9999] rounded-sm"
              style={{
                backgroundColor: retro.surface,
                border: `2px solid ${retro.border}`,
                boxShadow: `3px 3px 0 ${retro.bevelDark}`,
                width: 'var(--radix-popover-trigger-width)',
              }}
              sideOffset={4}
              align="start"
            >
              <Command className="w-full" shouldFilter={true}>
                <div
                  className="px-2 py-2"
                  style={{ borderBottom: `1px solid ${retro.border}` }}
                >
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search asset..."
                    className="w-full px-2 py-1.5 text-sm rounded-sm outline-none"
                    style={{
                      ...retroStyles.sunken,
                      color: retro.text,
                    }}
                  />
                </div>
                <Command.List className="max-h-[200px] overflow-y-auto p-1">
                  <Command.Empty
                    className="px-3 py-2 text-xs text-center"
                    style={{ color: retro.muted }}
                  >
                    No asset found
                  </Command.Empty>
                  {assets.map((asset) => (
                    <Command.Item
                      key={asset.id}
                      value={`${asset.name} ${asset.ticker || ''} ${ASSET_TYPE_LABELS[asset.type]}`}
                      onSelect={() => handleSelect(asset.id)}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer rounded-sm',
                        'data-[selected=true]:bg-[var(--accent)] data-[selected=true]:text-white'
                      )}
                      style={
                        {
                          '--accent': retro.accent,
                          color: retro.text,
                          backgroundColor:
                            value === asset.id ? retro.surfaceLight : 'transparent',
                        } as React.CSSProperties
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {value === asset.id && (
                            <span className="text-xs flex-shrink-0">✓</span>
                          )}
                          <div className={cn('min-w-0', value !== asset.id && 'pl-4')}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate">{asset.name}</span>
                              {asset.ticker && (
                                <span
                                  className="text-xs flex-shrink-0"
                                  style={{ color: retro.muted }}
                                >
                                  ({asset.ticker})
                                </span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: retro.muted }}>
                              {ASSET_TYPE_LABELS[asset.type]}
                            </div>
                          </div>
                        </div>
                        {showBalance && (
                          <span
                            className="text-xs font-mono flex-shrink-0"
                            style={{ color: retro.muted }}
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
              'px-3 py-2 rounded-sm text-sm font-medium flex items-center justify-center',
              'focus:outline-none focus:ring-1',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              ...retroStyles.raised,
              color: retro.text,
            }}
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
            style={{ backgroundColor: '#c53030' }}
          >
            !
          </span>
          <span style={{ color: '#c53030' }}>{error}</span>
        </div>
      )}
    </div>
  );
}
