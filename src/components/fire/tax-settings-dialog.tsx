'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import {
  colors,
  Button,
  Input,
  Label,
  Loader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/fire/ui';
import { userTaxSettingsApi } from '@/lib/fire/api';

interface TaxSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxSettingsDialog({ open, onOpenChange }: TaxSettingsDialogProps) {
  const [saving, setSaving] = useState(false);

  // Fetch user tax settings
  const { data, isLoading, error, mutate } = useSWR(
    open ? '/fire/tax-settings' : null,
    async () => {
      const res = await userTaxSettingsApi.get();
      if (!res.success) throw new Error(res.error || 'Failed to fetch');
      return res.data;
    }
  );

  // Track if user has edited values (to avoid overwriting user edits when data updates)
  const hasEditedRef = useRef(false);
  const prevDataIdRef = useRef<string | null>(null);

  // Local state for form values (percentages 0-100) - null means use data values
  // US rates
  const [usDividendRateEdited, setUsDividendRateEdited] = useState<string | null>(null);
  const [usCapitalGainsRateEdited, setUsCapitalGainsRateEdited] = useState<string | null>(null);
  // SG rates
  const [sgDividendRateEdited, setSgDividendRateEdited] = useState<string | null>(null);
  const [sgCapitalGainsRateEdited, setSgCapitalGainsRateEdited] = useState<string | null>(null);

  // Derive display values - use edited value if user has edited, otherwise from data
  const usDividendRate = usDividendRateEdited ?? (data ? (data.us_dividend_withholding_rate * 100).toString() : '');
  const usCapitalGainsRate = usCapitalGainsRateEdited ?? (data ? (data.us_capital_gains_rate * 100).toString() : '');
  const sgDividendRate = sgDividendRateEdited ?? (data ? (data.sg_dividend_withholding_rate * 100).toString() : '');
  const sgCapitalGainsRate = sgCapitalGainsRateEdited ?? (data ? (data.sg_capital_gains_rate * 100).toString() : '');

  // Track data changes - reset edited state if data ID changes (new settings loaded)
  if (data?.id && data.id !== prevDataIdRef.current) {
    prevDataIdRef.current = data.id;
    // Reset edited values when loading fresh data
    if (!hasEditedRef.current) {
      setUsDividendRateEdited(null);
      setUsCapitalGainsRateEdited(null);
      setSgDividendRateEdited(null);
      setSgCapitalGainsRateEdited(null);
    }
  }

  // Handlers that track edits
  const setUsDividendRate = (value: string) => {
    setUsDividendRateEdited(value);
    hasEditedRef.current = true;
  };

  const setUsCapitalGainsRate = (value: string) => {
    setUsCapitalGainsRateEdited(value);
    hasEditedRef.current = true;
  };

  const setSgDividendRate = (value: string) => {
    setSgDividendRateEdited(value);
    hasEditedRef.current = true;
  };

  const setSgCapitalGainsRate = (value: string) => {
    setSgCapitalGainsRateEdited(value);
    hasEditedRef.current = true;
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on close
      setUsDividendRateEdited(null);
      setUsCapitalGainsRateEdited(null);
      setSgDividendRateEdited(null);
      setSgCapitalGainsRateEdited(null);
      hasEditedRef.current = false;
      prevDataIdRef.current = null;
    }
    onOpenChange(newOpen);
  };

  const validateRate = (rate: string, label: string): number | null => {
    const decimal = parseFloat(rate) / 100;
    if (isNaN(decimal) || decimal < 0 || decimal > 1) {
      toast.error(`${label} must be between 0 and 100%`);
      return null;
    }
    return decimal;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate all rates
      const usDiv = validateRate(usDividendRate, 'US Dividend withholding rate');
      if (usDiv === null) { setSaving(false); return; }

      const usCap = validateRate(usCapitalGainsRate, 'US Capital gains rate');
      if (usCap === null) { setSaving(false); return; }

      const sgDiv = validateRate(sgDividendRate, 'SG Dividend withholding rate');
      if (sgDiv === null) { setSaving(false); return; }

      const sgCap = validateRate(sgCapitalGainsRate, 'SG Capital gains rate');
      if (sgCap === null) { setSaving(false); return; }

      const res = await userTaxSettingsApi.update({
        us_dividend_withholding_rate: usDiv,
        us_capital_gains_rate: usCap,
        sg_dividend_withholding_rate: sgDiv,
        sg_capital_gains_rate: sgCap,
      });

      if (res.success) {
        toast.success('Tax settings saved');
        mutate();
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reusable rate input component
  const RateInput = ({
    label,
    value,
    onChange,
    placeholder,
    hint,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    hint?: string;
  }) => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Label className="text-sm">{label}</Label>
        {hint && (
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {hint}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-20 text-right"
        />
        <span className="text-sm" style={{ color: colors.muted }}>%</span>
      </div>
    </div>
  );

  // Market section component
  const MarketSection = ({
    icon,
    title,
    children,
  }: {
    icon: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: colors.surfaceLight }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <span className="font-medium" style={{ color: colors.text }}>{title}</span>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tax Rate Settings</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader size="md" variant="bar" />
            </div>
          ) : error ? (
            <div
              className="h-32 flex items-center justify-center text-sm"
              style={{ color: colors.negative }}
            >
              Failed to load settings
            </div>
          ) : (
            <div className="space-y-4">
              {/* US Market */}
              <MarketSection icon="🇺🇸" title="US Stock">
                <RateInput
                  label="Dividend Withholding"
                  value={usDividendRate}
                  onChange={setUsDividendRate}
                  placeholder="30"
                  hint="30% default, 15% with tax treaty"
                />
                <RateInput
                  label="Capital Gains"
                  value={usCapitalGainsRate}
                  onChange={setUsCapitalGainsRate}
                  placeholder="0"
                  hint="Often 0% for non-US residents"
                />
              </MarketSection>

              {/* SG Market */}
              <MarketSection icon="🇸🇬" title="SGX Stock">
                <RateInput
                  label="Dividend Withholding"
                  value={sgDividendRate}
                  onChange={setSgDividendRate}
                  placeholder="0"
                  hint="Singapore has no dividend withholding tax"
                />
                <RateInput
                  label="Capital Gains"
                  value={sgCapitalGainsRate}
                  onChange={setSgCapitalGainsRate}
                  placeholder="0"
                  hint="Singapore has no capital gains tax"
                />
              </MarketSection>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || isLoading}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
