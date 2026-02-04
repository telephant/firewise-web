'use client';

import { colors } from './theme';

export interface LoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display */
  text?: string;
  /** Variant style */
  variant?: 'hourglass' | 'dots' | 'bar';
}

/**
 * Loading indicator with CSS spinner
 */
export function Loader({ size = 'md', text, variant = 'hourglass' }: LoaderProps) {
  const sizes = {
    sm: { icon: 16, text: 'text-[10px]' },
    md: { icon: 24, text: 'text-xs' },
    lg: { icon: 32, text: 'text-sm' },
  };

  const { icon: iconSize, text: textClass } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {variant === 'hourglass' && <SpinnerLoader size={iconSize} />}
      {variant === 'dots' && <DotsLoader size={iconSize} />}
      {variant === 'bar' && <BarLoader size={iconSize} />}
      {text && (
        <span className={textClass} style={{ color: colors.muted }}>
          {text}
        </span>
      )}
    </div>
  );
}

/** CSS spinner - replaces the pixel hourglass */
function SpinnerLoader({ size }: { size: number }) {
  const borderWidth = Math.max(2, Math.round(size / 8));

  return (
    <>
      <div
        className="loader-spinner rounded-full"
        style={{
          width: size,
          height: size,
          border: `${borderWidth}px solid rgba(255,255,255,0.08)`,
          borderTopColor: colors.accent,
        }}
      />
      <style jsx>{`
        .loader-spinner {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/** Animated dots loader */
function DotsLoader({ size }: { size: number }) {
  const dotSize = Math.max(3, size / 5);
  const gap = dotSize * 0.6;

  return (
    <>
      <div className="flex items-center" style={{ gap }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="loader-dot rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: colors.accent,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        .loader-dot {
          animation: dot-pulse 1s ease-in-out infinite;
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

/** Indeterminate bar loader */
function BarLoader({ size }: { size: number }) {
  const height = Math.max(4, size / 6);
  const width = size * 3;

  return (
    <>
      <div
        className="loader-bar-track rounded-full overflow-hidden"
        style={{
          width,
          height,
          backgroundColor: colors.surfaceLight,
        }}
      >
        <div
          className="loader-bar-fill h-full rounded-full"
          style={{
            width: '40%',
            backgroundColor: colors.accent,
          }}
        />
      </div>
      <style jsx>{`
        .loader-bar-fill {
          animation: bar-slide 1.2s ease-in-out infinite;
        }
        @keyframes bar-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(${width}px); }
        }
      `}</style>
    </>
  );
}

/** Inline loading text with animated ellipsis */
export function LoadingText({ text = 'Loading' }: { text?: string }) {
  return (
    <span className="inline-flex items-center" style={{ color: colors.muted }}>
      {text}
      <span className="inline-flex w-4">
        <span className="animate-ellipsis">.</span>
        <span className="animate-ellipsis" style={{ animationDelay: '200ms' }}>.</span>
        <span className="animate-ellipsis" style={{ animationDelay: '400ms' }}>.</span>
      </span>

      <style jsx>{`
        @keyframes ellipsis {
          0%, 20% { opacity: 0; }
          40%, 100% { opacity: 1; }
        }
        .animate-ellipsis {
          animation: ellipsis 1s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}
