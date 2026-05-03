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
  weight: number;
  pct: number | null;
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

function squarify(items: TileInput[], x: number, y: number, width: number, height: number): TileRect[] {
  if (items.length === 0) return [];
  const totalArea = width * height;
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const areas = items.map(i => (i.value / totalValue) * totalArea);
  const result: TileRect[] = [];

  function layoutRow(row: number[], rowItems: TileInput[], rx: number, ry: number, rw: number, rh: number, horizontal: boolean) {
    const rowSum = row.reduce((a, b) => a + b, 0);
    let offset = 0;
    row.forEach((area, idx) => {
      const frac = area / rowSum;
      let tx: number, ty: number, tw: number, th: number;
      if (horizontal) { tw = rw * frac; th = rh; tx = rx + offset; ty = ry; offset += tw; }
      else { tw = rw; th = rh * frac; tx = rx; ty = ry + offset; offset += th; }
      result.push({ ...rowItems[idx], x: tx, y: ty, w: tw, h: th });
    });
  }

  function squarifyRecursive(remaining: TileInput[], remainingAreas: number[], rx: number, ry: number, rw: number, rh: number) {
    if (remaining.length === 0) return;
    if (remaining.length === 1) { result.push({ ...remaining[0], x: rx, y: ry, w: rw, h: rh }); return; }
    const horizontal = rw >= rh;
    const w = horizontal ? rh : rw;
    let currentRow: number[] = [];
    let currentItems: TileInput[] = [];
    let i = 0;
    while (i < remaining.length) {
      const newRow = [...currentRow, remainingAreas[i]];
      const newSum = newRow.reduce((a, b) => a + b, 0);
      if (currentRow.length === 0 || worst(newRow, w, newSum) <= worst(currentRow, w, newRow.reduce((a, b) => a + b, 0) - remainingAreas[i])) {
        currentRow = newRow; currentItems = [...currentItems, remaining[i]]; i++;
      } else break;
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
const GAP = 4;
const RX = 6;

const BG_POSITIVE = '#0a1a10';
const BG_NEGATIVE = '#1a0a0a';
const BG_NEUTRAL  = '#0f0f11';

function fmtValue(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontSize: 14 }}>
        No holdings with market value yet.
      </div>
    );
  }

  const inputs: TileInput[] = filtered.map(h => ({
    ticker: h.ticker, market: h.market,
    value: h.value!, weight: h.value! / totalValue,
    pct: h.unrealized_pl_pct ?? null,
  }));

  const tiles = squarify(inputs, 0, 0, W, H);
  const CHAR_W = 7;

  return (
    <svg
      width="100%" height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flex: 1, borderRadius: 8, overflow: 'hidden' }}
    >
      <defs>
        {/* Hover: brighten entire tile */}
        <filter id="f-hover">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.45" />
            <feFuncG type="linear" slope="1.45" />
            <feFuncB type="linear" slope="1.45" />
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

        // Fill proportion — direct pct mapping, capped at 100%
        const absPct = pctVal !== null ? Math.min(Math.abs(pctVal) / 100, 1) : 0;
        const fillW = w * absPct;
        const fillX = isNegative ? x + w - fillW : x;

        const baseBg = isPositive ? BG_POSITIVE : isNegative ? BG_NEGATIVE : BG_NEUTRAL;
        const pctColor = isPositive ? colors.positive : isNegative ? colors.negative : colors.muted;

        const neonColor = isPositive ? colors.positive : colors.negative;
        const clipId = `c-${idx}`;
        const name = displayTicker(tile.ticker, tile.market);
        const weightStr = `${(tile.weight * 100).toFixed(1)}%`;
        const valueStr = fmtValue(tile.value, currency);
        const pctStr = pctVal !== null ? `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%` : null;

        const maxNameFontSize = Math.min(14, Math.max(8, (w - 8) / Math.max(name.length, 1) * (14 / CHAR_W)));
        const charsPerWidth = Math.floor((w - 8) / (maxNameFontSize * CHAR_W / 14));
        const displayName = name.length > charsPerWidth && charsPerWidth > 1 ? name.slice(0, charsPerWidth - 1) + '…' : name;

        const showMultiLine = !isSmall && w >= 60 && h >= 60;
        const lineCount = showMultiLine ? (pctStr ? 4 : 3) : 1;
        const lineHeight = 16;
        const totalTextH = lineCount * lineHeight;
        const textStartY = y + h / 2 - totalTextH / 2 + lineHeight * 0.8;
        const subFontSize = Math.min(11, Math.max(8, (w - 8) / 8));

        return (
          <g
            key={`${tile.ticker}-${tile.market}-${idx}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'default' }}
            filter={isHovered ? 'url(#f-hover)' : undefined}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={x} y={y} width={w} height={h} rx={RX} />
              </clipPath>
            </defs>

            {/* Dark base */}
            <rect x={x} y={y} width={w} height={h} fill={baseBg} rx={RX} />

            {/* P&L solid fill — proportion of tile width */}
            {(isPositive || isNegative) && fillW > 0 && (
              <rect
                x={fillX} y={y} width={fillW} height={h}
                fill={neonColor}
                fillOpacity={0.10}
                clipPath={`url(#${clipId})`}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Border */}
            <rect x={x} y={y} width={w} height={h}
              fill="none"
              stroke={isHovered
                ? isPositive ? `${colors.positive}60` : isNegative ? `${colors.negative}60` : 'rgba(255,255,255,0.2)'
                : isPositive ? 'rgba(74,222,128,0.12)' : isNegative ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)'}
              strokeWidth={isHovered ? 1.5 : 1}
              rx={RX}
            />

            {!isTiny && (
              <>
                {/* Ticker — prominent */}
                <text x={x + w / 2} y={textStartY}
                  textAnchor="middle" fill={colors.text}
                  fontSize={maxNameFontSize} fontWeight="700"
                  letterSpacing="0.3"
                  style={{ fontFamily: 'inherit' }}
                >
                  {displayName}
                </text>

                {/* Value */}
                {showMultiLine && (
                  <text x={x + w / 2} y={textStartY + lineHeight}
                    textAnchor="middle" fill="rgba(237,237,239,0.7)"
                    fontSize={subFontSize}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {valueStr}
                  </text>
                )}

                {/* Weight — muted */}
                {showMultiLine && (
                  <text x={x + w / 2} y={textStartY + lineHeight * 2}
                    textAnchor="middle" fill={colors.muted}
                    fontSize={subFontSize - 1}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {weightStr}
                  </text>
                )}

                {/* P&L pct — colored, slightly larger */}
                {showMultiLine && pctStr && (
                  <text x={x + w / 2} y={textStartY + lineHeight * 3}
                    textAnchor="middle" fill={pctColor}
                    fontSize={subFontSize} fontWeight="600"
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
