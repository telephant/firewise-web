'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useViewMode } from '@/contexts/fire/view-mode-context';
import type { FlowCategoryPreset, AssetWithBalance, CreateAssetData, UpdateAssetData, DebtMetadata, Asset, CreateFlowData } from '@/types/fire';
import { getFlowCategoryPreset } from '@/types/fire';
import { getInvestmentTypeConfig, type InvestmentType } from './investment-type-selector';
import { getMetalAssetName, convertMetalWeight, type MetalUnit } from './metals-selector';
import {
  userTaxSettingsApi,
  assetInterestSettingsApi,
  debtApi,
  assetApi,
  transactionApi,
  assetTransactionApi,
  recurringScheduleApi,
  incomeApi,
  fireExpenseApi,
  debtTransactionApi,
  fireLinkedLedgerApi,
} from '@/lib/fire/api';
import {
  mutateRecurringSchedules,
  mutateTransactions,
  mutateStats,
  mutateExpenseStats,
} from '@/hooks/fire/use-fire-data';
import { useAssetInterestSettings, mutateAssetInterestSettings, mutateDebts, mutateAssets, useUserPreferences, useAssets, useLinkedLedgers, mutateLinkedLedgers } from '@/hooks/fire/use-fire-data';
import {
  type FlowFormState,
  type FlowFormErrors,
  type NewAssetState,
  type DialogStep,
  type ExpenseTab,
  getInitialFormState,
  getInitialNewAssetState,
} from './types';

interface UseAddTransactionFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  initialDebtId?: string;
  recurringOnly?: boolean; // If true, only create recurring schedule without a transaction
  noAssetInterest?: boolean; // If true, interest flow recorded as income without asset
  initialFormData?: Partial<FlowFormState>; // Pre-fill form fields (for AI preview)
  onSubmitSuccess?: () => void; // Callback after successful submission
  editAssetId?: string; // For edit mode - the asset ID to edit
}

export function useAddTransactionForm({ open, onOpenChange, initialCategory, initialDebtId, recurringOnly, noAssetInterest, initialFormData, onSubmitSuccess, editAssetId }: UseAddTransactionFormOptions) {
  // Use hooks directly instead of context
  const { assets } = useAssets();
  // Only fetch linked ledgers when dialog is open (avoid API call on dashboard)
  const { linkedLedgers: cachedLinkedLedgers, mutate: refetchLinkedLedgers } = useLinkedLedgers({ enabled: open });

  // Get view mode for belong_id
  const { viewMode, familyId } = useViewMode();
  const getBelongId = useCallback(() => {
    return viewMode === 'family' && familyId ? familyId : undefined;
  }, [viewMode, familyId]);

  // Inline mutation: Create flow (routes to domain-specific APIs)
  const createFlow = useCallback(async (data: CreateFlowData): Promise<boolean> => {
    const { type, amount, currency, from_asset_id, to_asset_id, category, date, description, metadata } = data;
    try {
      let success = false;
      if (type === 'income') {
        const result = await incomeApi.create({
          category: category || 'other',
          amount,
          to_asset_id: to_asset_id!,
          from_asset_id: from_asset_id || undefined,
          currency,
          date,
          description,
          metadata,
        });
        success = result.success;
      } else if (type === 'expense') {
        if (category === 'pay_debt' && data.debt_id) {
          const result = await debtTransactionApi.create({
            type: 'pay',
            amount,
            debt_id: data.debt_id,
            from_asset_id: from_asset_id || undefined,
            recurring_frequency: data.recurring_frequency !== 'none' ? data.recurring_frequency : undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else {
          const result = await fireExpenseApi.create({
            category: category || 'other',
            amount,
            from_asset_id: from_asset_id!,
            currency,
            date,
            description,
            flow_expense_category_id: data.flow_expense_category_id || undefined,
            metadata,
          });
          success = result.success;
        }
      } else if (type === 'transfer') {
        const flowMetadata = metadata as { shares?: number; action?: string; ticker?: string } | undefined;
        const shares = flowMetadata?.shares;
        const action = flowMetadata?.action;
        if (action === 'buy' || category === 'invest') {
          const result = await assetTransactionApi.create({
            type: 'invest',
            amount,
            ticker: flowMetadata?.ticker,
            shares: shares || 0,
            from_asset_id: from_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else if (action === 'sell' || category === 'sell') {
          const result = await assetTransactionApi.create({
            type: 'sell',
            amount,
            ticker: flowMetadata?.ticker,
            shares: Math.abs(shares || 0),
            from_asset_id: from_asset_id || undefined,
            to_asset_id: to_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else {
          const result = await assetTransactionApi.create({
            type: 'transfer',
            amount,
            from_asset_id: from_asset_id || undefined,
            to_asset_id: to_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        }
      } else {
        const result = await incomeApi.create({
          category: 'other',
          amount,
          to_asset_id: to_asset_id || from_asset_id || '',
          currency,
          date,
          description,
          metadata,
        });
        success = result.success;
      }
      if (success) {
        await Promise.all([mutateTransactions(), mutateAssets(), mutateStats(), mutateExpenseStats()]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Inline mutation: Create asset
  const createAsset = useCallback(async (data: CreateAssetData): Promise<Asset | null> => {
    try {
      const response = await assetApi.create(data);
      if (response.success && response.data) {
        await mutateAssets();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Inline mutation: Set linked ledgers
  const setLinkedLedgersApi = useCallback(async (ledgerIds: string[]): Promise<boolean> => {
    try {
      const response = await fireLinkedLedgerApi.set(ledgerIds);
      if (response.success) {
        await mutateLinkedLedgers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Fetch asset interest settings for deposit accounts
  const { settingsMap: interestSettingsMap } = useAssetInterestSettings();

  // Get user's preferred currency
  const { preferences: userPreferences } = useUserPreferences();

  // Edit mode state
  const isEditMode = !!editAssetId;
  const [editAssetLoading, setEditAssetLoading] = useState(false);

  // Dialog state
  const [step, setStep] = useState<DialogStep>(isEditMode ? 'form' : 'category');
  const [selectedPreset, setSelectedPreset] = useState<FlowCategoryPreset | null>(null);

  // Fetch user tax settings for dividend calculations (only when dividend is selected)
  const { data: taxSettings } = useSWR(
    open && selectedPreset?.id === 'dividend' ? '/fire/tax-settings' : null,
    async () => {
      const res = await userTaxSettingsApi.get();
      if (!res.success) return null;
      return res.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const [loading, setLoading] = useState(false);
  const [expenseTab, setExpenseTab] = useState<ExpenseTab>('link');
  const [savingLinkedLedgers, setSavingLinkedLedgers] = useState(false);
  const [showStartDateConfirm, setShowStartDateConfirm] = useState(false);

  // Form state
  const [form, setForm] = useState<FlowFormState>(getInitialFormState);
  const [formErrors, setFormErrors] = useState<FlowFormErrors>({});
  const [newAsset, setNewAsset] = useState<NewAssetState>(getInitialNewAssetState);

  // Track previous open state to handle transitions
  const prevOpenRef = useRef(open);

  // Reset all form state
  const resetForm = useCallback(() => {
    const initialState = getInitialFormState();
    // Use user's preferred currency if available
    if (userPreferences?.preferred_currency) {
      initialState.currency = userPreferences.preferred_currency;
    }
    setForm(initialState);
    setFormErrors({});
    setNewAsset(getInitialNewAssetState());
    setStep('category');
    setSelectedPreset(null);
    setExpenseTab('link');
    setShowStartDateConfirm(false);
    prevOpenRef.current = false;
  }, [userPreferences?.preferred_currency]);

  // Initialize with a category (for when dialog opens with initialCategory)
  const initializeWithCategory = useCallback((category: string, debtId?: string) => {
    const preset = getFlowCategoryPreset(category);
    if (preset) {
      // This will be called by the parent after dialog opens
      setSelectedPreset(preset);
      setStep('form');

      // Pre-select debt if provided (for pay_debt category)
      if (debtId && category === 'pay_debt') {
        setForm(prev => ({ ...prev, debtId }));
      }

      // Apply initialFormData if provided (for AI preview)
      if (initialFormData) {
        setForm(prev => ({
          ...prev,
          ...initialFormData,
          // Don't override debtId if it was explicitly passed
          ...(debtId ? { debtId } : {}),
        }));
      }
    }
  }, [initialFormData]);

  // Load asset data when in edit mode
  useEffect(() => {
    if (!open || !editAssetId) return;

    const loadAssetForEdit = async () => {
      setEditAssetLoading(true);
      try {
        const res = await assetApi.get(editAssetId);
        if (res.success && res.data) {
          const asset = res.data;

          // Determine category based on asset type
          const category = asset.type === 'deposit' ? 'deposit' : 'other';
          const preset = getFlowCategoryPreset(category);
          if (preset) {
            setSelectedPreset(preset);
            setStep('form');
          }

          // Get metadata for interest settings
          const metadata = asset.metadata as { interest_rate?: number; payment_period?: string } | null;

          // Pre-fill form with asset data
          setForm(prev => ({
            ...prev,
            amount: asset.balance.toString(),
            currency: asset.currency,
            toAssetId: asset.id,
            // For deposit edit, we need to set the new asset fields since it's like creating
            interestRate: metadata?.interest_rate ? (metadata.interest_rate * 100).toString() : '',
            interestPaymentPeriod: (metadata?.payment_period as FlowFormState['interestPaymentPeriod']) || 'monthly',
          }));

          // Set up newAsset state for the deposit name
          setNewAsset(prev => ({
            ...prev,
            show: 'to',
            name: asset.name,
            type: 'deposit',
          }));
        }
      } catch (error) {
        console.error('Failed to load asset for editing:', error);
        toast.error('Failed to load asset data');
      } finally {
        setEditAssetLoading(false);
      }
    };

    loadAssetForEdit();
  }, [open, editAssetId]);

  // Auto-initialize when initialCategory and initialFormData are provided (for AI preview mode)
  const hasAutoInitialized = useRef(false);
  useEffect(() => {
    if (open && initialCategory && initialFormData && !hasAutoInitialized.current) {
      hasAutoInitialized.current = true;
      const preset = getFlowCategoryPreset(initialCategory);
      if (preset) {
        setSelectedPreset(preset);
        setStep('form');
        setForm(prev => ({
          ...prev,
          ...initialFormData,
        }));
      }
    }
    // Reset flag when dialog closes
    if (!open) {
      hasAutoInitialized.current = false;
    }
  }, [open, initialCategory, initialFormData]);

  // Set currency from user preferences when dialog opens (and currency hasn't been changed)
  const hasCurrencyInitialized = useRef(false);
  useEffect(() => {
    if (open && userPreferences?.preferred_currency && !hasCurrencyInitialized.current) {
      // Only set if currency is still the default 'USD'
      setForm(prev => {
        if (prev.currency === 'USD') {
          return { ...prev, currency: userPreferences.preferred_currency };
        }
        return prev;
      });
      hasCurrencyInitialized.current = true;
    }
    // Reset flag when dialog closes
    if (!open) {
      hasCurrencyInitialized.current = false;
    }
  }, [open, userPreferences?.preferred_currency]);

  // Form field updater - clears related errors and handles side effects
  const updateForm = useCallback(<K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => {
    setForm(prev => {
      const newState = { ...prev, [field]: value };

      // Auto-set currency when selecting a property asset for rental
      if (field === 'fromAssetId' && value && selectedPreset?.id === 'rental') {
        const selectedAsset = assets.find(a => a.id === value);
        if (selectedAsset?.currency) {
          newState.currency = selectedAsset.currency;
        }
      }

      // Auto-set payment period and calculate expected interest when selecting a deposit
      if (field === 'fromAssetId' && value && selectedPreset?.id === 'interest') {
        const assetId = value as string;
        const savedSettings = interestSettingsMap[assetId];
        const selectedAsset = assets.find(a => a.id === assetId);

        if (savedSettings?.payment_period) {
          newState.interestPaymentPeriod = savedSettings.payment_period;
        }

        // Calculate expected interest from saved APY rate
        if (savedSettings?.interest_rate && selectedAsset?.balance) {
          const apy = savedSettings.interest_rate; // Already decimal (e.g., 0.05 for 5%)
          const balance = selectedAsset.balance;
          const period = savedSettings.payment_period || 'monthly';

          // Get periods per year
          const getPeriodsPerYear = (p: string): number => {
            switch (p) {
              case 'weekly': return 52;
              case 'monthly': return 12;
              case 'quarterly': return 4;
              case 'semi_annual': return 2;
              case 'annual': return 1;
              case 'biennial': return 0.5;
              case 'triennial': return 1/3;
              case 'quinquennial': return 0.2;
              default: return 12;
            }
          };

          const periodsPerYear = getPeriodsPerYear(period);
          // Convert APY to period rate: period_rate = (1 + APY)^(1/periods_per_year) - 1
          const periodRate = Math.pow(1 + apy, 1 / periodsPerYear) - 1;
          const expectedInterest = balance * periodRate;

          // Set amount to expected interest (rounded to 2 decimals)
          newState.amount = expectedInterest.toFixed(2);
        }

        // Set currency from the selected asset
        if (selectedAsset?.currency) {
          newState.currency = selectedAsset.currency;
        }
      }

      return newState;
    });

    // Clear related errors
    if (field === 'amount' && value) {
      setFormErrors(prev => ({ ...prev, amount: undefined }));
    }
    if (field === 'shares' && value) {
      setFormErrors(prev => ({ ...prev, shares: undefined }));
    }
    if (field === 'selectedTicker' && value) {
      setFormErrors(prev => ({ ...prev, ticker: undefined }));
    }
    if (field === 'fromAssetId' && value) {
      setFormErrors(prev => ({ ...prev, fromAsset: undefined }));
    }
    if (field === 'toAssetId' && value) {
      setFormErrors(prev => ({ ...prev, toAsset: undefined }));
    }
    if (field === 'depositMatured' && value !== null) {
      setFormErrors(prev => ({ ...prev, depositMatured: undefined }));
    }
    if (field === 'withdrawToCashAssetId' && value) {
      setFormErrors(prev => ({ ...prev, toAsset: undefined }));
    }
  }, [selectedPreset?.id, assets, interestSettingsMap]);

  // New asset field updater
  const updateNewAsset = useCallback(<K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => {
    setNewAsset(prev => ({ ...prev, [field]: value }));
  }, []);

  // Derive linked ledgers from cache - no need to sync to form state
  // The form.linkedLedgers is only used for user edits, not initial state
  const linkedLedgers = form.linkedLedgers.length > 0 ? form.linkedLedgers : cachedLinkedLedgers;

  // Handle category selection
  const handleCategorySelect = useCallback((preset: FlowCategoryPreset) => {
    setSelectedPreset(preset);

    const updates: Partial<FlowFormState> = {};

    // Set up From field based on preset
    if (preset.from.type === 'external') {
      updates.fromType = 'external';
      updates.fromExternalName = preset.from.defaultName || '';
      updates.fromAssetId = '';
    } else {
      updates.fromType = 'asset';
      updates.fromExternalName = '';
      // Auto-select first matching asset if available
      if (preset.from.assetFilter) {
        const matchingAssets = assets.filter(a => preset.from.assetFilter!.includes(a.type));
        updates.fromAssetId = matchingAssets.length > 0 ? matchingAssets[0].id : '';
      } else {
        updates.fromAssetId = '';
      }
    }

    // Set up To field based on preset
    if (preset.to.type === 'external') {
      updates.toType = 'external';
      updates.toExternalName = preset.to.defaultName || '';
      updates.toAssetId = '';
    } else if (preset.to.type === 'same_as_from') {
      updates.toType = 'asset';
      updates.toAssetId = '';
    } else {
      updates.toType = 'asset';
      updates.toExternalName = '';
      // Auto-select first matching asset if available (e.g., first cash account for income)
      if (preset.to.assetFilter) {
        const matchingAssets = assets.filter(a => preset.to.assetFilter!.includes(a.type));
        updates.toAssetId = matchingAssets.length > 0 ? matchingAssets[0].id : '';
      } else {
        updates.toAssetId = '';
      }
    }

    setForm(prev => ({ ...prev, ...updates }));

    // For deposit flows, default to creating a new deposit account
    if (preset.id === 'deposit') {
      setNewAsset(prev => ({ ...prev, show: 'to', type: 'deposit' }));
    }

    // For debt flows, set the debt type
    if (preset.id === 'add_mortgage') {
      setForm(prev => ({ ...prev, debtType: 'mortgage' }));
    } else if (preset.id === 'add_loan') {
      setForm(prev => ({ ...prev, debtType: 'personal_loan' }));
    }

    setStep('form');
  }, [assets]);


  // Save linked ledgers (for Link to Ledger tab)
  const handleSaveLinkedLedgers = useCallback(async () => {
    setSavingLinkedLedgers(true);
    try {
      const ledgerIds = linkedLedgers.map(l => l.ledger_id);
      const success = await setLinkedLedgersApi(ledgerIds);
      if (success) {
        toast.success('Linked ledgers saved');
        onOpenChange(false);
      } else {
        toast.error('Failed to save linked ledgers');
      }
    } catch {
      toast.error('Failed to save linked ledgers');
    } finally {
      setSavingLinkedLedgers(false);
    }
  }, [linkedLedgers, onOpenChange, setLinkedLedgersApi]);

  // Create new asset (or return existing one if name matches)
  const handleCreateAsset = useCallback(async (): Promise<string | null> => {
    if (!newAsset.name.trim()) {
      toast.error('Asset name is required');
      return null;
    }

    const assetName = newAsset.name.trim();

    // Check if asset with same name already exists
    const existingAsset = assets.find(
      (a) => a.name.toLowerCase() === assetName.toLowerCase()
    );

    if (existingAsset) {
      toast.success(`Using existing asset "${existingAsset.name}"`);
      setNewAsset(getInitialNewAssetState());
      return existingAsset.id;
    }

    const data: CreateAssetData = {
      name: assetName,
      type: newAsset.type,
      currency: form.currency,
      belong_id: getBelongId(),
    };

    if (newAsset.ticker.trim()) {
      data.ticker = newAsset.ticker.trim();
    }

    const asset = await createAsset(data);
    if (asset) {
      toast.success(`Asset "${asset.name}" created`);
      setNewAsset(getInitialNewAssetState());
      return asset.id;
    } else {
      toast.error('Failed to create asset');
      return null;
    }
  }, [newAsset, form.currency, createAsset, assets]);

  // Submit flow
  const handleSubmit = useCallback(async () => {
    if (!selectedPreset) return;

    // Validate form
    const errors: FlowFormErrors = {};

    // Debt flows use debtPrincipal instead of amount
    // Metals investments have optional cost
    const isDebtFlow = selectedPreset.id === 'add_mortgage' || selectedPreset.id === 'add_loan';
    const isMetals = selectedPreset.id === 'invest' && form.investmentType === 'metals';
    if (!isDebtFlow && !isMetals && (!form.amount || parseFloat(form.amount) <= 0)) {
      errors.amount = 'Amount is required';
    }

    // Validate stock investment (US or SGX)
    const isStockInvest = selectedPreset.id === 'invest' &&
      (form.investmentType === 'us_stock' || form.investmentType === 'sgx_stock');
    if (isStockInvest) {
      if (!form.selectedTicker) {
        errors.ticker = 'Please select a stock';
      }
      if (!form.shares || parseFloat(form.shares) <= 0) {
        errors.shares = 'Shares required';
      }
    }

    // Validate metals investment
    const isMetalsInvest = selectedPreset.id === 'invest' && form.investmentType === 'metals';
    if (isMetalsInvest) {
      if (!form.shares || parseFloat(form.shares) <= 0) {
        errors.shares = 'Quantity required';
      }
    }

    // Validate interest flow requires deposit maturity selection (only when linked to asset)
    if (selectedPreset.id === 'interest' && !noAssetInterest && form.depositMatured === null) {
      errors.depositMatured = 'Please select what happens to the deposit';
    }

    // Validate recurring frequency is required when recurringOnly mode
    if (recurringOnly && form.recurringFrequency === 'none') {
      errors.recurringFrequency = 'Please select a recurring frequency';
    }

    // Validate required asset selections (before auto-selection kicks in)
    // Check if to_asset is required but not selected and can't be auto-selected
    // Skip for stock invest (US/SGX) - asset is created automatically from ticker selection
    // Skip for metals invest - asset is created automatically
    // Skip for no-asset interest - no target account needed
    const isNoAssetInterestFlow = selectedPreset.id === 'interest' && noAssetInterest;
    if (selectedPreset.to.type === 'asset' && !form.toAssetId && !newAsset.show && !isStockInvest && !isMetalsInvest && !isNoAssetInterestFlow) {
      const filtered = selectedPreset.to.assetFilter
        ? assets.filter(a => selectedPreset.to.assetFilter!.includes(a.type))
        : assets;
      if (filtered.length !== 1) {
        // Can't auto-select, user must choose
        errors.toAsset = 'Please select an account';
      }
    }
    // Check if from_asset is required but not selected (skip for no-asset interest and metals)
    if (selectedPreset.from.type === 'asset' && !form.fromAssetId && !newAsset.show) {
      const isNoAssetInterest = selectedPreset.id === 'interest' && noAssetInterest;
      if (!isNoAssetInterest && !isMetalsInvest) {
        const filtered = selectedPreset.from.assetFilter
          ? assets.filter(a => selectedPreset.from.assetFilter!.includes(a.type))
          : assets;
        if (filtered.length !== 1) {
          errors.fromAsset = 'Please select an account';
        }
      }
    }

    // If there are errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);

    // Track newly created assets and flows for rollback on failure
    const createdAssetIds: string[] = [];
    const createdFlowIds: string[] = [];

    // Rollback helper - delete all created assets and transactions on failure
    const rollbackTransaction = async () => {
      // Delete transactions first (they reference assets)
      for (const flowId of createdFlowIds) {
        try {
          await transactionApi.delete(flowId);
        } catch (err) {
          console.error(`Failed to rollback transaction ${flowId}:`, err);
        }
      }
      // Then delete assets
      for (const assetId of createdAssetIds) {
        try {
          await assetApi.delete(assetId);
        } catch (err) {
          console.error(`Failed to rollback asset ${assetId}:`, err);
        }
      }
      if (createdAssetIds.length > 0) {
        await mutateAssets(); // Refresh assets cache after rollback
      }
    };

    try {
      let finalFromAssetId = form.fromAssetId;
      let finalToAssetId = form.toAssetId;

      // Auto-select single matching asset when field is hidden (e.g., only 1 cash account for invest)
      if (!finalFromAssetId && selectedPreset.from.type === 'asset' && selectedPreset.from.assetFilter) {
        const filtered = assets.filter(a => selectedPreset.from.assetFilter!.includes(a.type));
        if (filtered.length === 1) {
          finalFromAssetId = filtered[0].id;
        }
      }
      if (!finalToAssetId && selectedPreset.to.type === 'asset' && selectedPreset.to.assetFilter) {
        const filtered = assets.filter(a => selectedPreset.to.assetFilter!.includes(a.type));
        if (filtered.length === 1) {
          finalToAssetId = filtered[0].id;
        }
      }

      // Create new assets if needed
      if (newAsset.show === 'from') {
        // Special handling for interest flow - create deposit with initial balance
        if (selectedPreset.id === 'interest') {
          const depositBalance = parseFloat(form.depositBalance) || 0;
          if (!newAsset.name.trim()) {
            toast.error('Deposit account name is required');
            setLoading(false);
            return;
          }
          if (depositBalance <= 0) {
            setFormErrors(prev => ({ ...prev, depositBalance: 'Balance is required' }));
            setLoading(false);
            return;
          }

          // Create the deposit asset
          const depositAsset = await createAsset({
            name: newAsset.name.trim(),
            type: 'deposit',
            currency: form.currency,
            belong_id: getBelongId(),
          });

          if (!depositAsset) {
            toast.error('Failed to create deposit account');
            setLoading(false);
            return;
          }
          createdAssetIds.push(depositAsset.id);

          // Create an "income" flow to establish initial balance
          const initialFlowSuccess = await createFlow({
            type: 'income',
            amount: depositBalance,
            currency: form.currency,
            to_asset_id: depositAsset.id,
            category: 'deposit',
            date: form.date,
            description: `Initial deposit for ${depositAsset.name}`,
          });

          if (!initialFlowSuccess) {
            await rollbackTransaction();
            toast.error('Failed to create initial deposit flow');
            setLoading(false);
            return;
          }

          toast.success(`Deposit account "${depositAsset.name}" created`);
          finalFromAssetId = depositAsset.id;
          setNewAsset(getInitialNewAssetState());
        } else {
          const newId = await handleCreateAsset();
          if (!newId) {
            setLoading(false);
            return;
          }
          finalFromAssetId = newId;
        }
      }

      if (newAsset.show === 'to' && !isEditMode) {
        // Special handling for deposit flow - create deposit with interest settings
        if (selectedPreset.id === 'deposit') {
          if (!newAsset.name.trim()) {
            toast.error('Deposit account name is required');
            setLoading(false);
            return;
          }

          // Create the deposit asset
          const depositAsset = await createAsset({
            name: newAsset.name.trim(),
            type: 'deposit',
            currency: form.currency,
            belong_id: getBelongId(),
          });

          if (!depositAsset) {
            toast.error('Failed to create deposit account');
            setLoading(false);
            return;
          }
          createdAssetIds.push(depositAsset.id);

          // Save interest settings if rate was provided
          const interestRate = parseFloat(form.interestRate);
          if (interestRate > 0) {
            try {
              await assetInterestSettingsApi.upsert(depositAsset.id, {
                interest_rate: interestRate / 100, // Convert from percentage to decimal
                payment_period: form.interestPaymentPeriod,
              });
              await mutateAssetInterestSettings();
            } catch (err) {
              console.error('Failed to save interest settings:', err);
              // Don't fail - interest settings are optional
            }
          }

          toast.success(`Deposit account "${depositAsset.name}" created`);
          finalToAssetId = depositAsset.id;
          setNewAsset(getInitialNewAssetState());
        } else {
          const newId = await handleCreateAsset();
          if (!newId) {
            setLoading(false);
            return;
          }
          finalToAssetId = newId;
        }
      }

      // Handle "same_as_from" for To field (after asset creation)
      if (selectedPreset.to.type === 'same_as_from') {
        finalToAssetId = finalFromAssetId;
      }

      // Handle Stock investment (US or SGX) - auto-create asset from ticker selection
      const isStockInvestment = selectedPreset.id === 'invest' &&
        (form.investmentType === 'us_stock' || form.investmentType === 'sgx_stock');
      if (isStockInvestment) {
        const existingAsset = assets.find(
          (a) => a.ticker?.toUpperCase() === form.selectedTicker.toUpperCase()
        );

        if (existingAsset) {
          finalToAssetId = existingAsset.id;
        } else {
          // Determine currency and market based on investment type
          const stockCurrency = form.investmentType === 'sgx_stock' ? 'SGD' : 'USD';
          const stockMarket = form.investmentType === 'sgx_stock' ? 'SG' : 'US';

          const stockAsset = await createAsset({
            name: form.selectedTickerName || form.selectedTicker,
            type: 'stock',
            ticker: form.selectedTicker,
            currency: stockCurrency,
            market: stockMarket,
            belong_id: getBelongId(),
          });

          if (!stockAsset) {
            toast.error('Failed to create stock asset');
            setLoading(false);
            return;
          }
          createdAssetIds.push(stockAsset.id);

          toast.success(`Asset "${stockAsset.name}" created`);
          finalToAssetId = stockAsset.id;
        }
      }

      // Handle Metals investment - auto-create asset for precious metals
      // This is atomic: create/update asset with balance directly, no transaction
      const isMetalsInvestment = selectedPreset.id === 'invest' && form.investmentType === 'metals';
      let metalWeightToAdd = parseFloat(form.shares); // shares field holds weight for metals
      if (isMetalsInvestment) {
        // Find existing asset by metal_type (not by name) to avoid duplicate metal rows
        const existingAsset = assets.find(
          (a) => a.type === 'metals' &&
                 (a.metadata as { metal_type?: string } | null)?.metal_type === form.metalType
        );

        if (existingAsset) {
          finalToAssetId = existingAsset.id;
          // Convert weight if existing asset uses different unit
          const existingUnit = (existingAsset.metadata as { metal_unit?: MetalUnit } | null)?.metal_unit || 'gram';
          if (existingUnit !== form.metalUnit) {
            metalWeightToAdd = convertMetalWeight(metalWeightToAdd, form.metalUnit, existingUnit);
          }
          // Update existing asset balance atomically (no transaction)
          const newBalance = existingAsset.balance + metalWeightToAdd;
          const updateResponse = await assetApi.update(existingAsset.id, {
            balance: newBalance,
          });
          if (!updateResponse.success) {
            toast.error('Failed to update metal asset');
            setLoading(false);
            return;
          }
          await mutateAssets();
          toast.success(`Added ${form.shares} ${form.metalUnit} to ${existingAsset.name}`);
          onSubmitSuccess?.();
          onOpenChange(false);
          setLoading(false);
          return; // Done - no transaction needed
        } else {
          // Create new metal asset with initial balance
          const metalAssetName = getMetalAssetName(form.metalType, form.metalUnit);
          const metalAsset = await createAsset({
            name: metalAssetName,
            type: 'metals',
            currency: form.currency,
            balance: metalWeightToAdd,
            belong_id: getBelongId(),
            metadata: {
              metal_type: form.metalType,
              metal_unit: form.metalUnit,
            },
          });

          if (!metalAsset) {
            toast.error('Failed to create metal asset');
            setLoading(false);
            return;
          }

          await mutateAssets();
          toast.success(`Asset "${metalAsset.name}" created with ${form.shares} ${form.metalUnit}`);
          onSubmitSuccess?.();
          onOpenChange(false);
          setLoading(false);
          return; // Done - no transaction needed
        }
      }

      // Handle Debt creation (mortgage, loan)
      if (selectedPreset.id === 'add_mortgage' || selectedPreset.id === 'add_loan') {
        // Validate debt fields
        if (!form.debtName.trim()) {
          setFormErrors(prev => ({ ...prev, debtName: 'Name is required' }));
          setLoading(false);
          return;
        }

        const principal = parseFloat(form.debtPrincipal);
        if (!principal || principal <= 0) {
          setFormErrors(prev => ({ ...prev, debtPrincipal: 'Loan amount is required' }));
          setLoading(false);
          return;
        }

        // Calculate monthly payment if we have all the data
        const interestRate = parseFloat(form.debtInterestRate) / 100 || 0; // Convert to decimal
        const termMonths = parseInt(form.debtTermMonths) || 0;
        let monthlyPayment: number | null = null;

        if (principal > 0 && interestRate > 0 && termMonths > 0) {
          const monthlyRate = interestRate / 12;
          const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
            (Math.pow(1 + monthlyRate, termMonths) - 1);
          monthlyPayment = Math.round(payment * 100) / 100;
        }

        // Create the debt using the atomic transaction API (handles disbursement too)
        const debtResponse = await debtTransactionApi.create({
          type: 'create',
          name: form.debtName.trim(),
          debt_type: selectedPreset.id === 'add_mortgage' ? 'mortgage' : form.debtType,
          amount: principal,
          principal: principal,
          interest_rate: interestRate > 0 ? interestRate : undefined,
          term_months: termMonths > 0 ? termMonths : undefined,
          start_date: form.debtStartDate || undefined,
          monthly_payment: monthlyPayment || undefined,
          currency: form.currency,
          date: form.debtStartDate || form.date,
          // If there's a target account, backend will handle disbursement atomically
          disburse_to_asset_id: finalToAssetId || undefined,
          description: finalToAssetId
            ? `${selectedPreset.id === 'add_mortgage' ? 'Mortgage' : 'Loan'} disbursement from ${form.fromExternalName || 'Lender'}`
            : undefined,
          metadata: form.fromExternalName ? { lender: form.fromExternalName } : undefined,
        });

        if (!debtResponse.success || !debtResponse.data) {
          toast.error(debtResponse.error || 'Failed to create debt');
          setLoading(false);
          return;
        }

        const debt = debtResponse.data.debt;
        await mutateDebts();
        await mutateAssets(); // Refresh assets if disbursement updated balance
        toast.success(`${selectedPreset.id === 'add_mortgage' ? 'Mortgage' : 'Loan'} "${debt.name}" added`);

        onOpenChange(false);
        setLoading(false);
        return; // Early return - debt handled completely
      }

      // Validate based on flow type
      const flowType = selectedPreset.flowType;
      let hasAssetErrors = false;
      const assetErrors: FlowFormErrors = {};

      if (flowType === 'income') {
        // Validate to asset (destination)
        if (form.toType === 'asset' && !finalToAssetId) {
          assetErrors.toAsset = 'Select destination';
          hasAssetErrors = true;
        }
        // Validate from asset for income flows that have asset source (e.g., rental)
        if (selectedPreset.from.type === 'asset' && !finalFromAssetId) {
          assetErrors.fromAsset = 'Select property';
          hasAssetErrors = true;
        }
      }

      if (flowType === 'expense' && form.fromType === 'asset' && !finalFromAssetId) {
        assetErrors.fromAsset = 'Select source';
        hasAssetErrors = true;
      }

      if (flowType === 'transfer') {
        // Skip asset validation for no-asset interest (handled as income below)
        const isNoAssetInterest = selectedPreset.id === 'interest' && noAssetInterest;
        if (!isNoAssetInterest) {
          if (form.fromType === 'asset' && !finalFromAssetId) {
            assetErrors.fromAsset = 'Select source';
            hasAssetErrors = true;
          }
          if (form.toType === 'asset' && !finalToAssetId) {
            assetErrors.toAsset = 'Select destination';
            hasAssetErrors = true;
          }
        }
      }

      if (hasAssetErrors) {
        setFormErrors(prev => ({ ...prev, ...assetErrors }));
        setLoading(false);
        return;
      }

      // Build metadata for extra fields
      const metadata: Record<string, unknown> = {};
      // For metals, use converted weight; for others, use raw shares
      if (form.shares) {
        metadata.shares = isMetalsInvestment ? metalWeightToAdd : parseFloat(form.shares);
      }

      // Store source name for income flows with external source (salary, bonus, freelance, etc.)
      if (selectedPreset.flowType === 'income' && selectedPreset.from.type === 'external' && form.fromExternalName.trim()) {
        metadata.source_name = form.fromExternalName.trim();
      }

      // For invest flow, compute price_per_share; for other flows, use manual input
      if (selectedPreset.id === 'invest' && form.shares && form.amount) {
        // For metals, use converted weight for price calculation
        const shares = isMetalsInvestment ? metalWeightToAdd : parseFloat(form.shares);
        const amount = parseFloat(form.amount);
        if (shares > 0 && amount > 0) {
          metadata.price_per_share = amount / shares;
        }
      } else if (form.pricePerShare) {
        metadata.price_per_share = parseFloat(form.pricePerShare);
      }

      // Add linked ledgers to metadata if expense has linked ledgers
      if (selectedPreset.id === 'expense' && linkedLedgers.length > 0) {
        metadata.linked_ledgers = linkedLedgers;
      }

      // Add investment type info for invest flows
      if (selectedPreset.id === 'invest') {
        metadata.investment_type = form.investmentType;
        if (form.selectedTicker) {
          metadata.ticker = form.selectedTicker;
        }
        // For value-based investments, store both bought and current values
        if (form.investmentType === 'real_estate' || form.investmentType === 'other') {
          metadata.bought_value = parseFloat(form.amount) || 0;
          metadata.current_value = parseFloat(form.currentValue) || 0;
        }
      }

      // Add sell flow metadata (P/L calculation)
      if (selectedPreset.id === 'sell') {
        const fees = parseFloat(form.sellFees) || 0;
        const shares = parseFloat(form.shares) || 0;
        const pricePerShare = parseFloat(form.pricePerShare) || 0;
        const costBasis = parseFloat(form.sellCostBasis) || 0;

        if (fees > 0) metadata.fees = fees;
        if (form.sellMarkAsSold) metadata.mark_as_sold = true;

        // Store P/L data
        if (shares > 0) metadata.shares = shares;
        if (pricePerShare > 0) metadata.price_per_share = pricePerShare;
        if (costBasis > 0) metadata.cost_basis = costBasis;

        // Calculate realized P/L: (sale price - cost basis) * shares
        if (shares > 0 && pricePerShare > 0 && costBasis > 0) {
          const realizedPL = (pricePerShare - costBasis) * shares;
          metadata.realized_pl = realizedPL;
        }
      }

      // Calculate final amount (for dividends, store NET amount with tax info in metadata)
      let finalAmount = parseFloat(form.amount);

      if (selectedPreset.id === 'dividend') {
        const grossAmount = parseFloat(form.amount);
        const taxRate = taxSettings?.us_dividend_withholding_rate ?? 0.30;
        const taxWithheld = grossAmount * taxRate;
        const netAmount = grossAmount - taxWithheld;

        // Store NET amount as the flow amount
        finalAmount = netAmount;

        // Store tax info in metadata
        metadata.tax_rate = taxRate;
        metadata.tax_withheld = taxWithheld;
      }

      // Handle no-asset interest flow (recorded without linked accounts)
      if (selectedPreset.id === 'interest' && noAssetInterest) {
        metadata.payment_period = form.interestPaymentPeriod;
        metadata.no_linked_account = true;

        // Include principal if provided (for interest rate tracking)
        const principal = parseFloat(form.interestPrincipal);
        if (principal > 0) {
          metadata.principal = principal;
          // Calculate and store the period rate
          const interestAmount = parseFloat(form.amount) || 0;
          if (interestAmount > 0) {
            const periodRate = interestAmount / principal;
            const periodsPerYear = (() => {
              switch (form.interestPaymentPeriod) {
                case 'weekly': return 52;
                case 'monthly': return 12;
                case 'quarterly': return 4;
                case 'semi_annual': return 2;
                case 'annual': return 1;
                case 'biennial': return 0.5;
                case 'triennial': return 1/3;
                case 'quinquennial': return 0.2;
                default: return 12;
              }
            })();
            const annualizedRate = Math.pow(1 + periodRate, periodsPerYear) - 1;
            metadata.period_rate = periodRate;
            metadata.annualized_rate = annualizedRate;
          }
        }

        const success = await createFlow({
          type: 'income',  // Use income type for proper categorization
          amount: finalAmount,
          currency: form.currency,
          from_asset_id: null,
          to_asset_id: null,  // No target account
          category: 'interest',
          date: form.date,
          description: form.description || 'Interest earned',
          metadata,
          ...(form.recurringFrequency !== 'none' ? { recurring_frequency: form.recurringFrequency } : {}),
        });

        if (success) {
          toast.success('Interest recorded');
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          toast.error('Failed to record interest');
        }
        setLoading(false);
        return;
      }

      // Handle interest flows with maturity withdrawal option
      if (selectedPreset.id === 'interest') {
        const interestAmount = parseFloat(form.amount);

        // Get balance - either from new asset input or existing asset
        let assetBalance: number;
        if (newAsset.show === 'from') {
          // Creating new deposit asset - use the input balance
          assetBalance = parseFloat(form.depositBalance) || 0;
        } else {
          // Using existing asset
          const selectedAsset = assets.find(a => a.id === finalFromAssetId);
          assetBalance = selectedAsset?.balance || 0;
        }

        if (assetBalance > 0) {
          // Calculate rate based on payment period
          const periodRate = interestAmount / assetBalance;

          // Get periods per year based on payment period
          const getPeriodsPerYear = (period: string): number => {
            switch (period) {
              case 'weekly': return 52;
              case 'monthly': return 12;
              case 'quarterly': return 4;
              case 'semi_annual': return 2;
              case 'annual': return 1;
              case 'biennial': return 0.5;
              case 'triennial': return 1/3;
              case 'quinquennial': return 0.2;
              default: return 12;
            }
          };

          const periodsPerYear = getPeriodsPerYear(form.interestPaymentPeriod);
          const annualizedRate = Math.pow(1 + periodRate, periodsPerYear) - 1;

          metadata.asset_balance = assetBalance;
          metadata.period_rate = periodRate;
          metadata.annualized_rate = annualizedRate;
          metadata.payment_period = form.interestPaymentPeriod;

          // Save interest settings to the asset
          if (finalFromAssetId) {
            try {
              await assetInterestSettingsApi.upsert(finalFromAssetId, {
                interest_rate: annualizedRate,
                payment_period: form.interestPaymentPeriod,
              });
              await mutateAssetInterestSettings();
            } catch (err) {
              console.error('Failed to save interest settings:', err);
              // Don't fail the flow creation, just log the error
            }
          }
        }

        // Handle non-matured deposit (keep interest in deposit account)
        // Create income flow to add interest to the deposit balance
        if (form.depositMatured === false) {
          metadata.deposit_matured = false;

          const success = await createFlow({
            type: 'income',
            amount: interestAmount,
            currency: form.currency,
            from_asset_id: finalFromAssetId || null,  // Reference to deposit (context)
            to_asset_id: finalFromAssetId || null,    // Income goes to same deposit
            category: 'interest',
            date: form.date,
            description: form.description || `Interest on deposit`,
            metadata,
            ...(form.recurringFrequency !== 'none' ? { recurring_frequency: form.recurringFrequency } : {}),
          });

          if (success) {
            // Update deposit balance with interest
            if (finalFromAssetId) {
              const depositAsset = assets.find(a => a.id === finalFromAssetId);
              if (depositAsset) {
                const newBalance = depositAsset.balance + interestAmount;
                await assetApi.update(finalFromAssetId, { balance: newBalance });
                await mutateAssets();
              }
            }
            toast.success('Interest recorded');
            onSubmitSuccess?.();
            onOpenChange(false);
          } else {
            toast.error('Failed to record interest');
          }
          setLoading(false);
          return; // Early return - non-matured interest handled
        }

        // Handle deposit maturity - withdraw principal + interest to cash
        if (form.depositMatured) {
          // Validate cash account is selected
          if (!form.withdrawToCashAssetId) {
            setFormErrors(prev => ({ ...prev, toAsset: 'Select cash account' }));
            setLoading(false);
            return;
          }

          const totalAmount = assetBalance + interestAmount;
          metadata.deposit_matured = true;
          metadata.principal_amount = assetBalance;
          metadata.interest_amount = interestAmount;

          // Create a transfer flow from deposit to cash (principal + interest)
          // Note: Don't use adjust_balances here because we need special handling:
          // - The deposit balance is only the principal, but we're transferring principal + interest
          // - We need to zero out the deposit and add the full amount to cash
          const success = await createFlow({
            type: 'transfer',
            amount: totalAmount,
            currency: form.currency,
            from_asset_id: finalFromAssetId || null,
            to_asset_id: form.withdrawToCashAssetId,
            category: 'interest',
            date: form.date,
            description: form.description || `Deposit matured - Principal + Interest`,
            metadata,
          });

          if (success) {
            // 1. Zero out the deposit account
            if (finalFromAssetId) {
              await assetApi.update(finalFromAssetId, { balance: 0 });
            }

            // 2. Add to cash account
            // Note: Currency conversion should be handled - the flow amount is in deposit currency
            // For now, add the amount directly. If currencies differ, user should verify.
            const cashAccount = assets.find(a => a.id === form.withdrawToCashAssetId);
            if (cashAccount) {
              const depositCurrency = form.currency;
              const cashCurrency = cashAccount.currency || 'USD';

              // For same currency, add directly
              // For different currencies, add the amount and warn user
              // Full conversion would require exchange rate API call
              const newCashBalance = cashAccount.balance + totalAmount;
              await assetApi.update(form.withdrawToCashAssetId, { balance: newCashBalance });

              if (depositCurrency.toLowerCase() !== cashCurrency.toLowerCase()) {
                toast.info(
                  `Added ${form.currency} ${totalAmount.toLocaleString()} to ${cashAccount.name}. ` +
                  `Verify the converted amount in ${cashCurrency}.`,
                  { duration: 6000 }
                );
              }
            }

            await mutateAssets();
            toast.success('Deposit withdrawn to cash');
            onSubmitSuccess?.();
            onOpenChange(false);
          } else {
            toast.error('Failed to record interest');
          }
          setLoading(false);
          return; // Early return - matured deposit handled
        }
      }

      // Handle pay debt flow
      if (selectedPreset.id === 'pay_debt') {
        // Validate debt is selected (uses form.debtId, not form.toAssetId)
        if (!form.debtId) {
          setFormErrors(prev => ({ ...prev, debtId: 'Select a debt to pay' }));
          setLoading(false);
          return;
        }

        // Validate payment source
        if (form.payDebtSourceType === 'cash' && !form.fromAssetId) {
          setFormErrors(prev => ({ ...prev, fromAsset: 'Select cash account' }));
          setLoading(false);
          return;
        }

        const paymentAmount = parseFloat(form.amount);

        metadata.payment_source = form.payDebtSourceType;

        // Use expense type with debt_id for proper routing to debt transaction API
        const success = await createFlow({
          type: 'expense',
          amount: paymentAmount,
          currency: form.currency,
          from_asset_id: form.payDebtSourceType === 'cash' ? form.fromAssetId : null,
          debt_id: form.debtId,
          category: 'pay_debt',
          date: form.date,
          description: form.description || (form.payDebtSourceType === 'external' ? `Payment from ${form.payDebtExternalName || 'external source'}` : undefined),
          recurring_frequency: form.recurringFrequency !== 'none' ? form.recurringFrequency : undefined,
          metadata,
        });

        if (success) {
          toast.success('Payment recorded');
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          toast.error('Failed to record payment');
        }
        setLoading(false);
        return; // Early return - pay debt handled
      }

      // Handle deposit flow (to existing or new deposit account)
      // Uses 'add' type in assetTransactionApi to create a single transaction
      if (selectedPreset.id === 'deposit') {
        // Edit mode: Update existing deposit asset
        if (isEditMode && editAssetId) {
          const depositAmount = parseFloat(form.amount);
          const interestRate = parseFloat(form.interestRate);

          // Update the asset with new values
          const updateData: UpdateAssetData = {
            name: newAsset.name.trim(),
            currency: form.currency,
            balance: depositAmount,
            metadata: {
              interest_rate: interestRate > 0 ? interestRate / 100 : undefined,
              payment_period: form.interestPaymentPeriod,
            },
          };

          const updateResult = await assetApi.update(editAssetId, updateData);

          if (updateResult.success) {
            // Also update interest settings if rate was provided
            if (interestRate > 0) {
              try {
                await assetInterestSettingsApi.upsert(editAssetId, {
                  interest_rate: interestRate / 100,
                  payment_period: form.interestPaymentPeriod,
                });
                await mutateAssetInterestSettings();
              } catch (err) {
                console.error('Failed to save interest settings:', err);
              }
            }

            await mutateAssets();
            toast.success('Deposit updated');
            onSubmitSuccess?.();
            onOpenChange(false);
          } else {
            toast.error('Failed to update deposit');
          }
          setLoading(false);
          return;
        }

        // Create mode: Validate deposit account is selected
        if (!finalToAssetId) {
          setFormErrors(prev => ({ ...prev, toAsset: 'Select deposit account' }));
          setLoading(false);
          return;
        }

        const depositAmount = parseFloat(form.amount);

        // Add interest rate to metadata if provided (for new deposits)
        const interestRate = parseFloat(form.interestRate);
        if (interestRate > 0) {
          metadata.interest_rate = interestRate / 100; // Store as decimal
          metadata.payment_period = form.interestPaymentPeriod;
        }

        // Use transfer if from cash, otherwise use income API
        // The APIs handle balance updates atomically - no manual balance update needed
        const depositFlowType = finalFromAssetId ? 'transfer' : 'income';

        const success = await createFlow({
          type: depositFlowType,
          amount: depositAmount,
          currency: form.currency,
          from_asset_id: finalFromAssetId || null,
          to_asset_id: finalToAssetId,
          category: 'deposit',
          date: form.date,
          description: form.description || (finalFromAssetId ? 'Transfer to deposit' : 'Deposit'),
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        if (success) {
          await mutateAssets();
          toast.success('Deposit recorded');
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          toast.error('Failed to record deposit');
        }
        setLoading(false);
        return; // Early return - deposit handled
      }

      // Handle sell flow with asset updates
      if (selectedPreset.id === 'sell') {
        const soldAsset = assets.find(a => a.id === form.fromAssetId);
        const isShareBased = soldAsset && ['stock', 'etf', 'crypto', 'bond'].includes(soldAsset.type);
        const isRealEstate = soldAsset?.type === 'real_estate';

        const success = await createFlow({
          type: 'transfer',
          amount: finalAmount,
          currency: form.currency,
          from_asset_id: form.fromAssetId || null,
          to_asset_id: form.toAssetId || null,
          category: 'sell',
          date: form.date,
          description: form.description || `Sold ${soldAsset?.name || 'asset'}`,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        if (success && soldAsset) {
          // Update asset after sale
          const { assetApi } = await import('@/lib/fire/api');

          // Calculate realized P/L for asset update
          const realizedPL = (metadata.realized_pl as number) || 0;
          const currentTotalPL = soldAsset.total_realized_pl || 0;
          const newTotalPL = currentTotalPL + realizedPL;

          if (isShareBased) {
            // Reduce shares for share-based assets
            const sharesSold = parseFloat(form.shares) || 0;
            const newBalance = soldAsset.balance - sharesSold;

            if (newBalance <= 0) {
              // All shares sold
              await assetApi.update(soldAsset.id, {
                balance: 0,
                total_realized_pl: newTotalPL,
              });
              toast.success(`Sold all shares of ${soldAsset.name}`);
            } else {
              await assetApi.update(soldAsset.id, {
                balance: newBalance,
                total_realized_pl: newTotalPL,
              });
              toast.success(`Sold ${sharesSold} shares of ${soldAsset.name}`);
            }
          } else if (isRealEstate && form.sellMarkAsSold) {
            // Mark real estate as sold (set balance to 0)
            await assetApi.update(soldAsset.id, {
              balance: 0,
              total_realized_pl: newTotalPL,
            });
            toast.success(`${soldAsset.name} marked as sold`);
          } else {
            // Other asset types - just update P/L
            if (realizedPL !== 0) {
              await assetApi.update(soldAsset.id, {
                total_realized_pl: newTotalPL,
              });
            }
            toast.success('Sale recorded');
          }

          // Refresh assets cache to update dashboard
          await mutateAssets();
          onSubmitSuccess?.();
          onOpenChange(false);
        } else if (!success) {
          toast.error('Failed to record sale');
        }

        setLoading(false);
        return; // Early return - sell handled
      }

      // Handle reinvest flow (DRIP - dividend reinvestment into same stock)
      if (selectedPreset.id === 'reinvest') {
        const asset = assets.find(a => a.id === form.fromAssetId);
        const sharesAcquired = parseFloat(form.shares) || 0;
        const amount = parseFloat(form.amount) || 0;

        // Validate: shares required for DRIP
        if (sharesAcquired <= 0) {
          setFormErrors(prev => ({ ...prev, shares: 'Shares required' }));
          setLoading(false);
          return;
        }

        // Calculate price per share
        const pricePerShare = amount / sharesAcquired;

        // Add reinvest metadata
        metadata.shares = sharesAcquired;
        metadata.price_per_share = pricePerShare;
        metadata.ticker = asset?.ticker;

        // Use income API for logging (not transfer, which rejects same from/to)
        // Balance update is handled manually below
        const success = await createFlow({
          type: 'income',
          amount: amount,
          currency: form.currency,
          from_asset_id: form.fromAssetId || null,  // Reference to the stock (context)
          to_asset_id: form.fromAssetId || null,    // Shares added to same stock
          category: 'reinvest',
          date: form.date,
          description: form.description || `DRIP - ${asset?.ticker || asset?.name}`,
          metadata,
        });

        if (success && asset) {
          // Add shares to the asset
          const newBalance = asset.balance + sharesAcquired;
          await assetApi.update(asset.id, { balance: newBalance });
          await mutateAssets();
          toast.success(`Reinvested ${sharesAcquired} shares into ${asset.ticker || asset.name}`);
          onSubmitSuccess?.();
          onOpenChange(false);
        } else if (!success) {
          toast.error('Failed to record reinvestment');
        }

        setLoading(false);
        return; // Early return - reinvest handled
      }

      // Handle 'other' flow (custom from/to with external source support)
      if (selectedPreset.id === 'other') {
        const amount = parseFloat(form.amount) || 0;

        // Validate: must have a source
        if (form.fromType === 'external' && !form.fromExternalName.trim()) {
          setFormErrors(prev => ({ ...prev, fromAsset: 'Source name required' }));
          setLoading(false);
          return;
        }
        if (form.fromType === 'asset' && !form.fromAssetId) {
          setFormErrors(prev => ({ ...prev, fromAsset: 'Source asset required' }));
          setLoading(false);
          return;
        }

        // Validate: must have destination asset
        if (!form.toAssetId) {
          setFormErrors(prev => ({ ...prev, toAsset: 'Destination required' }));
          setLoading(false);
          return;
        }

        // Determine flow type: income if from external, transfer if from asset
        const otherFlowType = form.fromType === 'external' ? 'income' : 'transfer';

        // Store external source name in metadata
        if (form.fromType === 'external' && form.fromExternalName.trim()) {
          metadata.source_name = form.fromExternalName.trim();
        }

        // Use passive_other category if marked as passive income
        const otherCategory = form.isPassiveIncome && form.fromType === 'external' ? 'passive_other' : 'other';

        const success = await createFlow({
          type: otherFlowType,
          amount: amount,
          currency: form.currency,
          from_asset_id: form.fromType === 'asset' ? form.fromAssetId : null,
          to_asset_id: form.toAssetId,
          category: otherCategory,
          date: form.date,
          description: form.description || (form.fromType === 'external' ? `From ${form.fromExternalName}` : undefined),
          recurring_frequency: form.recurringFrequency !== 'none' ? form.recurringFrequency : undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        if (success) {
          toast.success('Flow recorded');
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          toast.error('Failed to record flow');
        }

        setLoading(false);
        return; // Early return - other handled
      }

      // Handle invest flow - create flow and update asset balance (shares or value) in transaction
      if (selectedPreset.id === 'invest') {
        // For metals, use converted weight; for others, use raw shares
        const sharesAcquired = isMetalsInvestment ? metalWeightToAdd : (parseFloat(form.shares) || 0);
        const amount = parseFloat(form.amount) || 0;

        // Check if this is a real estate or value-based investment (no shares)
        const isValueBasedInvestment = form.investmentType === 'real_estate' || form.investmentType === 'other';
        const currentValue = parseFloat(form.currentValue) || 0;

        // Validate: shares required for share-based investments, currentValue required for value-based
        if (!isValueBasedInvestment && sharesAcquired <= 0) {
          setFormErrors(prev => ({ ...prev, shares: 'Shares required' }));
          setLoading(false);
          return;
        }
        if (isValueBasedInvestment && currentValue <= 0) {
          setFormErrors(prev => ({ ...prev, currentValue: 'Current value required' }));
          setLoading(false);
          return;
        }

        // Add metal-specific metadata (weight & unit)
        if (isMetalsInvestment) {
          // Find the existing asset's unit (or use form unit for new asset)
          const existingAsset = assets.find(
            (a) => a.type === 'metals' &&
                   (a.metadata as { metal_type?: string } | null)?.metal_type === form.metalType
          );
          const targetUnit = existingAsset
            ? ((existingAsset.metadata as { metal_unit?: MetalUnit } | null)?.metal_unit || 'gram')
            : form.metalUnit;

          metadata.weight = metalWeightToAdd;
          metadata.unit = targetUnit;
          metadata.metal_type = form.metalType;
          // Also store original input for reference
          metadata.input_weight = parseFloat(form.shares) || 0;
          metadata.input_unit = form.metalUnit;
        }

        // Use assetTransactionApi directly to get flow ID for potential rollback
        const txnResponse = await assetTransactionApi.create({
          type: 'invest',
          amount: amount,
          ticker: form.selectedTicker || undefined,
          shares: sharesAcquired,
          from_asset_id: finalFromAssetId || undefined,
          to_asset_id: finalToAssetId || undefined,
          currency: form.currency,
          date: form.date,
          description: form.description || `Investment in ${form.selectedTickerName || form.selectedTicker || 'asset'}`,
          metadata,
        });

        if (!txnResponse.success || !txnResponse.data) {
          await rollbackTransaction();
          toast.error('Failed to record investment');
          setLoading(false);
          return;
        }

        // Track flow for potential rollback
        createdFlowIds.push(txnResponse.data.flow_id);

        // Note: Backend handleInvest already updates asset balance (adds shares)
        // For value-based assets (real_estate, other), we need to SET balance to currentValue
        const assetToUpdate = assets.find(a => a.id === finalToAssetId);
        const isValueBased = assetToUpdate?.type === 'real_estate';
        if (isValueBased && finalToAssetId) {
          const currentValueNum = parseFloat(form.currentValue) || amount;
          const balanceResponse = await assetApi.update(finalToAssetId, { balance: currentValueNum });
          if (!balanceResponse.success) {
            await rollbackTransaction();
            toast.error('Failed to update value - transaction rolled back');
            setLoading(false);
            return;
          }
        }

        // All succeeded - refresh caches
        await mutateAssets();
        toast.success(`Invested in ${form.selectedTickerName || form.selectedTicker || 'asset'}`);
        onSubmitSuccess?.();
        onOpenChange(false);
        setLoading(false);
        return; // Early return - invest handled
      }

      // When recurringOnly mode, create only the recurring schedule (no flow)
      if (recurringOnly) {
        // Check if date is today - if so, show confirmation dialog
        const today = new Date().toISOString().split('T')[0];
        if (form.date === today && !showStartDateConfirm) {
          setShowStartDateConfirm(true);
          setLoading(false);
          return;
        }

        // Calculate next run date based on user's choice
        // If showStartDateConfirm is true and we're here, user chose "next occurrence"
        // So we need to calculate the next date after today
        let nextRunDate = form.date;
        if (showStartDateConfirm) {
          // User chose "start next occurrence" - calculate next date
          const startDate = new Date(form.date);
          switch (form.recurringFrequency) {
            case 'weekly':
              startDate.setDate(startDate.getDate() + 7);
              break;
            case 'biweekly':
              startDate.setDate(startDate.getDate() + 14);
              break;
            case 'monthly':
              startDate.setMonth(startDate.getMonth() + 1);
              break;
            case 'quarterly':
              startDate.setMonth(startDate.getMonth() + 3);
              break;
            case 'yearly':
              startDate.setFullYear(startDate.getFullYear() + 1);
              break;
          }
          nextRunDate = startDate.toISOString().split('T')[0];
        }

        const scheduleResponse = await recurringScheduleApi.create({
          frequency: form.recurringFrequency as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
          next_run_date: nextRunDate,
          transaction_template: {
            type: flowType,
            amount: finalAmount,
            currency: form.currency,
            from_asset_id: form.fromType === 'asset' ? finalFromAssetId || null : null,
            to_asset_id: form.toType === 'asset' ? finalToAssetId || null : null,
            debt_id: null,
            category: selectedPreset.id,
            description: form.description || null,
            expense_category_id: selectedPreset.id === 'expense' ? form.expenseCategoryId || null : null,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          },
        });

        if (scheduleResponse.success) {
          await mutateRecurringSchedules();
          toast.success('Recurring schedule created');
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          await rollbackTransaction();
          toast.error(scheduleResponse.error || 'Failed to create recurring schedule');
        }
      } else {
        // Normal flow creation (with optional recurring)
        const success = await createFlow({
          type: flowType,
          amount: finalAmount,
          currency: form.currency,
          from_asset_id: form.fromType === 'asset' ? finalFromAssetId || null : null,
          to_asset_id: form.toType === 'asset' ? finalToAssetId || null : null,
          category: selectedPreset.id,
          date: form.date,
          description: form.description || undefined,
          recurring_frequency: form.recurringFrequency !== 'none' ? form.recurringFrequency : undefined,
          flow_expense_category_id: selectedPreset.id === 'expense' ? form.expenseCategoryId : undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        if (success) {
          onSubmitSuccess?.();
          onOpenChange(false);
        } else {
          await rollbackTransaction();
          toast.error('Failed to create flow');
        }
      }
    } catch {
      await rollbackTransaction();
      toast.error('Failed to create flow');
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, form, newAsset.show, assets, handleCreateAsset, createFlow, createAsset, onOpenChange, taxSettings, linkedLedgers, recurringOnly, showStartDateConfirm, noAssetInterest, onSubmitSuccess]);

  // Handle "Start from today" choice - creates both flow and schedule
  const handleStartToday = useCallback(async () => {
    if (!selectedPreset) return;

    setLoading(true);
    setShowStartDateConfirm(false);

    try {
      // Determine final asset IDs (same logic as handleSubmit)
      let finalFromAssetId = form.fromAssetId;
      let finalToAssetId = form.toAssetId;

      // Auto-select single matching asset when field is hidden
      if (!finalFromAssetId && selectedPreset.from.type === 'asset' && selectedPreset.from.assetFilter) {
        const filtered = assets.filter(a => selectedPreset.from.assetFilter!.includes(a.type));
        if (filtered.length === 1) {
          finalFromAssetId = filtered[0].id;
        }
      }
      if (!finalToAssetId && selectedPreset.to.type === 'asset' && selectedPreset.to.assetFilter) {
        const filtered = assets.filter(a => selectedPreset.to.assetFilter!.includes(a.type));
        if (filtered.length === 1) {
          finalToAssetId = filtered[0].id;
        }
      }

      const flowType = selectedPreset.flowType;
      const amount = parseFloat(form.amount);
      const metadata: Record<string, unknown> = {};

      if (form.fromType === 'external' && form.fromExternalName) {
        metadata.source_name = form.fromExternalName;
      }

      const success = await createFlow({
        type: flowType,
        amount,
        currency: form.currency,
        from_asset_id: form.fromType === 'asset' ? finalFromAssetId || null : null,
        to_asset_id: form.toType === 'asset' ? finalToAssetId || null : null,
        category: selectedPreset.id,
        date: form.date,
        description: form.description || undefined,
        recurring_frequency: form.recurringFrequency !== 'none' ? form.recurringFrequency : undefined,
        flow_expense_category_id: selectedPreset.id === 'expense' ? form.expenseCategoryId : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      if (success) {
        await mutateRecurringSchedules();
        toast.success('Flow created with recurring schedule');
        onSubmitSuccess?.();
        onOpenChange(false);
      } else {
        toast.error('Failed to create flow');
      }
    } catch {
      toast.error('Failed to create flow');
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, form, assets, createFlow, onOpenChange, onSubmitSuccess]);

  // Handle "Start from next occurrence" choice
  const handleStartNextOccurrence = useCallback(() => {
    // Just call handleSubmit - it will see showStartDateConfirm is true and use next date
    handleSubmit();
  }, [handleSubmit]);

  // Filter assets based on preset configuration
  const getFilteredAssets = useCallback((
    config: FlowCategoryPreset['from'] | FlowCategoryPreset['to'],
    excludeId?: string
  ): AssetWithBalance[] => {
    let filtered = assets;

    if (config.assetFilter) {
      filtered = filtered.filter((a) => config.assetFilter!.includes(a.type));
    }

    if (excludeId) {
      filtered = filtered.filter((a) => a.id !== excludeId);
    }

    return filtered;
  }, [assets]);

  // Memoized filtered asset lists
  const filteredFromAssets = useMemo(() => {
    if (!selectedPreset) return [];
    return getFilteredAssets(selectedPreset.from);
  }, [selectedPreset, getFilteredAssets]);

  const filteredToAssets = useMemo(() => {
    if (!selectedPreset) return [];
    // For reinvest, don't exclude the from asset (allow DRIP - same asset)
    const excludeId = selectedPreset.id === 'reinvest' ? undefined : form.fromAssetId;
    return getFilteredAssets(selectedPreset.to, excludeId);
  }, [selectedPreset, form.fromAssetId, getFilteredAssets]);

  // Cash assets for interest withdrawal and debt payment
  const cashAssets = useMemo(() => {
    return assets.filter((a) => a.type === 'cash');
  }, [assets]);

  // Note: Debts are now in a separate table, not assets
  // The PayDebtFlowForm component uses useDebts() hook directly

  // Memoized visibility checks
  const showFromField = useMemo(() => {
    if (!selectedPreset) return false;
    if (selectedPreset.from.type === 'user_select' && selectedPreset.flowType === 'income') return false;
    // Always show property selector for rental (even if only 1 property)
    if (selectedPreset.id === 'rental') return true;
    if (selectedPreset.from.type === 'asset' && selectedPreset.from.assetFilter && filteredFromAssets.length === 1) return false;
    return true;
  }, [selectedPreset, filteredFromAssets.length]);

  const showToField = useMemo(() => {
    if (!selectedPreset) return false;
    if (selectedPreset.to.type === 'same_as_from') return false;
    if (selectedPreset.to.type === 'asset' && selectedPreset.to.assetFilter && filteredToAssets.length === 1) return false;
    return true;
  }, [selectedPreset, filteredToAssets.length]);

  // Computed price per share for invest flow
  const computedPricePerShare = useMemo(() => {
    if (selectedPreset?.id !== 'invest') return null;
    const amount = parseFloat(form.amount) || 0;
    const shares = parseFloat(form.shares) || 0;
    if (shares === 0 || amount === 0) return null;
    return (amount / shares).toFixed(4);
  }, [selectedPreset?.id, form.amount, form.shares]);

  // Check if using stock investment type (US or SGX)
  const isStockInvestment = selectedPreset?.id === 'invest' &&
    (form.investmentType === 'us_stock' || form.investmentType === 'sgx_stock');

  // Get the market region for stock search
  const stockMarket = form.investmentType === 'sgx_stock' ? 'SG' : 'US';

  // Keep backwards compatible alias
  const isUsStockInvestment = isStockInvestment;

  // Handle investment type change
  const handleInvestmentTypeChange = useCallback((type: InvestmentType) => {
    const config = getInvestmentTypeConfig(type);
    updateForm('investmentType', type);
    if (config?.currency) {
      updateForm('currency', config.currency);
    }
    // Clear all form fields when switching market/type
    updateForm('selectedTicker', '');
    updateForm('selectedTickerName', '');
    updateForm('amount', '');
    updateForm('shares', '');
    updateForm('currentValue', '');
  }, [updateForm]);

  // Handle stock ticker selection
  const handleTickerSelect = useCallback((ticker: string, name: string) => {
    updateForm('selectedTicker', ticker);
    updateForm('selectedTickerName', name);
  }, [updateForm]);

  return {
    // State
    step,
    setStep,
    selectedPreset,
    loading,
    expenseTab,
    setExpenseTab,
    savingLinkedLedgers,
    form,
    formErrors,
    newAsset,
    linkedLedgers, // Derived from form or cache
    showStartDateConfirm, // For recurring-only mode when date is today

    // Computed
    filteredFromAssets,
    filteredToAssets,
    cashAssets,
    allAssets: assets, // All assets for "other" flow form
    showFromField,
    showToField,
    computedPricePerShare,
    isUsStockInvestment,
    isStockInvestment,
    stockMarket,
    interestSettingsMap,

    // Actions
    updateForm,
    updateNewAsset,
    handleCategorySelect,
    handleSaveLinkedLedgers,
    handleSubmit,
    handleInvestmentTypeChange,
    handleTickerSelect,
    resetForm,
    initializeWithCategory,
    handleStartToday,
    handleStartNextOccurrence,
  };
}
