'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { assetApi } from '@/lib/fire/api';
import { mutateAssets } from '@/hooks/fire/use-fire-data';
import type { AssetWithBalance, AssetType, RealEstateMetadata } from '@/types/fire';
import { ASSET_TYPE_LABELS } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  DateInput,
  Select,
  CurrencyCombobox,
  Button,
} from '@/components/fire/ui';
import { EditDepositDialog } from './edit-deposit-dialog';
import { EditInvestmentDialog } from './edit-investment-dialog';
import { EditMetalDialog } from './edit-metal-dialog';

interface EditAssetDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

// Investment asset types
const INVESTMENT_TYPES: AssetType[] = ['stock', 'etf', 'bond', 'crypto'];

// Fully editable asset types (can change type, name, currency)
const FULLY_EDITABLE_TYPES: AssetType[] = ['cash', 'real_estate', 'other'];

const FULLY_EDITABLE_TYPE_OPTIONS = FULLY_EDITABLE_TYPES.map((t) => ({
  value: t,
  label: ASSET_TYPE_LABELS[t],
}));

export function EditAssetDialog({
  asset,
  open,
  onOpenChange,
  onUpdated,
}: EditAssetDialogProps) {
  // Route to specialized dialogs
  if (asset?.type === 'deposit') {
    return (
      <EditDepositDialog
        asset={asset}
        open={open}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
      />
    );
  }

  if (asset?.type === 'metals') {
    return (
      <EditMetalDialog
        asset={asset}
        open={open}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
      />
    );
  }

  if (asset && INVESTMENT_TYPES.includes(asset.type)) {
    return (
      <EditInvestmentDialog
        asset={asset}
        open={open}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
      />
    );
  }

  // Generic asset editor for cash, real_estate, other
  return (
    <EditGenericAssetDialog
      asset={asset}
      open={open}
      onOpenChange={onOpenChange}
      onUpdated={onUpdated}
    />
  );
}

// Generic asset editor (cash, real_estate, other)
function EditGenericAssetDialog({
  asset,
  open,
  onOpenChange,
  onUpdated,
}: EditAssetDialogProps) {
  const prevOpenRef = useRef(open);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('cash');
  const [currency, setCurrency] = useState('USD');

  // Real estate specific fields
  const [propertyCurrentValue, setPropertyCurrentValue] = useState('');
  const [propertyCountry, setPropertyCountry] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyPurchasePrice, setPropertyPurchasePrice] = useState('');
  const [propertyBoughtDate, setPropertyBoughtDate] = useState('');
  const [propertySqm, setPropertySqm] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isRealEstate = assetType === 'real_estate';

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && asset) {
      setName(asset.name);
      setAssetType(asset.type);
      setCurrency(asset.currency);

      if (asset.type === 'real_estate') {
        const metadata = asset.metadata as RealEstateMetadata | null;
        setPropertyCurrentValue(asset.balance.toString());
        setPropertyCountry(metadata?.country || '');
        setPropertyCity(metadata?.city || '');
        setPropertyPurchasePrice(metadata?.purchase_price?.toString() || '');
        setPropertyBoughtDate(metadata?.purchase_date || '');
        setPropertySqm(metadata?.size_sqm?.toString() || '');
      } else {
        setPropertyCurrentValue('');
        setPropertyCountry('');
        setPropertyCity('');
        setPropertyPurchasePrice('');
        setPropertyBoughtDate('');
        setPropertySqm('');
      }

      setErrors({});
    } else if (!open) {
      setName('');
      setAssetType('cash');
      setCurrency('USD');
      setPropertyCurrentValue('');
      setPropertyCountry('');
      setPropertyCity('');
      setPropertyPurchasePrice('');
      setPropertyBoughtDate('');
      setPropertySqm('');
      setErrors({});
      setLoading(false);
    }
  }, [open, asset]);

  // Handle save
  const handleSave = async () => {
    if (!asset) return;

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (assetType === 'real_estate') {
      const currentValue = parseFloat(propertyCurrentValue);
      if (isNaN(currentValue) || currentValue < 0) {
        newErrors.propertyCurrentValue = 'Please enter a valid current value';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let metadata: Record<string, unknown> | undefined;
      let balance: number | undefined;

      if (assetType === 'real_estate') {
        const realEstateMetadata: Record<string, unknown> = {};
        if (propertyCountry.trim()) realEstateMetadata.country = propertyCountry.trim();
        if (propertyCity.trim()) realEstateMetadata.city = propertyCity.trim();
        const purchasePrice = parseFloat(propertyPurchasePrice);
        if (purchasePrice > 0) realEstateMetadata.purchase_price = purchasePrice;
        if (propertyBoughtDate) realEstateMetadata.purchase_date = propertyBoughtDate;
        if (propertySqm) realEstateMetadata.size_sqm = parseFloat(propertySqm);
        const currentValue = parseFloat(propertyCurrentValue);
        if (currentValue > 0) realEstateMetadata.current_value = currentValue;
        metadata = Object.keys(realEstateMetadata).length > 0 ? realEstateMetadata : undefined;
        balance = currentValue;
      }

      const response = await assetApi.update(asset.id, {
        name: name.trim(),
        type: assetType,
        currency,
        metadata,
        ...(balance !== undefined && { balance }),
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update asset');
        setLoading(false);
        return;
      }

      await mutateAssets();
      toast.success(`"${name}" updated`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update asset');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <Input
              label="Name"
              placeholder="e.g., Chase Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />

            {/* Type & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                options={FULLY_EDITABLE_TYPE_OPTIONS}
              />
              <CurrencyCombobox
                label="Currency"
                value={currency}
                onChange={setCurrency}
              />
            </div>

            {/* Real estate fields */}
            {isRealEstate && (
              <>
                <Input
                  label="Current Value"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={propertyCurrentValue}
                  onChange={(e) => setPropertyCurrentValue(e.target.value)}
                  error={errors.propertyCurrentValue}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Country"
                    placeholder="e.g., USA"
                    value={propertyCountry}
                    onChange={(e) => setPropertyCountry(e.target.value)}
                  />
                  <Input
                    label="City"
                    placeholder="e.g., San Francisco"
                    value={propertyCity}
                    onChange={(e) => setPropertyCity(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Purchase Price"
                    type="number"
                    placeholder="0.00"
                    value={propertyPurchasePrice}
                    onChange={(e) => setPropertyPurchasePrice(e.target.value)}
                    hint="For tracking gains"
                  />
                  <DateInput
                    label="Purchase Date"
                    value={propertyBoughtDate}
                    onChange={setPropertyBoughtDate}
                  />
                </div>

                <Input
                  label="Size (sqm)"
                  type="number"
                  placeholder="Optional"
                  value={propertySqm}
                  onChange={(e) => setPropertySqm(e.target.value)}
                  hint="Optional"
                />
              </>
            )}

            {/* Info about balance - only show for non-real-estate */}
            {!isRealEstate && (
              <div
                className="p-3 rounded-md text-xs"
                style={{
                  backgroundColor: colors.surfaceLight,
                  border: `1px solid ${colors.surfaceLight}`,
                  color: colors.muted,
                }}
              >
                To adjust the balance, use the &quot;Adjust Balance&quot; option from the asset menu.
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
