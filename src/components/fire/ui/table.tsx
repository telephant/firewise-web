'use client';

import React from 'react';
import { colors } from './theme';
import { Loader } from './loader';

// --- Table Container ---

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div
      className={`rounded-md overflow-hidden ${className}`}
      style={{ border: `1px solid ${colors.border}` }}
    >
      {children}
    </div>
  );
}

// --- Table Header ---

interface TableHeaderProps {
  columns: string;
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ columns, children, className = '' }: TableHeaderProps) {
  return (
    <div
      className={`grid ${columns} gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide ${className}`}
      style={{
        backgroundColor: colors.surfaceLight,
        color: colors.text,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </div>
  );
}

// --- Table Header Cell ---

interface TableHeaderCellProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  active?: boolean;
  sortOrder?: 'asc' | 'desc';
  onSort?: () => void;
}

export function TableHeaderCell({
  children,
  className = '',
  align = 'left',
  sortable = false,
  active = false,
  sortOrder,
  onSort,
}: TableHeaderCellProps) {
  const alignClass = align === 'right' ? 'text-right justify-end' : align === 'center' ? 'text-center justify-center' : 'text-left';

  if (sortable && onSort) {
    return (
      <button
        onClick={onSort}
        className={`flex items-center gap-1 hover:opacity-70 ${alignClass} ${align === 'right' ? 'w-full' : ''} transition-opacity duration-150 cursor-pointer ${className}`}
        style={{ color: active ? colors.accent : colors.text }}
      >
        {children}
        {active && sortOrder && (
          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
        )}
      </button>
    );
  }

  return (
    <div className={`${alignClass} ${className}`}>
      {children}
    </div>
  );
}

// --- Table Body ---

interface TableBodyProps {
  children: React.ReactNode;
  height?: number | string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function TableBody({
  children,
  height = 400,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data found',
  className = '',
}: TableBodyProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: colors.surfaceLight,
        height,
        overflowY: 'auto',
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader size="md" variant="bar" />
        </div>
      ) : isEmpty ? (
        <div
          className="flex items-center justify-center text-xs"
          style={{ color: colors.muted, height }}
        >
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// --- Table Row ---

interface TableRowProps {
  columns: string;
  children: React.ReactNode;
  isLast?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function TableRow({
  columns,
  children,
  isLast = false,
  onClick,
  className = '',
  style,
}: TableRowProps) {
  return (
    <div
      className={`grid ${columns} gap-2 px-3 py-2 items-center text-sm group transition-colors duration-100 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
        ...style,
      } as React.CSSProperties}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.surface;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
}

// --- Table Cell ---

interface TableCellProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function TableCell({ children, className = '', align = 'left' }: TableCellProps) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
  return (
    <div className={`${alignClass} ${className}`}>
      {children}
    </div>
  );
}

// --- Table Action Button ---

interface TableActionButtonProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  color?: string;
}

export function TableActionButton({ icon, onClick, title, color = colors.muted }: TableActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="p-1 rounded-md hover:bg-[var(--hover)]"
      style={{
        color,
        '--hover': colors.surfaceLight,
      } as React.CSSProperties}
      title={title}
    >
      {icon}
    </button>
  );
}
