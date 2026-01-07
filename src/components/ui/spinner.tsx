'use client';

import { cn } from '@/lib/utils';

type SpinnerVariant = 'default' | 'dots' | 'pulse' | 'bounce' | 'fire';
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

// Default circular spinner (same as the inline SVG pattern)
function DefaultSpinner({ size, className }: { size: SpinnerSize; className?: string }) {
  return (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Three bouncing dots
function DotsSpinner({ size, className }: { size: SpinnerSize; className?: string }) {
  const dotSizes: Record<SpinnerSize, string> = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('rounded-full bg-current animate-bounce', dotSizes[size])}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

// Pulsing circle
function PulseSpinner({ size, className }: { size: SpinnerSize; className?: string }) {
  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full bg-current opacity-75 animate-ping" />
      <div className="absolute inset-1 rounded-full bg-current opacity-50" />
    </div>
  );
}

// Bouncing money emoji
function BounceSpinner({ size, className }: { size: SpinnerSize; className?: string }) {
  const textSizes: Record<SpinnerSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={cn('inline-block animate-bounce emoji-sepia', textSizes[size], className)}
      style={{ animationDuration: '0.5s' }}
    >
      💰
    </span>
  );
}

// Fire emoji with flicker animation - matches the app name "Firewise"
function FireSpinner({ size, className }: { size: SpinnerSize; className?: string }) {
  const textSizes: Record<SpinnerSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span className={cn('inline-block animate-fire-flicker emoji-sepia', textSizes[size], className)}>
      🔥
    </span>
  );
}

export function Spinner({ variant = 'default', size = 'sm', className }: SpinnerProps) {
  switch (variant) {
    case 'dots':
      return <DotsSpinner size={size} className={className} />;
    case 'pulse':
      return <PulseSpinner size={size} className={className} />;
    case 'bounce':
      return <BounceSpinner size={size} className={className} />;
    case 'fire':
      return <FireSpinner size={size} className={className} />;
    default:
      return <DefaultSpinner size={size} className={className} />;
  }
}
