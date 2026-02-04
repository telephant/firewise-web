'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { colors } from './theme';
import { cn } from '@/lib/utils';

// Context for tabs state
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Tabs Root
export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Tabs List (container for triggers) - flat dark bar
export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div
      className={`flex gap-1 rounded-lg p-1 ${className}`}
      style={{
        backgroundColor: colors.surface,
      }}
      role="tablist"
    >
      {children}
    </div>
  );
}

// Tabs Trigger (individual tab button) - pill-style active
export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  children,
  className = '',
  disabled = false,
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        'flex-1 px-4 py-1.5 text-sm font-medium rounded-md',
        'transition-all duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : !isSelected && 'hover:bg-white/[0.04] hover:text-[#EDEDEF]',
        isSelected && 'active:scale-[0.97]',
        className
      )}
      style={{
        backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : undefined,
        color: isSelected ? colors.text : colors.muted,
      }}
    >
      {children}
    </button>
  );
}

// Tabs Content (panel for each tab)
export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  /** If true, content is hidden with CSS instead of unmounting (preserves state) */
  forceMount?: boolean;
}

export function TabsContent({ value, children, className = '', forceMount = false }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;

  // If forceMount is false (default), unmount when not selected
  if (!forceMount && !isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={className}
      style={!isSelected ? { display: 'none' } : undefined}
      hidden={!isSelected}
    >
      {children}
    </div>
  );
}
