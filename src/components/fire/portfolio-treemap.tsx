'use client';

import { useState } from 'react';
import { colors } from '@/components/fire/ui';
import { displayTicker } from '@/lib/fire/commodities';
import type { Holding } from '@/lib/fire/api';

// ── Squarified treemap ──────────────────────────────────────────────────────

interface TileInput {
  ticker: string;
  market: string;
  value: number;
  weight: number;        // 0–1
  pct: number | null;    // unrealized_pl_pct
}

interface TileRect extends TileInput {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worst(row: number[], w: number, rowSum: number): number {
  const rMin = Math.min(...row);
  const rMax = Math.max(...row);
  return Math.max((w * w * rMax) / (rowSum * rowSum), (rowSum * rowSum) / (w * w * rMin));
}

function squarify(
  items: TileInput[],
  x: number,
  y: number,
  width: number,
  height: number
): TileRect[] {
  if (items.length === 0) return [];

  const totalArea = width * height;
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const areas = items.map(i => (i.value / totalValue) * totalArea);
  const result: TileRect[] = [];

  function layoutRow(
    row: number[],
    rowItems: TileInput[],
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    horizontal: boolean
  ) {
    const rowSum = row.reduce((a, b) => a + b, 0);
    let offset = 0;
    row.forEach((area, idx) => {
      const frac = area / rowSum;
      let tx: number, ty: number, tw: number, th: number;
      if (horizontal) {
        tw = rw * frac; th = rh; tx = rx + offset; ty = ry; offset += tw;
      } else {
        tw = rw; th = rh * frac; tx = rx; ty = ry + offset; offset += th;
      }
      result.push({ ...rowItems[idx], x: tx, y: ty, w: tw, h: th });
    });
  }

  function squarifyRecursive(
    remaining: TileInput[],
    remainingAreas: number[],
    rx: number, ry: number, rw: number, rh: number
  ) {
    if (remaining.length === 0) return;
    if (remaining.length === 1) {
      result.push({ ...remaining[0], x: rx, y: ry, w: rw, h: rh });
      return;
    }

    const horizontal = rw >= rh;
    const w = horizontal ? rh : rw;
    let currentRow: number[] = [];
    let currentItems: TileInput[] = [];
    let i = 0;

    while (i < remaining.length) {
      const newRow = [...currentRow, remainingAreas[i]];
      const newSum = newRow.reduce((a, b) => a + b, 0);
      if (
        currentRow.length === 0 ||
        worst(newRow, w, newSum) <= worst(currentRow, w, newRow.reduce((a, b) => a + b, 0) - remainingAreas[i])
      ) {
        currentRow = newRow;
        currentItems = [...currentItems, remaining[i]];
        i++;
      } else {
        break;
      }
    }

    const rowSum = currentRow.reduce((a, b) => a + b, 0);
    const rowFrac = rowSum / (rw * rh);

    let newRx = rx, newRy = ry, newRw = rw, newRh = rh;
    if (horizontal) {
      const rowWidth = rw * rowFrac;
      layoutRow(currentRow, currentItems, rx, ry, rowWidth, rh, false);
      newRx = rx + rowWidth; newRw = rw - rowWidth;
    } else {
      const rowHeight = rh * rowFrac;
      layoutRow(currentRow, currentItems, rx, ry, rw, rowHeight, true);
      newRy = ry + rowHeight; newRh = rh - rowHeight;
    }

    squarifyRecursive(remaining.slice(i), remainingAreas.slice(i), newRx, newRy, newRw, newRh);
  }

  squarifyRecursive(items, areas, x, y, width, height);
  return result;
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  holdings: Holding[];
  currency: string;
  totalValue: number;
}

const W = 800;
const H = 420;
const GAP = 3;

// Darker base colors — less saturated, more "terminal"
const BG_POSITIVE = '#0d1f13';   // very dark green
const BG_NEGATIVE = '#1f0d0d';   // very dark red
const BG_NEUTRAL  = '#111113';   // near-black

// Accent colors for gradient glow — muted versions of neon
const ACCENT_POSITIVE = '#2d6a4f'; // deep forest green
const ACCENT_NEGATIVE = '#7f1d1d'; // deep crimson

function fmtValue(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? 'compact' : 'standard',
  }).format(value);
}

export function PortfolioTreemap({ holdings, currency, totalValue }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const filtered = holdings
    .filter(h => h.value !== null && h.value > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  if (filtered.length === 0 || totalValue <= 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
        fontSize: 14,
      }}>
        No holdings with market value yet.
      </div>
    );
  }

  const inputs: TileInput[] = filtered.map(h => ({
    ticker: h.ticker,
    market: h.market,
    value: h.value!,
    weight: h.value! / totalValue,
    pct: h.unrealized_pl_pct ?? null,
  }));

  const tiles = squarify(inputs, 0, 0, W, H);
  const CHAR_W = 7;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flex: 1, borderRadius: 8, overflow: 'hidden' }}
    >
      <defs>
        {/* Shared hover brightness filter */}
        <filter id="hover-brighten" x="-5%" y="-5%" width="110%" height="110%">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.3" />
            <feFuncG type="linear" slope="1.3" />
            <feFuncB type="linear" slope="1.3" />
          </feComponentTransfer>
        </filter>
      </defs>

      {tiles.map((tile, idx) => {
        const x = tile.x + GAP / 2;
        const y = tile.y + GAP / 2;
        const w = tile.w - GAP;
        const h = tile.h - GAP;

        const isSmall = w < 40 || h < 40;
        const isTiny = w < 20 || h < 20;
        const isHovered = hoveredIdx === idx;

        const pctVal = tile.pct;
        const isPositive = pctVal !== null && pctVal > 0;
        const isNegative = pctVal !== null && pctVal < 0;

        // P&L fill proportion — capped at 100%, mapped from pct directly
        const absPct = pctVal !== null ? Math.min(Math.abs(pctVal) / 100, 1) : 0;
        // fill% is the hard stop, with a soft feather of ~15% beyond
        const fillStop   = Math.round(absPct * 100);
        const featherStop = Math.min(fillStop + 15, 100);

        const baseBg   = isPositive ? BG_POSITIVE : isNegative ? BG_NEGATIVE : BG_NEUTRAL;
        const pctColor = isPositive ? colors.positive : isNegative ? colors.negative : colors.muted;
        const borderColor = isHovered
          ? isPositive ? `${colors.positive}70`
          : isNegative ? `${colors.negative}70`
          : 'rgba(255,255,255,0.18)'
          : isPositive ? 'rgba(45,106,79,0.6)'
          : isNegative ? 'rgba(127,29,29,0.6)'
          : 'rgba(255,255,255,0.06)';

        const gradId  = `g-${idx}`;
        const clipId  = `c-${idx}`;

        // Linear gradient: left→right for gain, right→left for loss
        // Solid accent color up to fillStop%, then feathers to transparent
        const accentColor = isPositive ? ACCENT_POSITIVE : ACCENT_NEGATIVE;
        const gradX1 = isNegative ? '100%' : '0%';
        const gradX2 = isNegative ? '0%' : '100%';

        const name = displayTicker(tile.ticker, tile.market);
        const weightStr = `${(tile.weight * 100).toFixed(1)}%`;
        const valueStr = fmtValue(tile.value, currency);
        const pctStr = pctVal !== null
          ? `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%`
          : null;

        const maxNameFontSize = Math.min(13, Math.max(8, (w - 8) / Math.max(name.length, 1) * (13 / CHAR_W)));
        const charsPerWidth = Math.floor((w - 8) / (maxNameFontSize * CHAR_W / 13));
        const displayName = name.length > charsPerWidth && charsPerWidth > 1
          ? name.slice(0, charsPerWidth - 1) + '…'
          : name;

        const showMultiLine = !isSmall && w >= 60 && h >= 60;
        const lineCount = showMultiLine ? (pctStr ? 4 : 3) : 1;
        const lineHeight = 15;
        const totalTextH = lineCount * lineHeight;
        const textStartY = y + h / 2 - totalTextH / 2 + lineHeight * 0.75;
        const subFontSize = Math.min(11, Math.max(8, (w - 8) / 8));

        return (
          <g
            key={`${tile.ticker}-${tile.market}-${idx}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'default' }}
            filter={isHovered ? 'url(#hover-brighten)' : undefined}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={x} y={y} width={w} height={h} rx={4} />
              </clipPath>
              {(isPositive || isNegative) && (
                <linearGradient id={gradId} x1={gradX1} y1="0%" x2={gradX2} y2="0%">
                  <stop offset="0%"            stopColor={accentColor} stopOpacity={0.85} />
                  <stop offset={`${fillStop}%`}  stopColor={accentColor} stopOpacity={0.75} />
                  <stop offset={`${featherStop}%`} stopColor={accentColor} stopOpacity={0} />
                  <stop offset="100%"          stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>

            {/* Dark base */}
            <rect
              x={x} y={y} width={w} height={h}
              fill={baseBg}
              rx={4}
            />

            {/* Radial glow overlay */}
            {(isPositive || isNegative) && (
              <rect
                x={x} y={y} width={w} height={h}
                fill={`url(#${gradId})`}
                clipPath={`url(#${clipId})`}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Border on top */}
            <rect
              x={x} y={y} width={w} height={h}
              fill="none"
              stroke={borderColor}
              strokeWidth={isHovered ? 1.5 : 1}
              rx={4}
            />

            {!isTiny && (
              <>
                <text
                  x={x + w / 2}
                  y={textStartY}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={maxNameFontSize}
                  fontWeight="600"
                  style={{ fontFamily: 'inherit' }}
                >
                  {displayName}
                </text>

                {showMultiLine && (
                  <text
                    x={x + w / 2}
                    y={textStartY + lineHeight}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize={subFontSize}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {valueStr}
                  </text>
                )}

                {showMultiLine && (
                  <text
                    x={x + w / 2}
                    y={textStartY + lineHeight * 2}
                    textAnchor="middle"
                    fill={colors.muted}
                    fontSize={subFontSize}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {weightStr}
                  </text>
                )}

                {showMultiLine && pctStr && (
                  <text
                    x={x + w / 2}
                    y={textStartY + lineHeight * 3}
                    textAnchor="middle"
                    fill={pctColor}
                    fontSize={subFontSize}
                    fontWeight="500"
                    style={{ fontFamily: 'inherit' }}
                  >
                    {pctStr}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
