'use client';

import { colors } from './theme';
import type { ReactNode } from 'react';

type TagVariant = 'default' | 'warning' | 'positive' | 'negative' | 'info';
type TagSize = 'sm' | 'md';

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  className?: string;
}

const variantStyles: Record<TagVariant, { bg: string; text: string }> = {
  default: {
    bg: 'rgba(255,255,255,0.06)',
    text: colors.text,
  },
  warning: {
    bg: `${colors.warning}18`,
    text: colors.warning,
  },
  positive: {
    bg: `${colors.positive}18`,
    text: colors.positive,
  },
  negative: {
    bg: `${colors.negative}18`,
    text: colors.negative,
  },
  info: {
    bg: `${colors.info}18`,
    text: colors.info,
  },
};

const sizeStyles: Record<TagSize, { padding: string; fontSize: string }> = {
  sm: {
    padding: '2px 8px',
    fontSize: '10px',
  },
  md: {
    padding: '3px 10px',
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
      className={`inline-flex items-center font-medium rounded-md ${className}`}
      style={{
        backgroundColor: variantStyle.bg,
        color: variantStyle.text,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
      }}
    >
      {children}
    </span>
  );
}
