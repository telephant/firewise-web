'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  colors,
  Button,
  Label,
  Loader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  CurrencyCombobox,
} from '@/components/fire/ui';
import { useUserPreferences } from '@/hooks/fire/use-fire-data';

interface CurrencyPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurrencyPreferencesDialog({ open, onOpenChange }: CurrencyPreferencesDialogProps) {
  const { preferences, isLoading, updatePreferences } = useUserPreferences();
  const [saving, setSaving] = useState(false);

  // Local form state
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [convertAll, setConvertAll] = useState(false);

  // Initialize form with preferences data
  useEffect(() => {
    if (preferences) {
      setPreferredCurrency(preferences.preferred_currency);
      setConvertAll(preferences.convert_all_to_preferred);
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updatePreferences({
        preferred_currency: preferredCurrency,
        convert_all_to_preferred: convertAll,
      });

      if (success) {
        toast.success('Currency preferences saved');
        onOpenChange(false);
      } else {
        toast.error('Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Currency Preferences</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader size="md" variant="bar" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Preferred Currency */}
              <div className="space-y-2">
                <p className="text-xs" style={{ color: colors.muted }}>
                  All stats and summaries will be shown in this currency.
                </p>
                <CurrencyCombobox
                  label="Preferred Currency"
                  value={preferredCurrency}
                  onChange={setPreferredCurrency}
                />
              </div>

              {/* Convert All Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Convert All to Preferred Currency</Label>
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Show all flows and assets in your preferred currency.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConvertAll(!convertAll)}
                    className="relative w-12 h-6 transition-colors cursor-pointer hover:opacity-90"
                    style={{
                      backgroundColor: convertAll ? colors.positive : colors.surfaceLight,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 transition-transform"
                      style={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        left: convertAll ? 'calc(100% - 18px)' : '2px',
                      }}
                    />
                  </button>
                </div>
                {convertAll && (
                  <p className="text-xs p-2 rounded" style={{ backgroundColor: colors.surfaceLight, color: colors.info }}>
                    When enabled, amounts will show both original and converted values.
                  </p>
                )}
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
