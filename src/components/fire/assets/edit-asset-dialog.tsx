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
  Select,
  CurrencyCombobox,
  Button,
} from '@/components/fire/ui';

interface EditAssetDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

// Fully editable asset types (can change type, name, currency)
const FULLY_EDITABLE_TYPES: AssetType[] = ['cash', 'real_estate', 'other'];

const FULLY_EDITABLE_TYPE_OPTIONS = FULLY_EDITABLE_TYPES.map((t) => ({
  value: t,
  label: ASSET_TYPE_LABELS[t],
}));

// Investment asset types - only shares can be modified
const INVESTMENT_TYPES: AssetType[] = ['stock', 'etf', 'bond', 'crypto'];

// Deposit metadata interface
interface DepositMetadata {
  interest_rate?: number; // Annual interest rate as decimal (e.g., 0.045 for 4.5%)
}

export function EditAssetDialog({
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

  // Investment type - shares only
  const [shares, setShares] = useState('');

  // Deposit specific fields
  const [depositBalance, setDepositBalance] = useState('');
  const [depositInterestRate, setDepositInterestRate] = useState('');

  // Real estate specific fields
  const [propertyCountry, setPropertyCountry] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyPurchasePrice, setPropertyPurchasePrice] = useState('');
  const [propertyBoughtDate, setPropertyBoughtDate] = useState('');
  const [propertySqm, setPropertySqm] = useState('');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form from asset
  const initializeFromAsset = (assetToEdit: AssetWithBalance) => {
    setName(assetToEdit.name);
    setAssetType(assetToEdit.type);
    setCurrency(assetToEdit.currency);
    setShares(assetToEdit.balance.toString());

    // Deposit metadata
    if (assetToEdit.type === 'deposit') {
      const metadata = assetToEdit.metadata as DepositMetadata | null;
      setDepositBalance(assetToEdit.balance.toString());
      setDepositInterestRate(metadata?.interest_rate ? (metadata.interest_rate * 100).toString() : '');
    } else {
      setDepositBalance('');
      setDepositInterestRate('');
    }

    // Real estate metadata
    if (assetToEdit.type === 'real_estate') {
      const metadata = assetToEdit.metadata as RealEstateMetadata | null;
      setPropertyCountry(metadata?.country || '');
      setPropertyCity(metadata?.city || '');
      setPropertyPurchasePrice(metadata?.purchase_price?.toString() || '');
      setPropertyBoughtDate(metadata?.purchase_date || '');
      setPropertySqm(metadata?.size_sqm?.toString() || '');
    } else {
      setPropertyCountry('');
      setPropertyCity('');
      setPropertyPurchasePrice('');
      setPropertyBoughtDate('');
      setPropertySqm('');
    }

    setErrors({});
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setAssetType('cash');
    setCurrency('USD');
    setShares('');
    setDepositBalance('');
    setDepositInterestRate('');
    setPropertyCountry('');
    setPropertyCity('');
    setPropertyPurchasePrice('');
    setPropertyBoughtDate('');
    setPropertySqm('');
    setErrors({});
    setLoading(false);
  };

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && asset) {
      initializeFromAsset(asset);
    } else if (!open) {
      resetForm();
    }
  }, [open, asset]);

  // Check asset type category
  const isInvestmentType = asset ? INVESTMENT_TYPES.includes(asset.type) : false;
  const isDeposit = asset?.type === 'deposit';
  const isRealEstate = assetType === 'real_estate';

  // Handle save for non-investment assets
  const handleSave = async () => {
    if (!asset) return;

    // Validate
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Build metadata based on asset type
      let metadata: Record<string, unknown> | undefined;

      if (assetType === 'real_estate') {
        const realEstateMetadata: Record<string, unknown> = {};
        if (propertyCountry.trim()) realEstateMetadata.country = propertyCountry.trim();
        if (propertyCity.trim()) realEstateMetadata.city = propertyCity.trim();
        const purchasePrice = parseFloat(propertyPurchasePrice);
        if (purchasePrice > 0) realEstateMetadata.purchase_price = purchasePrice;
        if (propertyBoughtDate) realEstateMetadata.purchase_date = propertyBoughtDate;
        if (propertySqm) realEstateMetadata.size_sqm = parseFloat(propertySqm);
        metadata = Object.keys(realEstateMetadata).length > 0 ? realEstateMetadata : undefined;
      }

      const response = await assetApi.update(asset.id, {
        name: name.trim(),
        type: assetType,
        currency,
        metadata,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update asset');
        setLoading(false);
        return;
      }

      // Refresh assets
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

  // Handle save for deposit assets
  const handleSaveDeposit = async () => {
    if (!asset) return;

    // Validate
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    const newBalance = parseFloat(depositBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      newErrors.depositBalance = 'Please enter a valid balance';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Build metadata with interest rate
      const interestRate = parseFloat(depositInterestRate);
      const metadata: DepositMetadata = {};
      if (!isNaN(interestRate) && interestRate > 0) {
        metadata.interest_rate = interestRate / 100; // Convert percentage to decimal
      }

      const response = await assetApi.update(asset.id, {
        name: name.trim(),
        currency,
        balance: newBalance,
        metadata: Object.keys(metadata).length > 0 ? metadata as Record<string, unknown> : undefined,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update deposit');
        setLoading(false);
        return;
      }

      // Refresh assets
      await mutateAssets();

      toast.success(`"${name}" updated`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update deposit');
    } finally {
      setLoading(false);
    }
  };

  // Handle save for investment assets (shares only)
  const handleSaveShares = async () => {
    if (!asset) return;

    const newShares = parseFloat(shares);
    if (isNaN(newShares) || newShares < 0) {
      setErrors({ shares: 'Please enter a valid number of shares' });
      return;
    }

    setLoading(true);
    try {
      const response = await assetApi.update(asset.id, {
        balance: newShares,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update shares');
        setLoading(false);
        return;
      }

      // Refresh assets
      await mutateAssets();

      toast.success(`Shares updated to ${newShares}`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update shares');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  // Deposit assets - name, balance, currency, interest rate
  if (isDeposit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Deposit</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              {/* Name */}
              <Input
                label="Name"
                placeholder="e.g., Chase Savings"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />

              {/* Balance & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Balance"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={depositBalance}
                  onChange={(e) => setDepositBalance(e.target.value)}
                  error={errors.depositBalance}
                />
                <CurrencyCombobox
                  label="Currency"
                  value={currency}
                  onChange={setCurrency}
                />
              </div>

              {/* Interest Rate */}
              <Input
                label="Interest Rate (%)"
                type="number"
                step="any"
                placeholder="4.5"
                value={depositInterestRate}
                onChange={(e) => setDepositInterestRate(e.target.value)}
                hint="Annual percentage yield (APY)"
              />
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
                onClick={handleSaveDeposit}
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

  // Investment assets - only show shares editor
  if (isInvestmentType) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Shares</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-4">
              {/* Asset info (read-only) */}
              <div
                className="p-3 rounded-md"
                style={{
                  backgroundColor: colors.surfaceLight,
                  border: `1px solid ${colors.surfaceLight}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    {asset.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md"
                    style={{
                      backgroundColor: colors.surfaceLight,
                      color: colors.text,
                    }}
                  >
                    {asset.ticker}
                  </span>
                </div>
                <div className="text-xs" style={{ color: colors.muted }}>
                  {ASSET_TYPE_LABELS[asset.type]} {asset.market && `· ${asset.market}`}
                </div>
              </div>

              {/* Shares input */}
              <Input
                label="Number of Shares"
                type="number"
                step="any"
                placeholder="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                error={errors.shares}
              />

              <div
                className="p-3 rounded-md text-xs"
                style={{
                  backgroundColor: colors.surfaceLight,
                  border: `1px solid ${colors.surfaceLight}`,
                  color: colors.muted,
                }}
              >
                Investment details (ticker, market) cannot be changed. To track a different investment, create a new asset.
              </div>
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
                onClick={handleSaveShares}
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

  // Non-investment assets - full editor
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
                  <Input
                    label="Purchase Date"
                    type="date"
                    value={propertyBoughtDate}
                    onChange={(e) => setPropertyBoughtDate(e.target.value)}
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

            {/* Info about balance */}
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
