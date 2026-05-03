'use client';

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

  // Normalise values to fill the available area
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
        tw = rw * frac;
        th = rh;
        tx = rx + offset;
        ty = ry;
        offset += tw;
      } else {
        tw = rw;
        th = rh * frac;
        tx = rx;
        ty = ry + offset;
        offset += th;
      }
      result.push({ ...rowItems[idx], x: tx, y: ty, w: tw, h: th });
    });
  }

  function squarifyRecursive(
    remaining: TileInput[],
    remainingAreas: number[],
    rx: number,
    ry: number,
    rw: number,
    rh: number
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
    const totalRect = rw * rh;
    const rowFrac = rowSum / totalRect;

    let newRx = rx, newRy = ry, newRw = rw, newRh = rh;
    if (horizontal) {
      const rowWidth = rw * rowFrac;
      layoutRow(currentRow, currentItems, rx, ry, rowWidth, rh, false);
      newRx = rx + rowWidth;
      newRw = rw - rowWidth;
    } else {
      const rowHeight = rh * rowFrac;
      layoutRow(currentRow, currentItems, rx, ry, rw, rowHeight, true);
      newRy = ry + rowHeight;
      newRh = rh - rowHeight;
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
const GAP = 2;

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
  const filtered = holdings
    .filter(h => h.value !== null && h.value > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  if (filtered.length === 0 || totalValue <= 0) {
    return (
      <div style={{
        height: H,
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
  const CHAR_W = 7; // approximate px width per character at 13px font size

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}
    >
      {tiles.map((tile, idx) => {
        const x = tile.x + GAP / 2;
        const y = tile.y + GAP / 2;
        const w = tile.w - GAP;
        const h = tile.h - GAP;

        const isSmall = w < 40 || h < 40;
        const isTiny = w < 20 || h < 20;

        const pctVal = tile.pct;
        let bg: string;
        let border: string;
        let pctColor: string;
        if (pctVal === null) {
          bg = colors.surfaceLight;
          border = colors.border;
          pctColor = colors.muted;
        } else if (pctVal > 0) {
          bg = `${colors.positive}18`;
          border = `${colors.positive}40`;
          pctColor = colors.positive;
        } else if (pctVal < 0) {
          bg = `${colors.negative}18`;
          border = `${colors.negative}40`;
          pctColor = colors.negative;
        } else {
          bg = colors.surfaceLight;
          border = colors.border;
          pctColor = colors.muted;
        }

        const name = displayTicker(tile.ticker, tile.market);
        const weightStr = `${(tile.weight * 100).toFixed(1)}%`;
        const valueStr = fmtValue(tile.value, currency);
        const pctStr = pctVal !== null
          ? `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%`
          : null;

        // Font size: fit name into tile width, cap at 13px
        const maxNameFontSize = Math.min(13, Math.max(8, (w - 8) / Math.max(name.length, 1) * (13 / CHAR_W)));
        // Truncate name to fit tile width at computed font size
        const charsPerWidth = Math.floor((w - 8) / (maxNameFontSize * CHAR_W / 13));
        const displayName = name.length > charsPerWidth && charsPerWidth > 1
          ? name.slice(0, charsPerWidth - 1) + '…'
          : name;

        // Decide which lines to show based on available height
        const showMultiLine = !isSmall && w >= 60 && h >= 60;
        const lineCount = showMultiLine ? (pctStr ? 4 : 3) : 1;
        const lineHeight = 15;
        const totalTextH = lineCount * lineHeight;
        const textStartY = y + h / 2 - totalTextH / 2 + lineHeight * 0.75;

        // Sub-line font size: fit value/weight/pct strings into tile width
        const subFontSize = Math.min(11, Math.max(8, (w - 8) / 8));

        return (
          <g key={`${tile.ticker}-${tile.market}-${idx}`}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={bg}
              stroke={border}
              strokeWidth={1}
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
