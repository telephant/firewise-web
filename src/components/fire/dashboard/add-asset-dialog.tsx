'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useFlowData } from '@/contexts/fire/flow-data-context';
import { assetApi, debtApi } from '@/lib/fire/api';
import { mutateDebts } from '@/hooks/fire/use-fire-data';
import type { Asset, AssetType, RealEstateMetadata, Debt } from '@/types/fire';
import { ASSET_TYPE_LABELS } from '@/types/fire';
import {
  retro,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  CurrencyCombobox,
  Button,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Loader,
  IconPlus,
  IconEdit,
  PaymentSourceSelector,
  type PaymentSourceType,
} from '@/components/fire/ui';

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Asset to edit (if provided, dialog is in edit mode) */
  asset?: Asset | null;
}

type DialogStep = 'type' | 'details' | 'mortgage';

// Asset types available for manual creation (excluding share-based types that need flows)
// Note: Debts are now in a separate table - use AddFlowDialog with 'add_loan' or 'add_mortgage' presets
const MANUAL_ASSET_TYPES: AssetType[] = ['cash', 'deposit', 'real_estate', 'other'];

const ASSET_TYPE_OPTIONS = MANUAL_ASSET_TYPES.map((t) => ({
  value: t,
  label: ASSET_TYPE_LABELS[t],
}));

// Calculate monthly payment using standard amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  const monthlyRate = annualRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

export function AddAssetDialog({ open, onOpenChange, asset }: AddAssetDialogProps) {
  const { createAsset, createFlow, refetchAssets } = useFlowData();

  // Edit mode detection
  const isEditMode = !!asset;
  const prevOpenRef = useRef(open);

  // Dialog state
  const [step, setStep] = useState<DialogStep>('type');
  const [loading, setLoading] = useState(false);

  // Asset form state
  const [assetType, setAssetType] = useState<AssetType>('cash');
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Real estate specific fields (stored in metadata)
  const [propertyCountry, setPropertyCountry] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyPurchasePrice, setPropertyPurchasePrice] = useState('');
  const [propertyBoughtDate, setPropertyBoughtDate] = useState('');
  const [propertySqm, setPropertySqm] = useState('');

  // Mortgage form state (for real estate)
  const [hasMortgage, setHasMortgage] = useState<boolean | null>(null);
  const [mortgageName, setMortgageName] = useState('');
  const [mortgagePrincipal, setMortgagePrincipal] = useState('');
  const [mortgageCurrentBalance, setMortgageCurrentBalance] = useState('');
  const [mortgageCurrency, setMortgageCurrency] = useState('USD');
  const [mortgageRate, setMortgageRate] = useState('');
  const [mortgageTerm, setMortgageTerm] = useState('');
  const [mortgageStartDate, setMortgageStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real estate edit mode - tabs and mortgages
  const [activeTab, setActiveTab] = useState<'property' | 'mortgages'>('property');
  const [propertyMortgages, setPropertyMortgages] = useState<Debt[]>([]);
  const [mortgagesLoading, setMortgagesLoading] = useState(false);
  const [mortgageFormMode, setMortgageFormMode] = useState<'list' | 'add' | 'edit' | 'pay'>('list');
  const [editingMortgage, setEditingMortgage] = useState<Debt | null>(null);
  const [payingMortgage, setPayingMortgage] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSourceType, setPaymentSourceType] = useState<'cash' | 'external' | null>(null);

  // Fetch mortgages linked to property
  const fetchPropertyMortgages = useCallback(async (propertyId: string) => {
    setMortgagesLoading(true);
    try {
      const response = await debtApi.getAll({ property_asset_id: propertyId });
      if (response.success && response.data) {
        setPropertyMortgages(response.data.debts);
      }
    } catch {
      console.error('Failed to fetch property mortgages');
    } finally {
      setMortgagesLoading(false);
    }
  }, []);

  // Initialize form from asset (for edit mode)
  const initializeFromAsset = (assetToEdit: Asset) => {
    setAssetType(assetToEdit.type);
    setAssetName(assetToEdit.name);
    setAssetValue(Math.abs(assetToEdit.balance).toString());
    setCurrency(assetToEdit.currency);

    // Pre-fill real estate metadata
    if (assetToEdit.type === 'real_estate') {
      const metadata = assetToEdit.metadata as RealEstateMetadata | null;
      setPropertyCountry(metadata?.country || '');
      setPropertyCity(metadata?.city || '');
      setPropertyPurchasePrice(metadata?.purchase_price?.toString() || '');
      setPropertyBoughtDate(metadata?.purchase_date || '');
      setPropertySqm(metadata?.size_sqm?.toString() || '');
      // Fetch mortgages for this property
      fetchPropertyMortgages(assetToEdit.id);
    }

    // Skip type selection in edit mode
    setStep('details');
  };

  // Reset form when dialog closes
  const resetForm = () => {
    setStep('type');
    setAssetType('cash');
    setAssetName('');
    setAssetValue('');
    setCurrency('USD');
    // Real estate fields
    setPropertyCountry('');
    setPropertyCity('');
    setPropertyPurchasePrice('');
    setPropertyBoughtDate('');
    setPropertySqm('');
    // Mortgage fields
    setHasMortgage(null);
    setMortgageName('');
    setMortgagePrincipal('');
    setMortgageCurrentBalance('');
    setMortgageCurrency('USD');
    setMortgageRate('');
    setMortgageTerm('');
    setMortgageStartDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    setLoading(false);
    // Reset mortgage management state
    setActiveTab('property');
    setPropertyMortgages([]);
    setMortgageFormMode('list');
    setEditingMortgage(null);
  };

  // Reset mortgage form fields
  const resetMortgageForm = () => {
    setMortgageName('');
    setMortgagePrincipal('');
    setMortgageCurrentBalance('');
    setMortgageCurrency('USD');
    setMortgageRate('');
    setMortgageTerm('');
    setMortgageStartDate(new Date().toISOString().split('T')[0]);
    setEditingMortgage(null);
    setPayingMortgage(null);
    setPaymentAmount('');
    setPaymentSourceType(null);
  };

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open) {
      // Dialog just opened - reset first, then initialize if edit mode
      resetForm();
      if (asset) {
        initializeFromAsset(asset);
      }
    }
  }, [open, asset]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  // Calculate mortgage monthly payment
  const mortgageMonthlyPayment = useMemo(() => {
    const principal = parseFloat(mortgagePrincipal) || 0;
    const rate = parseFloat(mortgageRate) / 100 || 0;
    const months = (parseInt(mortgageTerm) || 0) * 12; // Term is in years
    return calculateMonthlyPayment(principal, rate, months);
  }, [mortgagePrincipal, mortgageRate, mortgageTerm]);

  // Handle type selection
  const handleTypeSelect = (type: AssetType) => {
    setAssetType(type);
    setErrors({});
    setStep('details');
  };

  // Handle details submission
  const handleDetailsSubmit = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!assetName.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!assetValue || parseFloat(assetValue) < 0) {
      newErrors.value = 'Value is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Edit mode: update the asset
    if (isEditMode && asset) {
      await updateExistingAsset();
      return;
    }

    // For real estate, ask about mortgage
    if (assetType === 'real_estate') {
      setStep('mortgage');
      return;
    }

    // Create the asset directly
    await createSimpleAsset();
  };

  // Update an existing asset
  const updateExistingAsset = async () => {
    if (!asset) return;

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
        name: assetName.trim(),
        currency,
        metadata,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update asset');
        setLoading(false);
        return;
      }

      // Update balance if changed (create adjustment flow)
      const newValue = parseFloat(assetValue) || 0;
      const currentValue = asset.balance;
      const difference = newValue - currentValue;

      if (difference !== 0) {
        // Create adjustment flow
        // Positive difference = income, Negative difference = expense
        const flowData = {
          type: difference > 0 ? 'income' : 'expense',
          amount: Math.abs(difference),
          currency,
          from_asset_id: difference < 0 ? asset.id : undefined,
          to_asset_id: difference > 0 ? asset.id : undefined,
          category: 'other',
          date: new Date().toISOString().split('T')[0],
          description: `Balance adjustment for ${asset.name}`,
        };
        await createFlow(flowData as Parameters<typeof createFlow>[0]);

        // Update asset balance
        await assetApi.update(asset.id, { balance: newValue });
      }

      // Refresh assets to update the list
      await refetchAssets();

      toast.success(`${ASSET_TYPE_LABELS[assetType]} "${assetName}" updated`);
      handleOpenChange(false);
    } catch {
      toast.error('Failed to update asset');
    } finally {
      setLoading(false);
    }
  };

  // Create a simple asset (cash, deposit, other)
  const createSimpleAsset = async () => {
    setLoading(true);
    try {
      const asset = await createAsset({
        name: assetName.trim(),
        type: assetType,
        currency,
      });

      if (!asset) {
        toast.error('Failed to create asset');
        setLoading(false);
        return;
      }

      // Create an adjustment flow to set initial balance
      const value = parseFloat(assetValue);
      if (value !== 0) {
        await createFlow({
          type: 'income',
          amount: value,
          currency,
          to_asset_id: asset.id,
          category: 'adjustment',
          date: new Date().toISOString().split('T')[0],
          description: `Initial balance for ${asset.name}`,
        });
      }

      toast.success(`${ASSET_TYPE_LABELS[assetType]} "${asset.name}" added`);
      handleOpenChange(false);
    } catch {
      toast.error('Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  // Create real estate with optional mortgage
  const handleMortgageSubmit = async () => {
    setLoading(true);
    try {
      // Build real estate metadata
      const realEstateMetadata: Record<string, unknown> = {};
      if (propertyCountry.trim()) realEstateMetadata.country = propertyCountry.trim();
      if (propertyCity.trim()) realEstateMetadata.city = propertyCity.trim();
      // Purchase price stored in metadata for tracking gains
      const purchasePrice = parseFloat(propertyPurchasePrice);
      if (purchasePrice > 0) realEstateMetadata.purchase_price = purchasePrice;
      if (propertyBoughtDate) realEstateMetadata.purchase_date = propertyBoughtDate;
      if (propertySqm) realEstateMetadata.size_sqm = parseFloat(propertySqm);

      // Create the real estate asset
      const realEstateAsset = await createAsset({
        name: assetName.trim(),
        type: 'real_estate',
        currency,
        metadata: Object.keys(realEstateMetadata).length > 0 ? realEstateMetadata : undefined,
      });

      if (!realEstateAsset) {
        toast.error('Failed to create property');
        setLoading(false);
        return;
      }

      // Set initial property value (Current Value goes to asset balance)
      const currentValue = parseFloat(assetValue);
      if (currentValue > 0) {
        await createFlow({
          type: 'income',
          amount: currentValue,
          currency,
          to_asset_id: realEstateAsset.id,
          category: 'adjustment',
          date: propertyBoughtDate || new Date().toISOString().split('T')[0],
          description: `Initial value for ${realEstateAsset.name}`,
        });
      }

      // Create mortgage if user said yes (using new debts table)
      if (hasMortgage) {
        const principal = parseFloat(mortgagePrincipal) || 0;
        const currentBalance = parseFloat(mortgageCurrentBalance) || principal;
        const rate = parseFloat(mortgageRate) / 100;
        const years = parseInt(mortgageTerm);
        const months = years * 12;

        const mortgageResponse = await debtApi.create({
          name: mortgageName.trim() || `${assetName} Mortgage`,
          debt_type: 'mortgage',
          currency: mortgageCurrency,
          principal: currentBalance, // Use current balance as principal for tracking
          interest_rate: rate > 0 ? rate : null,
          term_months: months > 0 ? months : null,
          start_date: mortgageStartDate || null,
          monthly_payment: principal > 0 && rate > 0 && months > 0
            ? Math.round(calculateMonthlyPayment(principal, rate, months) * 100) / 100
            : null,
          property_asset_id: realEstateAsset.id,
        });

        if (mortgageResponse.success && mortgageResponse.data) {
          await mutateDebts();
          toast.success(`Property "${realEstateAsset.name}" and mortgage added`);
        } else {
          toast.success(`Property "${realEstateAsset.name}" added (mortgage failed)`);
        }
      } else {
        toast.success(`Property "${realEstateAsset.name}" added`);
      }

      handleOpenChange(false);
    } catch {
      toast.error('Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  // Format currency for display
  const formatMoney = (amount: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Start adding a new mortgage to existing property
  const handleStartAddMortgage = () => {
    resetMortgageForm();
    // Default mortgage currency to property's currency
    setMortgageCurrency(currency);
    setMortgageFormMode('add');
  };

  // Start editing a mortgage
  const handleStartEditMortgage = (mortgage: Debt) => {
    setEditingMortgage(mortgage);
    setMortgageName(mortgage.name);
    setMortgagePrincipal(mortgage.principal.toString());
    setMortgageCurrentBalance(mortgage.current_balance.toString());
    setMortgageCurrency(mortgage.currency);
    setMortgageRate(mortgage.interest_rate ? (mortgage.interest_rate * 100).toString() : '');
    setMortgageTerm(mortgage.term_months ? (mortgage.term_months / 12).toString() : '');
    setMortgageStartDate(mortgage.start_date || new Date().toISOString().split('T')[0]);
    setMortgageFormMode('edit');
  };

  // Save new mortgage to existing property
  const handleSaveNewMortgage = async () => {
    if (!asset) return;

    setLoading(true);
    try {
      const principal = parseFloat(mortgagePrincipal) || 0;
      const currentBalance = parseFloat(mortgageCurrentBalance) || principal;
      const rate = parseFloat(mortgageRate) / 100;
      const years = parseInt(mortgageTerm);
      const months = years * 12;

      const response = await debtApi.create({
        name: mortgageName.trim() || `${asset.name} Mortgage`,
        debt_type: 'mortgage',
        currency: mortgageCurrency,
        principal: currentBalance,
        interest_rate: rate > 0 ? rate : null,
        term_months: months > 0 ? months : null,
        start_date: mortgageStartDate || null,
        monthly_payment: principal > 0 && rate > 0 && months > 0
          ? Math.round(calculateMonthlyPayment(principal, rate, months) * 100) / 100
          : null,
        property_asset_id: asset.id,
      });

      if (response.success) {
        await mutateDebts();
        await fetchPropertyMortgages(asset.id);
        toast.success('Mortgage added');
        setMortgageFormMode('list');
        resetMortgageForm();
      } else {
        toast.error(response.error || 'Failed to add mortgage');
      }
    } catch {
      toast.error('Failed to add mortgage');
    } finally {
      setLoading(false);
    }
  };

  // Update existing mortgage
  const handleUpdateMortgage = async () => {
    if (!editingMortgage || !asset) return;

    setLoading(true);
    try {
      const principal = parseFloat(mortgagePrincipal) || 0;
      const currentBalance = parseFloat(mortgageCurrentBalance) || principal;
      const rate = parseFloat(mortgageRate) / 100;
      const years = parseInt(mortgageTerm);
      const months = years * 12;

      const response = await debtApi.update(editingMortgage.id, {
        name: mortgageName.trim(),
        currency: mortgageCurrency,
        principal,
        current_balance: currentBalance,
        interest_rate: rate > 0 ? rate : null,
        term_months: months > 0 ? months : null,
        start_date: mortgageStartDate || null,
        monthly_payment: principal > 0 && rate > 0 && months > 0
          ? Math.round(calculateMonthlyPayment(principal, rate, months) * 100) / 100
          : null,
      });

      if (response.success) {
        await mutateDebts();
        await fetchPropertyMortgages(asset.id);
        toast.success('Mortgage updated');
        setMortgageFormMode('list');
        resetMortgageForm();
      } else {
        toast.error(response.error || 'Failed to update mortgage');
      }
    } catch {
      toast.error('Failed to update mortgage');
    } finally {
      setLoading(false);
    }
  };

  // Mark mortgage as paid off (just sets balance to 0)
  const handlePayOffMortgage = async (mortgage: Debt) => {
    if (!asset) return;

    setLoading(true);
    try {
      const response = await debtApi.update(mortgage.id, {
        current_balance: 0,
      });

      if (response.success) {
        await mutateDebts();
        await fetchPropertyMortgages(asset.id);
        toast.success('Mortgage marked as paid off');
      } else {
        toast.error(response.error || 'Failed to update mortgage');
      }
    } catch {
      toast.error('Failed to update mortgage');
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining term for display
  const calculateRemainingTerm = (mortgage: Debt): string => {
    if (!mortgage.term_months || !mortgage.start_date) return 'N/A';
    const startDate = new Date(mortgage.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + mortgage.term_months);
    const now = new Date();
    const remainingMonths = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const years = Math.floor(remainingMonths / 12);
    const months = remainingMonths % 12;
    if (years > 0 && months > 0) return `${years}y ${months}m`;
    if (years > 0) return `${years}y`;
    if (months > 0) return `${months}m`;
    return 'Paid off';
  };

  // Start making a payment on a mortgage
  const handleStartPayMortgage = (mortgage: Debt) => {
    setPayingMortgage(mortgage);
    setPaymentAmount(mortgage.monthly_payment?.toString() || '');
    setMortgageFormMode('pay');
  };

  // Submit mortgage payment
  const handleSubmitPayment = async () => {
    if (!payingMortgage || !asset) return;

    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setLoading(true);
    try {
      // Create pay_debt flow
      const flowData = {
        type: 'expense' as const,
        amount,
        currency: payingMortgage.currency,
        category: 'pay_debt',
        debt_id: payingMortgage.id,
        date: new Date().toISOString().split('T')[0],
        description: paymentSourceType === 'external'
          ? `Mortgage payment for ${payingMortgage.name} (external)`
          : `Mortgage payment for ${payingMortgage.name}`,
      };
      await createFlow(flowData as Parameters<typeof createFlow>[0]);

      // Update mortgage balance
      const newBalance = Math.max(0, payingMortgage.current_balance - amount);
      await debtApi.update(payingMortgage.id, { current_balance: newBalance });

      await mutateDebts();
      await fetchPropertyMortgages(asset.id);

      if (newBalance <= 0) {
        toast.success('Payment recorded - Mortgage paid off!');
      } else {
        toast.success('Payment recorded');
      }

      setMortgageFormMode('list');
      setPayingMortgage(null);
      setPaymentAmount('');
      setPaymentSourceType(null);
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' && 'Add Asset'}
            {step === 'details' && (isEditMode ? `Edit ${ASSET_TYPE_LABELS[assetType]}` : `Add ${ASSET_TYPE_LABELS[assetType]}`)}
            {step === 'mortgage' && 'Mortgage Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Step 1: Select Asset Type */}
          {step === 'type' && (
            <div className="space-y-2">
              <Label variant="muted" className="block mb-2">Select asset type</Label>
              <div className="grid grid-cols-2 gap-2">
                {ASSET_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeSelect(option.value as AssetType)}
                    className="p-3 rounded-sm text-left transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
                    style={{
                      backgroundColor: retro.surface,
                      border: `2px solid ${retro.border}`,
                      boxShadow: `2px 2px 0 ${retro.bevelDark}`,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: retro.text }}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: retro.muted }}>
                For stocks/ETFs, use &quot;Record &gt; Invest&quot; to buy shares.
              </p>
            </div>
          )}

          {/* Step 2: Asset Details */}
          {step === 'details' && (
            <div className="space-y-4">
              {/* Show tabs for real estate edit mode */}
              {isEditMode && assetType === 'real_estate' ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'property' | 'mortgages')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="property">Property</TabsTrigger>
                    <TabsTrigger value="mortgages">Mortgages</TabsTrigger>
                  </TabsList>

                  {/* Property Tab */}
                  <TabsContent value="property">
                    <div className="space-y-4">
                      <Input
                        label="Name"
                        placeholder="e.g., Primary Home"
                        value={assetName}
                        onChange={(e) => setAssetName(e.target.value)}
                        error={errors.name}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Current Value"
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={assetValue}
                          onChange={(e) => setAssetValue(e.target.value)}
                          error={errors.value}
                        />
                        <CurrencyCombobox
                          label="Currency"
                          value={currency}
                          onChange={setCurrency}
                        />
                      </div>

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

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="primary"
                          onClick={handleDetailsSubmit}
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Mortgages Tab */}
                  <TabsContent value="mortgages">
                    {mortgageFormMode === 'list' ? (
                      <div className="space-y-3">
                        {mortgagesLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader size="md" variant="bar" />
                          </div>
                        ) : propertyMortgages.length === 0 ? (
                          <div
                            className="p-4 rounded-sm text-center"
                            style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                          >
                            <p className="text-sm" style={{ color: retro.muted }}>
                              No mortgages on this property
                            </p>
                          </div>
                        ) : (
                          propertyMortgages.map((mortgage) => (
                            <div
                              key={mortgage.id}
                              className="p-3 rounded-sm"
                              style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium" style={{ color: retro.text }}>
                                    {mortgage.name}
                                  </p>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-sm"
                                    style={{
                                      backgroundColor: mortgage.current_balance <= 0 ? retro.positive : retro.accent,
                                      color: '#fff',
                                    }}
                                  >
                                    {mortgage.current_balance <= 0 ? 'Paid Off' : 'Active'}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEditMortgage(mortgage)}
                                    className="!px-1.5 !py-0.5"
                                  >
                                    <IconEdit size={12} />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span style={{ color: retro.muted }}>Balance: </span>
                                  <span style={{ color: retro.text }}>
                                    {formatMoney(mortgage.current_balance, mortgage.currency)}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: retro.muted }}>Rate: </span>
                                  <span style={{ color: retro.text }}>
                                    {mortgage.interest_rate ? `${(mortgage.interest_rate * 100).toFixed(2)}%` : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: retro.muted }}>Payment: </span>
                                  <span style={{ color: retro.text }}>
                                    {mortgage.monthly_payment ? formatMoney(mortgage.monthly_payment, mortgage.currency) : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: retro.muted }}>Remaining: </span>
                                  <span style={{ color: retro.text }}>
                                    {calculateRemainingTerm(mortgage)}
                                  </span>
                                </div>
                              </div>
                              {mortgage.current_balance > 0 && (
                                <div className="mt-2 pt-2 flex gap-2" style={{ borderTop: `1px solid ${retro.bevelMid}` }}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleStartPayMortgage(mortgage)}
                                    disabled={loading}
                                    className="flex-1"
                                  >
                                    Make Payment
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePayOffMortgage(mortgage)}
                                    disabled={loading}
                                    className="flex-1"
                                  >
                                    Pay Off
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        <Button
                          variant="primary"
                          onClick={handleStartAddMortgage}
                          className="w-full"
                        >
                          <IconPlus size={14} className="mr-1" /> Add Mortgage
                        </Button>
                      </div>
                    ) : mortgageFormMode === 'pay' && payingMortgage ? (
                      /* Make Payment Form */
                      <div className="space-y-4">
                        <div
                          className="p-3 rounded-sm"
                          style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                        >
                          <p className="text-sm font-medium" style={{ color: retro.text }}>
                            {payingMortgage.name}
                          </p>
                          <div className="flex justify-between text-xs mt-2">
                            <span style={{ color: retro.muted }}>Current Balance</span>
                            <span className="font-bold" style={{ color: retro.negative }}>
                              {formatMoney(payingMortgage.current_balance, payingMortgage.currency)}
                            </span>
                          </div>
                          {payingMortgage.monthly_payment && (
                            <div className="flex justify-between text-xs mt-1">
                              <span style={{ color: retro.muted }}>Monthly Payment</span>
                              <span style={{ color: retro.text }}>
                                {formatMoney(payingMortgage.monthly_payment, payingMortgage.currency)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Payment Source Selection */}
                        <PaymentSourceSelector
                          sourceType={paymentSourceType}
                          onSourceTypeChange={setPaymentSourceType}
                          cashAssets={[]}
                          cashLabel="From cash"
                          externalLabel="External"
                          externalDescription="Not tracked"
                          showExternalInput={false}
                        />

                        <Input
                          label="Payment Amount"
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />

                        {parseFloat(paymentAmount) >= payingMortgage.current_balance && parseFloat(paymentAmount) > 0 && (
                          <div
                            className="p-3 rounded-sm text-center"
                            style={{
                              backgroundColor: retro.positive + '20',
                              border: `2px solid ${retro.positive}`,
                            }}
                          >
                            <p className="text-sm font-bold" style={{ color: retro.positive }}>
                              This will pay off the mortgage!
                            </p>
                          </div>
                        )}

                        {parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) < payingMortgage.current_balance && (
                          <div className="text-xs text-center" style={{ color: retro.muted }}>
                            Balance after payment:{' '}
                            <span style={{ color: retro.negative, fontWeight: 500 }}>
                              {formatMoney(payingMortgage.current_balance - parseFloat(paymentAmount), payingMortgage.currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setMortgageFormMode('list');
                              setPayingMortgage(null);
                              setPaymentAmount('');
                              setPaymentSourceType(null);
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={handleSubmitPayment}
                            disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentSourceType}
                            className="flex-1"
                          >
                            {loading ? 'Recording...' : 'Record Payment'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Add/Edit Mortgage Form */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Mortgage Name"
                            placeholder={`${assetName} Mortgage`}
                            value={mortgageName}
                            onChange={(e) => setMortgageName(e.target.value)}
                          />
                          <CurrencyCombobox
                            label="Currency"
                            value={mortgageCurrency}
                            onChange={setMortgageCurrency}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Original Loan"
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={mortgagePrincipal}
                            onChange={(e) => setMortgagePrincipal(e.target.value)}
                            hint="Initial amount borrowed"
                          />
                          <Input
                            label="Current Balance"
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={mortgageCurrentBalance}
                            onChange={(e) => setMortgageCurrentBalance(e.target.value)}
                            hint="Amount still owed"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Interest Rate (%)"
                            type="number"
                            step="any"
                            placeholder="6.5"
                            value={mortgageRate}
                            onChange={(e) => setMortgageRate(e.target.value)}
                            hint="Annual rate"
                          />
                          <Input
                            label="Term (years)"
                            type="number"
                            placeholder="30"
                            value={mortgageTerm}
                            onChange={(e) => setMortgageTerm(e.target.value)}
                          />
                        </div>

                        <Input
                          label="Start Date"
                          type="date"
                          value={mortgageStartDate}
                          onChange={(e) => setMortgageStartDate(e.target.value)}
                        />

                        {mortgageMonthlyPayment > 0 && (
                          <div
                            className="p-3 rounded-sm text-center"
                            style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                          >
                            <Label variant="muted" className="block mb-1">Estimated Monthly Payment</Label>
                            <p className="text-lg font-bold" style={{ color: retro.negative }}>
                              {formatMoney(mortgageMonthlyPayment, mortgageCurrency)}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setMortgageFormMode('list');
                              resetMortgageForm();
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={mortgageFormMode === 'add' ? handleSaveNewMortgage : handleUpdateMortgage}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? 'Saving...' : mortgageFormMode === 'add' ? 'Add Mortgage' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                /* Non-tabbed form for add mode or non-real-estate */
                <>
                  <Input
                    label="Name"
                    placeholder={
                      assetType === 'cash' ? 'e.g., Chase Checking' :
                      assetType === 'deposit' ? 'e.g., Chase Savings' :
                      assetType === 'real_estate' ? 'e.g., Primary Home' :
                      'e.g., Gold Collection'
                    }
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    error={errors.name}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Current Value"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={assetValue}
                      onChange={(e) => setAssetValue(e.target.value)}
                      error={errors.value}
                    />
                    <CurrencyCombobox
                      label="Currency"
                      value={currency}
                      onChange={setCurrency}
                    />
                  </div>

                  {/* Real estate details (add mode) */}
                  {assetType === 'real_estate' && (
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

                  <div className="flex gap-2 pt-2">
                    {!isEditMode && (
                      <Button variant="ghost" onClick={() => setStep('type')} className="flex-1">
                        Back
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleDetailsSubmit}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading
                        ? (isEditMode ? 'Saving...' : 'Adding...')
                        : isEditMode
                          ? 'Save'
                          : assetType === 'real_estate'
                            ? 'Next'
                            : 'Add'
                      }
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Mortgage Question (for real estate) - only in add mode */}
          {step === 'mortgage' && (
            <div className="space-y-4">
              {hasMortgage === null ? (
                // Ask about mortgage
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-sm text-center"
                    style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                  >
                    <p className="text-sm font-medium mb-1" style={{ color: retro.text }}>
                      Do you have a mortgage on this property?
                    </p>
                    <p className="text-xs" style={{ color: retro.muted }}>
                      We can track it alongside your property
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setHasMortgage(false)}
                      className="flex-1"
                    >
                      No Mortgage
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setHasMortgage(true)}
                      className="flex-1"
                    >
                      Yes, Add Mortgage
                    </Button>
                  </div>
                </div>
              ) : hasMortgage ? (
                // Mortgage details form
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Mortgage Name"
                      placeholder={`${assetName} Mortgage`}
                      value={mortgageName}
                      onChange={(e) => setMortgageName(e.target.value)}
                    />
                    <CurrencyCombobox
                      label="Currency"
                      value={mortgageCurrency}
                      onChange={setMortgageCurrency}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Original Loan"
                      type="number"
                      placeholder="0.00"
                      value={mortgagePrincipal}
                      onChange={(e) => setMortgagePrincipal(e.target.value)}
                      hint="Initial amount borrowed"
                    />
                    <Input
                      label="Current Balance"
                      type="number"
                      placeholder="0.00"
                      value={mortgageCurrentBalance}
                      onChange={(e) => setMortgageCurrentBalance(e.target.value)}
                      hint="Amount still owed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Interest Rate (%)"
                      type="number"
                      placeholder="6.5"
                      value={mortgageRate}
                      onChange={(e) => setMortgageRate(e.target.value)}
                      hint="Annual rate"
                    />
                    <Input
                      label="Term (years)"
                      type="number"
                      placeholder="30"
                      value={mortgageTerm}
                      onChange={(e) => setMortgageTerm(e.target.value)}
                    />
                  </div>

                  <Input
                    label="Start Date"
                    type="date"
                    value={mortgageStartDate}
                    onChange={(e) => setMortgageStartDate(e.target.value)}
                  />

                  {mortgageMonthlyPayment > 0 && (
                    <div
                      className="p-3 rounded-sm text-center"
                      style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                    >
                      <Label variant="muted" className="block mb-1">Estimated Monthly Payment</Label>
                      <p className="text-lg font-bold" style={{ color: retro.negative }}>
                        {formatMoney(mortgageMonthlyPayment, mortgageCurrency)}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setHasMortgage(null)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleMortgageSubmit}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Adding...' : 'Add Property & Mortgage'}
                    </Button>
                  </div>
                </div>
              ) : (
                // No mortgage - just submit
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-sm text-center"
                    style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
                  >
                    <p className="text-sm" style={{ color: retro.muted }}>
                      Ready to add <strong style={{ color: retro.text }}>{assetName}</strong> with value{' '}
                      <strong style={{ color: retro.positive }}>{formatMoney(parseFloat(assetValue) || 0)}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setHasMortgage(null)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleMortgageSubmit}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Adding...' : 'Add Property'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
