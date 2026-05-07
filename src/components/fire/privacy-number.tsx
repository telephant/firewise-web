'use client';

import { useMemo } from 'react';
import { usePrivacy } from './privacy-context';

interface PrivacyNumberProps {
  value: string;
  style?: React.CSSProperties;
  className?: string;
}

// Deterministic pseudo-random from seed
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function PrivacyNumber({ value, style, className }: PrivacyNumberProps) {
  const { privacyMode } = usePrivacy();

  // Derive dot count from string length so width feels proportional
  const dotCount = Math.max(6, Math.min(18, Math.round(value.length * 1.4)));

  const dots = useMemo(() => {
    return Array.from({ length: dotCount }, (_, i) => ({
      size:     2 + seededRand(i * 3)     * 3,        // 2–5px
      x:        seededRand(i * 3 + 1)     * 100,      // 0–100%
      y:        seededRand(i * 3 + 2)     * 100,      // 0–100%
      delay:    seededRand(i * 7)         * 2,        // 0–2s
      duration: 1.6 + seededRand(i * 11) * 1.4,      // 1.6–3s
      opacity:  0.35 + seededRand(i * 13) * 0.55,    // 0.35–0.9
      driftX:   (seededRand(i * 17) - 0.5) * 10,     // -5–5px drift
      driftY:   (seededRand(i * 19) - 0.5) * 10,
    }));
  }, [dotCount]);

  if (!privacyMode) {
    return <span style={style} className={className}>{value}</span>;
  }

  return (
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        width: `${value.length * 0.55}em`,
        height: '1em',
        verticalAlign: 'middle',
        ...style,
      }}
      className={className}
    >
      {dots.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            opacity: d.opacity,
            animation: `privacyFloat ${d.duration}s ease-in-out ${d.delay}s infinite`,
            '--drift-x': `${d.driftX}px`,
            '--drift-y': `${d.driftY}px`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
