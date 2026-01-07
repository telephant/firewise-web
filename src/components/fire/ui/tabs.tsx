'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { retro } from './theme';

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

// Tabs List (container for triggers) - Retro raised bar
export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div
      className={`flex rounded-sm overflow-hidden ${className}`}
      style={{
        backgroundColor: retro.surface,
        border: `2px solid ${retro.border}`,
        boxShadow: `2px 2px 0 ${retro.bevelDark}`,
      }}
      role="tablist"
    >
      {children}
    </div>
  );
}

// Tabs Trigger (individual tab button) - Retro 3D button style
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
      className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-100 ${className}`}
      style={{
        backgroundColor: isSelected ? retro.accent : retro.surface,
        color: isSelected ? '#ffffff' : retro.text,
        borderRight: `2px solid ${retro.border}`,
        boxShadow: isSelected
          ? `inset -1px -1px 0 rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.3)`
          : `inset -1px -1px 0 ${retro.bevelDark}, inset 1px 1px 0 ${retro.bevelLight}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
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
