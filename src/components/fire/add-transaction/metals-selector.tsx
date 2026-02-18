'use client';

import { useState, useEffect } from 'react';
import { colors, Label, Select } from '@/components/fire/ui';
import { stockPriceApi } from '@/lib/fire/api';

export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium' | 'copper';
export type MetalUnit = 'gram' | 'ounce' | 'tael' | 'kg';

export interface MetalOption {
  id: MetalType;
  label: string;
  icon: string;
  symbol: string; // Yahoo Finance symbol for price
  priceUnit: 'troy_oz' | 'pound'; // What unit Yahoo returns the price in
}

// Conversion constants (exported for use in asset value calculations)
export const TROY_OZ_TO_GRAM = 31.1035;
export const POUND_TO_GRAM = 453.592;
export const TAEL_TO_GRAM = 37.429; // Chinese tael

export const METAL_OPTIONS: MetalOption[] = [
  { id: 'gold', label: 'Gold', icon: '🥇', symbol: 'GC=F', priceUnit: 'troy_oz' },
  { id: 'silver', label: 'Silver', icon: '🥈', symbol: 'SI=F', priceUnit: 'troy_oz' },
  { id: 'platinum', label: 'Platinum', icon: '⬜', symbol: 'PL=F', priceUnit: 'troy_oz' },
  { id: 'palladium', label: 'Palladium', icon: '⚪', symbol: 'PA=F', priceUnit: 'troy_oz' },
  { id: 'copper', label: 'Copper', icon: '🟤', symbol: 'HG=F', priceUnit: 'pound' },
];

export const UNIT_OPTIONS: { id: MetalUnit; label: string; shortLabel: string }[] = [
  { id: 'gram', label: 'Grams (g)', shortLabel: 'g' },
  { id: 'ounce', label: 'Troy Ounces (oz)', shortLabel: 'oz' },
  { id: 'tael', label: 'Taels', shortLabel: 'tael' },
  { id: 'kg', label: 'Kilograms (kg)', shortLabel: 'kg' },
];

export interface MetalsSelectorProps {
  metal: MetalType;
  unit: MetalUnit;
  onMetalChange: (metal: MetalType) => void;
  onUnitChange: (unit: MetalUnit) => void;
  error?: string;
  disabled?: boolean;
}

// Convert weight between metal units
export function convertMetalWeight(weight: number, fromUnit: MetalUnit, toUnit: MetalUnit): number {
  if (fromUnit === toUnit) return weight;

  // First convert to grams (base unit)
  let weightInGrams: number;
  switch (fromUnit) {
    case 'gram':
      weightInGrams = weight;
      break;
    case 'ounce':
      weightInGrams = weight * TROY_OZ_TO_GRAM;
      break;
    case 'tael':
      weightInGrams = weight * TAEL_TO_GRAM;
      break;
    case 'kg':
      weightInGrams = weight * 1000;
      break;
    default:
      weightInGrams = weight;
  }

  // Then convert from grams to target unit
  switch (toUnit) {
    case 'gram':
      return weightInGrams;
    case 'ounce':
      return weightInGrams / TROY_OZ_TO_GRAM;
    case 'tael':
      return weightInGrams / TAEL_TO_GRAM;
    case 'kg':
      return weightInGrams / 1000;
    default:
      return weightInGrams;
  }
}

// Convert price to different units (exported for use in asset value calculations)
export function convertMetalPrice(pricePerBaseUnit: number, fromUnit: 'troy_oz' | 'pound', toUnit: MetalUnit): number {
  // First convert to per gram
  let pricePerGram: number;
  if (fromUnit === 'troy_oz') {
    pricePerGram = pricePerBaseUnit / TROY_OZ_TO_GRAM;
  } else {
    pricePerGram = pricePerBaseUnit / POUND_TO_GRAM;
  }

  // Then convert from gram to target unit
  switch (toUnit) {
    case 'gram':
      return pricePerGram;
    case 'ounce':
      return pricePerGram * TROY_OZ_TO_GRAM;
    case 'tael':
      return pricePerGram * TAEL_TO_GRAM;
    case 'kg':
      return pricePerGram * 1000;
    default:
      return pricePerGram;
  }
}

export function MetalsSelector({
  metal,
  unit,
  onMetalChange,
  onUnitChange,
  error,
  disabled = false,
}: MetalsSelectorProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch price when metal changes
  useEffect(() => {
    const metalConfig = getMetalConfig(metal);
    if (!metalConfig) return;

    setLoading(true);
    stockPriceApi.getPrices([metalConfig.symbol])
      .then((response) => {
        const metalPrice = response.data?.[metalConfig.symbol];
        if (metalPrice) {
          setPrice(metalPrice.price);
        }
      })
      .catch(() => {
        setPrice(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [metal]);

  const metalConfig = getMetalConfig(metal);
  const pricePerUnit = price && metalConfig
    ? convertMetalPrice(price, metalConfig.priceUnit, unit)
    : null;
  const pricePerGram = price && metalConfig
    ? convertMetalPrice(price, metalConfig.priceUnit, 'gram')
    : null;
  const pricePerOz = price && metalConfig
    ? convertMetalPrice(price, metalConfig.priceUnit, 'ounce')
    : null;

  return (
    <div className="space-y-3">
      {/* Metal Type */}
      <div>
        <Label variant="muted" className="block mb-1">Metal</Label>
        <div className="grid grid-cols-5 gap-2">
          {METAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onMetalChange(option.id)}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs transition-all"
              style={{
                backgroundColor: metal === option.id ? colors.accent + '20' : colors.surface,
                border: `1px solid ${metal === option.id ? colors.accent : colors.border}`,
                color: metal === option.id ? colors.accent : colors.text,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <span className="text-base">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        {/* Current Price Display */}
        {loading ? (
          <p className="mt-2 text-xs" style={{ color: colors.muted }}>
            Loading price...
          </p>
        ) : pricePerGram && pricePerOz ? (
          <p className="mt-2 text-xs" style={{ color: colors.muted }}>
            Current: <span style={{ color: colors.text }}>${pricePerGram.toFixed(2)}/g</span>
            {' · '}
            <span style={{ color: colors.text }}>${pricePerOz.toFixed(2)}/oz</span>
          </p>
        ) : null}
        {error && (
          <p className="mt-1 text-xs" style={{ color: colors.negative }}>
            {error}
          </p>
        )}
      </div>

      {/* Unit */}
      <div>
        <Label variant="muted" className="block mb-1">Unit</Label>
        <Select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as MetalUnit)}
          options={UNIT_OPTIONS.map((u) => ({
            value: u.id,
            label: u.label,
          }))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Helper to get metal config
export function getMetalConfig(metalType: MetalType): MetalOption | undefined {
  return METAL_OPTIONS.find((m) => m.id === metalType);
}

// Helper to get unit config
export function getUnitConfig(unitType: MetalUnit) {
  return UNIT_OPTIONS.find((u) => u.id === unitType);
}

// Generate asset name for metals
export function getMetalAssetName(metal: MetalType, unit: MetalUnit): string {
  const metalConfig = getMetalConfig(metal);
  const unitConfig = getUnitConfig(unit);
  return `${metalConfig?.label || metal} (${unitConfig?.shortLabel || unit})`;
}
