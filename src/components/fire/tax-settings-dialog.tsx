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
  const [dividendRateEdited, setDividendRateEdited] = useState<string | null>(null);
  const [capitalGainsRateEdited, setCapitalGainsRateEdited] = useState<string | null>(null);

  // Derive display values - use edited value if user has edited, otherwise from data
  const dividendRate = dividendRateEdited ?? (data ? (data.us_dividend_withholding_rate * 100).toString() : '');
  const capitalGainsRate = capitalGainsRateEdited ?? (data ? (data.us_capital_gains_rate * 100).toString() : '');

  // Track data changes - reset edited state if data ID changes (new settings loaded)
  if (data?.id && data.id !== prevDataIdRef.current) {
    prevDataIdRef.current = data.id;
    // Reset edited values when loading fresh data
    if (!hasEditedRef.current) {
      setDividendRateEdited(null);
      setCapitalGainsRateEdited(null);
    }
  }

  // Handlers that track edits
  const setDividendRate = (value: string) => {
    setDividendRateEdited(value);
    hasEditedRef.current = true;
  };

  const setCapitalGainsRate = (value: string) => {
    setCapitalGainsRateEdited(value);
    hasEditedRef.current = true;
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on close
      setDividendRateEdited(null);
      setCapitalGainsRateEdited(null);
      hasEditedRef.current = false;
      prevDataIdRef.current = null;
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dividendRateDecimal = parseFloat(dividendRate) / 100;
      const capitalGainsRateDecimal = parseFloat(capitalGainsRate) / 100;

      // Validate
      if (isNaN(dividendRateDecimal) || dividendRateDecimal < 0 || dividendRateDecimal > 1) {
        toast.error('Dividend withholding rate must be between 0 and 100%');
        return;
      }
      if (isNaN(capitalGainsRateDecimal) || capitalGainsRateDecimal < 0 || capitalGainsRateDecimal > 1) {
        toast.error('Capital gains rate must be between 0 and 100%');
        return;
      }

      const res = await userTaxSettingsApi.update({
        us_dividend_withholding_rate: dividendRateDecimal,
        us_capital_gains_rate: capitalGainsRateDecimal,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>US Stock Tax Rate Settings</DialogTitle>
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
            <div className="space-y-5">
              {/* Dividend Withholding Rate */}
              <div className="space-y-2">
                <Label>Dividend Withholding Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={dividendRate}
                    onChange={(e) => setDividendRate(e.target.value)}
                    placeholder="30"
                    className="w-24"
                  />
                  <span className="text-sm font-medium" style={{ color: colors.text }}>%</span>
                </div>
                <p className="text-xs" style={{ color: colors.muted }}>
                  Default 30%, or 15% with tax treaty (UK, Japan, Germany).
                </p>
              </div>

              {/* Capital Gains Rate */}
              <div className="space-y-2">
                <Label>Capital Gains Tax Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={capitalGainsRate}
                    onChange={(e) => setCapitalGainsRate(e.target.value)}
                    placeholder="0"
                    className="w-24"
                  />
                  <span className="text-sm font-medium" style={{ color: colors.text }}>%</span>
                </div>
                <p className="text-xs" style={{ color: colors.muted }}>
                  Often 0% for non-US residents under tax treaties.
                </p>
              </div>
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
