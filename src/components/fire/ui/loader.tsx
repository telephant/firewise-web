'use client';

import { retro } from './theme';

export interface LoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display */
  text?: string;
  /** Variant style */
  variant?: 'hourglass' | 'dots' | 'bar';
}

/**
 * Retro-style loading indicator
 * Inspired by Windows 95/98 hourglass and pixelated aesthetics
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
      {variant === 'hourglass' && <HourglassLoader size={iconSize} />}
      {variant === 'dots' && <DotsLoader size={iconSize} />}
      {variant === 'bar' && <BarLoader size={iconSize} />}
      {text && (
        <span className={textClass} style={{ color: retro.muted }}>
          {text}
        </span>
      )}
    </div>
  );
}

/** Animated hourglass - classic Windows wait cursor */
function HourglassLoader({ size }: { size: number }) {
  return (
    <div
      className="relative animate-hourglass-flip"
      style={{ width: size, height: size }}
    >
      {/* Hourglass SVG - pixelated style */}
      <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Frame */}
        <rect x="2" y="1" width="12" height="2" fill={retro.border} />
        <rect x="2" y="13" width="12" height="2" fill={retro.border} />
        <rect x="2" y="1" width="2" height="2" fill={retro.border} />
        <rect x="12" y="1" width="2" height="2" fill={retro.border} />
        <rect x="2" y="13" width="2" height="2" fill={retro.border} />
        <rect x="12" y="13" width="2" height="2" fill={retro.border} />

        {/* Glass body */}
        <rect x="4" y="3" width="8" height="2" fill={retro.surfaceLight} />
        <rect x="5" y="5" width="6" height="1" fill={retro.surfaceLight} />
        <rect x="6" y="6" width="4" height="1" fill={retro.surfaceLight} />
        <rect x="7" y="7" width="2" height="2" fill={retro.surfaceLight} />
        <rect x="6" y="9" width="4" height="1" fill={retro.surfaceLight} />
        <rect x="5" y="10" width="6" height="1" fill={retro.surfaceLight} />
        <rect x="4" y="11" width="8" height="2" fill={retro.surfaceLight} />

        {/* Sand - animated via CSS */}
        <g className="animate-hourglass-sand">
          <rect x="5" y="3" width="6" height="1" fill={retro.accent} />
          <rect x="6" y="4" width="4" height="1" fill={retro.accent} />
          <rect x="7" y="7" width="2" height="1" fill={retro.accent} className="animate-hourglass-drop" />
          <rect x="5" y="11" width="6" height="1" fill={retro.accent} />
          <rect x="6" y="10" width="4" height="1" fill={retro.accent} />
        </g>
      </svg>

      <style jsx>{`
        @keyframes hourglass-flip {
          0%, 45% { transform: rotate(0deg); }
          50%, 95% { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-hourglass-flip {
          animation: hourglass-flip 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/** Animated dots - simple retro loader */
function DotsLoader({ size }: { size: number }) {
  const dotSize = Math.max(4, size / 4);
  const gap = dotSize / 2;

  return (
    <div className="flex items-center" style={{ gap }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-retro-bounce"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: retro.accent,
            border: `1px solid ${retro.border}`,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes retro-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-${dotSize}px); }
        }
        .animate-retro-bounce {
          animation: retro-bounce 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/** Animated progress bar - Windows 95 file copy style */
function BarLoader({ size }: { size: number }) {
  const height = Math.max(8, size / 3);
  const width = size * 3;
  const blockWidth = Math.max(6, size / 4);
  const blockCount = 5;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width,
        height,
        backgroundColor: retro.surfaceLight,
        border: `2px solid ${retro.border}`,
        boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -2px -2px 0 #fff`,
      }}
    >
      {/* Animated blocks */}
      <div
        className="absolute inset-y-0 flex animate-retro-slide"
        style={{ gap: 2 }}
      >
        {Array.from({ length: blockCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: blockWidth,
              height: '100%',
              backgroundColor: retro.accent,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes retro-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(${width}px); }
        }
        .animate-retro-slide {
          animation: retro-slide 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}

/** Inline loading text with animated ellipsis */
export function LoadingText({ text = 'Loading' }: { text?: string }) {
  return (
    <span className="inline-flex items-center" style={{ color: retro.muted }}>
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
