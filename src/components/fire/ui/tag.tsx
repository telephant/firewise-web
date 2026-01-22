'use client';

import { retro } from './theme';
import type { ReactNode } from 'react';

type TagVariant = 'default' | 'warning' | 'positive' | 'negative' | 'info';
type TagSize = 'sm' | 'md';

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
}

const variantStyles: Record<TagVariant, { bg: string; border: string; text: string }> = {
  default: {
    bg: retro.bevelMid,
    border: retro.border,
    text: retro.text,
  },
  warning: {
    bg: `${retro.warning}25`,
    border: retro.warning,
    text: retro.warning,
  },
  positive: {
    bg: `${retro.positive}20`,
    border: retro.positive,
    text: retro.positive,
  },
  negative: {
    bg: `${retro.negative}20`,
    border: retro.negative,
    text: retro.negative,
  },
  info: {
    bg: `${retro.info}20`,
    border: retro.info,
    text: retro.info,
  },
};

const sizeStyles: Record<TagSize, { padding: string; fontSize: string }> = {
  sm: {
    padding: '1px 6px',
    fontSize: '10px',
  },
  md: {
    padding: '2px 8px',
    fontSize: '11px',
  },
};

export function Tag({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: TagProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-sm ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        border: `1.5px solid ${variantStyle.border}`,
        color: variantStyle.text,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        boxShadow: `1px 1px 0 ${retro.bevelDark}`,
      }}
    >
      {children}
    </span>
  );
}
