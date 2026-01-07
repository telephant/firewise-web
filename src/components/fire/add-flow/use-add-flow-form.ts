'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useFlowData } from '@/contexts/fire/flow-data-context';
import type { FlowCategoryPreset, AssetWithBalance, CreateAssetData } from '@/types/fire';
import { getFlowCategoryPreset } from '@/types/fire';
import { getInvestmentTypeConfig, type InvestmentType } from './investment-type-selector';
import {
  type FlowFormState,
  type FlowFormErrors,
  type NewAssetState,
  type DialogStep,
  type ExpenseTab,
  getInitialFormState,
  getInitialNewAssetState,
} from './types';

interface UseAddFlowFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
}

export function useAddFlowForm({ open, onOpenChange, initialCategory }: UseAddFlowFormOptions) {
  const {
    assets,
    createFlow,
    createAsset,
    linkedLedgers: cachedLinkedLedgers,
    refetchLinkedLedgers,
    setLinkedLedgers: setLinkedLedgersApi,
  } = useFlowData();

  // Dialog state
  const [step, setStep] = useState<DialogStep>('category');
  const [selectedPreset, setSelectedPreset] = useState<FlowCategoryPreset | null>(null);
  const [loading, setLoading] = useState(false);
  const [expenseTab, setExpenseTab] = useState<ExpenseTab>('link');
  const [savingLinkedLedgers, setSavingLinkedLedgers] = useState(false);

  // Form state
  const [form, setForm] = useState<FlowFormState>(getInitialFormState);
  const [formErrors, setFormErrors] = useState<FlowFormErrors>({});
  const [newAsset, setNewAsset] = useState<NewAssetState>(getInitialNewAssetState);

  // Form field updater - clears related errors
  const updateForm = useCallback(<K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
  }, []);

  // New asset field updater
  const updateNewAsset = useCallback(<K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => {
    setNewAsset(prev => ({ ...prev, [field]: value }));
  }, []);

  // Load existing linked ledgers when dialog opens (uses cached data)
  useEffect(() => {
    if (open) {
      // Trigger fetch from context (will use cache if already loaded)
      refetchLinkedLedgers();
    }
  }, [open, refetchLinkedLedgers]);

  // Sync cached linked ledgers to form state when they change
  useEffect(() => {
    if (cachedLinkedLedgers.length > 0 || form.linkedLedgers.length > 0) {
      setForm(prev => ({ ...prev, linkedLedgers: cachedLinkedLedgers }));
    }
  }, [cachedLinkedLedgers]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setForm(getInitialFormState());
        setFormErrors({});
        setNewAsset(getInitialNewAssetState());
        setStep('category');
        setSelectedPreset(null);
        setExpenseTab('link');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

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
      if (preset.from.assetFilter) {
        const matchingAsset = assets.find((a) => preset.from.assetFilter!.includes(a.type));
        updates.fromAssetId = matchingAsset?.id || '';
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
      if (preset.to.assetFilter) {
        const matchingAssets = assets.filter((a) =>
          preset.to.assetFilter!.includes(a.type) && a.id !== updates.fromAssetId
        );
        updates.toAssetId = matchingAssets[0]?.id || '';
      }
    }

    setForm(prev => ({ ...prev, ...updates }));
    setStep('form');
  }, [assets]);

  // Handle initial category when dialog opens
  useEffect(() => {
    if (open && initialCategory) {
      const preset = getFlowCategoryPreset(initialCategory);
      if (preset) {
        handleCategorySelect(preset);
      }
    }
  }, [open, initialCategory, handleCategorySelect]);

  // Save linked ledgers (for Link to Ledger tab)
  const handleSaveLinkedLedgers = useCallback(async () => {
    setSavingLinkedLedgers(true);
    try {
      const ledgerIds = form.linkedLedgers.map(l => l.ledger_id);
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
  }, [form.linkedLedgers, onOpenChange, setLinkedLedgersApi]);

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

    if (!form.amount || parseFloat(form.amount) <= 0) {
      errors.amount = 'Amount is required';
    }

    // Validate US stock investment
    if (selectedPreset.id === 'invest' && form.investmentType === 'us_stock') {
      if (!form.selectedTicker) {
        errors.ticker = 'Please select a stock';
      }
      if (!form.shares || parseFloat(form.shares) <= 0) {
        errors.shares = 'Shares required';
      }
    }

    // If there are errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);

    try {
      let finalFromAssetId = form.fromAssetId;
      let finalToAssetId = form.toAssetId;

      // Auto-select from asset by filter if not set
      if (!finalFromAssetId && selectedPreset.from.type === 'asset' && selectedPreset.from.assetFilter) {
        const matchingAsset = assets.find((a) => selectedPreset.from.assetFilter!.includes(a.type));
        if (matchingAsset) finalFromAssetId = matchingAsset.id;
      }

      // Auto-select to asset by filter if not set
      if (!finalToAssetId && selectedPreset.to.type === 'asset' && selectedPreset.to.assetFilter) {
        const matchingAsset = assets.find((a) =>
          selectedPreset.to.assetFilter!.includes(a.type) && a.id !== finalFromAssetId
        );
        if (matchingAsset) finalToAssetId = matchingAsset.id;
      }

      // Handle "same_as_from" for To field
      if (selectedPreset.to.type === 'same_as_from') {
        finalToAssetId = finalFromAssetId;
      }

      // Create new assets if needed
      if (newAsset.show === 'from') {
        const newId = await handleCreateAsset();
        if (!newId) {
          setLoading(false);
          return;
        }
        finalFromAssetId = newId;
      }

      if (newAsset.show === 'to') {
        const newId = await handleCreateAsset();
        if (!newId) {
          setLoading(false);
          return;
        }
        finalToAssetId = newId;
      }

      // Handle US Stock investment - auto-create asset from ticker selection
      if (selectedPreset.id === 'invest' && form.investmentType === 'us_stock') {
        const existingAsset = assets.find(
          (a) => a.ticker?.toUpperCase() === form.selectedTicker.toUpperCase()
        );

        if (existingAsset) {
          finalToAssetId = existingAsset.id;
        } else {
          const stockAsset = await createAsset({
            name: form.selectedTickerName || form.selectedTicker,
            type: 'stock',
            ticker: form.selectedTicker,
            currency: 'USD',
            market: 'US',
          });

          if (!stockAsset) {
            toast.error('Failed to create stock asset');
            setLoading(false);
            return;
          }

          toast.success(`Asset "${stockAsset.name}" created`);
          finalToAssetId = stockAsset.id;
        }
      }

      // Validate based on flow type
      const flowType = selectedPreset.flowType;
      let hasAssetErrors = false;
      const assetErrors: FlowFormErrors = {};

      if (flowType === 'income' && form.toType === 'asset' && !finalToAssetId) {
        assetErrors.toAsset = 'Select destination';
        hasAssetErrors = true;
      }

      if (flowType === 'expense' && form.fromType === 'asset' && !finalFromAssetId) {
        assetErrors.fromAsset = 'Select source';
        hasAssetErrors = true;
      }

      if (flowType === 'transfer') {
        if (form.fromType === 'asset' && !finalFromAssetId) {
          assetErrors.fromAsset = 'Select source';
          hasAssetErrors = true;
        }
        if (form.toType === 'asset' && !finalToAssetId) {
          assetErrors.toAsset = 'Select destination';
          hasAssetErrors = true;
        }
      }

      if (hasAssetErrors) {
        setFormErrors(prev => ({ ...prev, ...assetErrors }));
        setLoading(false);
        return;
      }

      // Build metadata for extra fields
      const metadata: Record<string, unknown> = {};
      if (form.shares) metadata.shares = parseFloat(form.shares);

      // For invest flow, compute price_per_share; for other flows, use manual input
      if (selectedPreset.id === 'invest' && form.shares && form.amount) {
        const shares = parseFloat(form.shares);
        const amount = parseFloat(form.amount);
        if (shares > 0 && amount > 0) {
          metadata.price_per_share = amount / shares;
        }
      } else if (form.pricePerShare) {
        metadata.price_per_share = parseFloat(form.pricePerShare);
      }

      // Add linked ledgers to metadata if expense has linked ledgers
      if (selectedPreset.id === 'expense' && form.linkedLedgers.length > 0) {
        metadata.linked_ledgers = form.linkedLedgers;
      }

      // Add investment type info for invest flows
      if (selectedPreset.id === 'invest') {
        metadata.investment_type = form.investmentType;
        if (form.selectedTicker) {
          metadata.ticker = form.selectedTicker;
        }
      }

      const success = await createFlow({
        type: flowType,
        amount: parseFloat(form.amount),
        currency: form.currency,
        from_asset_id: form.fromType === 'asset' ? finalFromAssetId || null : null,
        to_asset_id: form.toType === 'asset' ? finalToAssetId || null : null,
        category: selectedPreset.id,
        date: form.date,
        description: form.description || undefined,
        tax_withheld: form.taxWithheld ? parseFloat(form.taxWithheld) : undefined,
        recurring_frequency: form.recurringFrequency !== 'none' ? form.recurringFrequency : undefined,
        flow_expense_category_id: selectedPreset.id === 'expense' ? form.expenseCategoryId : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      if (success) {
        toast.success('Flow created');
        onOpenChange(false);
      } else {
        toast.error('Failed to create flow');
      }
    } catch {
      toast.error('Failed to create flow');
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, form, newAsset.show, assets, handleCreateAsset, createFlow, createAsset, onOpenChange]);

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
    return getFilteredAssets(selectedPreset.to, form.fromAssetId);
  }, [selectedPreset, form.fromAssetId, getFilteredAssets]);

  // Memoized visibility checks
  const showFromField = useMemo(() => {
    if (!selectedPreset) return false;
    if (selectedPreset.from.type === 'user_select' && selectedPreset.flowType === 'income') return false;
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

  // Check if using US stock investment type
  const isUsStockInvestment = selectedPreset?.id === 'invest' && form.investmentType === 'us_stock';

  // Handle investment type change
  const handleInvestmentTypeChange = useCallback((type: InvestmentType) => {
    const config = getInvestmentTypeConfig(type);
    updateForm('investmentType', type);
    if (config?.currency) {
      updateForm('currency', config.currency);
    }
    updateForm('selectedTicker', '');
    updateForm('selectedTickerName', '');
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

    // Computed
    filteredFromAssets,
    filteredToAssets,
    showFromField,
    showToField,
    computedPricePerShare,
    isUsStockInvestment,

    // Actions
    updateForm,
    updateNewAsset,
    handleCategorySelect,
    handleSaveLinkedLedgers,
    handleSubmit,
    handleInvestmentTypeChange,
    handleTickerSelect,
  };
}
