'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  retro,
  retroStyles,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Loader,
  IconUpload,
  IconCheck,
  IconX,
  IconWarning,
} from '@/components/fire/ui';
import { assetApi, ExtractedAsset } from '@/lib/fire/api';
import type { AssetType } from '@/types/fire';

interface ImportAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

type DialogStep = 'upload' | 'analyzing' | 'preview' | 'importing';
type DuplicateAction = 'skip' | 'update' | 'create';

interface PreviewAsset extends ExtractedAsset {
  selected: boolean;
  duplicateAction: DuplicateAction;
  existingAsset?: { asset_id: string; name: string; balance: number };
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  deposit: 'Deposit',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  other: 'Other',
};

const SUPPORTED_FILE_TYPES = ['pdf', 'csv', 'xlsx'] as const;
type FileType = (typeof SUPPORTED_FILE_TYPES)[number];

export function ImportAssetsDialog({
  open,
  onOpenChange,
  onImported,
}: ImportAssetsDialogProps) {
  const [step, setStep] = useState<DialogStep>('upload');
  const [previewAssets, setPreviewAssets] = useState<PreviewAsset[]>([]);
  const [sourceInfo, setSourceInfo] = useState<{
    broker: string | null;
    statement_date: string | null;
    account_type: string | null;
  } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setPreviewAssets([]);
    setSourceInfo(null);
    setWarnings([]);
    setConfidence(0);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  const getFileType = (file: File): FileType | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    return null;
  };

  const handleFile = async (file: File) => {
    const fileType = getFileType(file);
    if (!fileType) {
      toast.error('Unsupported file type. Please upload a PDF, CSV, or Excel file.');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setStep('analyzing');

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call analyze API
      const response = await assetApi.analyzeImport({
        file: base64,
        fileType,
        fileName: file.name,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze file');
      }

      const { extracted, source_info, warnings: responseWarnings, confidence: responseConfidence, existing_tickers } = response.data;

      if (extracted.length === 0) {
        toast.error('No assets found in the file. Please try a different file.');
        setStep('upload');
        return;
      }

      // Convert extracted assets to preview assets
      const preview: PreviewAsset[] = extracted.map((asset) => {
        const tickerKey = asset.ticker?.toUpperCase();
        const existing = tickerKey ? existing_tickers[tickerKey] : undefined;
        return {
          ...asset,
          selected: true,
          duplicateAction: existing ? 'update' : 'create',
          existingAsset: existing,
        };
      });

      setPreviewAssets(preview);
      setSourceInfo(source_info);
      setWarnings(responseWarnings);
      setConfidence(responseConfidence);
      setStep('preview');
    } catch (error) {
      console.error('Import analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze file');
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const toggleAssetSelection = (index: number) => {
    setPreviewAssets((prev) =>
      prev.map((asset, i) =>
        i === index ? { ...asset, selected: !asset.selected } : asset
      )
    );
  };

  const setDuplicateAction = (index: number, action: DuplicateAction) => {
    setPreviewAssets((prev) =>
      prev.map((asset, i) =>
        i === index ? { ...asset, duplicateAction: action } : asset
      )
    );
  };

  const handleConfirmImport = async () => {
    const selectedAssets = previewAssets.filter((a) => a.selected);
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset to import');
      return;
    }

    setStep('importing');

    try {
      // Build duplicate actions map
      const duplicateActions: Record<string, DuplicateAction> = {};
      selectedAssets.forEach((asset) => {
        if (asset.ticker) {
          duplicateActions[asset.ticker.toUpperCase()] = asset.duplicateAction;
        }
      });

      // Call confirm API
      const response = await assetApi.confirmImport({
        assets: selectedAssets.map((a) => ({
          name: a.name,
          type: a.type,
          ticker: a.ticker,
          shares: a.shares,
          currency: a.currency,
          market: a.market,
        })),
        duplicate_actions: duplicateActions,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to import assets');
      }

      const { created, updated, skipped } = response.data;
      const messages: string[] = [];
      if (created > 0) messages.push(`${created} created`);
      if (updated > 0) messages.push(`${updated} updated`);
      if (skipped > 0) messages.push(`${skipped} skipped`);

      toast.success(`Import complete: ${messages.join(', ')}`);
      onImported?.();
      handleOpenChange(false);
    } catch (error) {
      console.error('Import confirm error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import assets');
      setStep('preview');
    }
  };

  const selectedCount = previewAssets.filter((a) => a.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Assets</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: retro.muted }}>
                Upload a brokerage statement (PDF, CSV, or Excel) to automatically extract your holdings.
              </p>

              <div
                className={`
                  border-2 border-dashed rounded-sm p-8
                  flex flex-col items-center justify-center gap-3
                  cursor-pointer transition-colors
                `}
                style={{
                  borderColor: dragActive ? retro.accent : retro.border,
                  backgroundColor: dragActive ? retro.surfaceLight : 'transparent',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <span style={{ color: retro.muted }}>
                  <IconUpload size={32} />
                </span>
                <p className="text-sm" style={{ color: retro.text }}>
                  Drop file here or click to browse
                </p>
                <p className="text-xs" style={{ color: retro.muted }}>
                  Supports: PDF, CSV, Excel (max 10MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Analyzing Step */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader size="lg" variant="bar" />
              <p className="text-sm" style={{ color: retro.text }}>
                Analyzing your statement...
              </p>
              <p className="text-xs" style={{ color: retro.muted }}>
                This may take a moment
              </p>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Source Info */}
              {sourceInfo && (sourceInfo.broker || sourceInfo.statement_date) && (
                <div
                  className="text-xs px-3 py-2 rounded-sm"
                  style={{ backgroundColor: retro.surfaceLight, color: retro.muted }}
                >
                  {sourceInfo.broker && <span>Broker: {sourceInfo.broker}</span>}
                  {sourceInfo.broker && sourceInfo.statement_date && <span> • </span>}
                  {sourceInfo.statement_date && <span>Date: {sourceInfo.statement_date}</span>}
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div
                  className="text-xs px-3 py-2 rounded-sm flex items-start gap-2"
                  style={{ backgroundColor: `${retro.warning}20`, color: retro.warning }}
                >
                  <IconWarning size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    {warnings.map((warning, i) => (
                      <p key={i}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence indicator */}
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: retro.muted }}>Extraction confidence:</span>
                <span
                  style={{
                    color:
                      confidence >= 0.8
                        ? retro.positive
                        : confidence >= 0.5
                          ? retro.warning
                          : retro.negative,
                  }}
                >
                  {Math.round(confidence * 100)}%
                </span>
              </div>

              {/* Assets Table */}
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: `2px solid ${retro.border}` }}
              >
                {/* Table Header */}
                <div
                  className="grid grid-cols-[32px_1fr_70px_80px_70px_100px] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: retro.bevelMid,
                    color: retro.text,
                    borderBottom: `2px solid ${retro.border}`,
                  }}
                >
                  <div></div>
                  <div>Name</div>
                  <div>Type</div>
                  <div className="text-right">Shares</div>
                  <div>Currency</div>
                  <div>Status</div>
                </div>

                {/* Table Body */}
                <div
                  className="max-h-[300px] overflow-y-auto"
                  style={{ backgroundColor: retro.surfaceLight }}
                >
                  {previewAssets.map((asset, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[32px_1fr_70px_80px_70px_100px] gap-2 px-3 py-2 items-center text-xs"
                      style={{
                        borderBottom:
                          index < previewAssets.length - 1
                            ? `1px solid ${retro.bevelMid}`
                            : 'none',
                        opacity: asset.selected ? 1 : 0.5,
                      }}
                    >
                      {/* Checkbox */}
                      <div>
                        <button
                          onClick={() => toggleAssetSelection(index)}
                          className="w-5 h-5 rounded-sm flex items-center justify-center"
                          style={{
                            ...retroStyles.sunken,
                            backgroundColor: asset.selected ? retro.accent : retro.surface,
                            color: retro.text,
                          }}
                        >
                          {asset.selected && <IconCheck size={12} />}
                        </button>
                      </div>

                      {/* Name + Ticker */}
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: retro.text }}
                        >
                          {asset.name}
                        </p>
                        {asset.ticker && (
                          <p className="text-[10px]" style={{ color: retro.muted }}>
                            {asset.ticker}
                          </p>
                        )}
                      </div>

                      {/* Type */}
                      <div style={{ color: retro.muted }}>
                        {ASSET_TYPE_LABELS[asset.type]}
                      </div>

                      {/* Shares */}
                      <div className="text-right tabular-nums" style={{ color: retro.text }}>
                        {asset.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>

                      {/* Currency */}
                      <div style={{ color: retro.muted }}>{asset.currency}</div>

                      {/* Status / Duplicate Action */}
                      <div>
                        {asset.existingAsset ? (
                          <select
                            value={asset.duplicateAction}
                            onChange={(e) =>
                              setDuplicateAction(index, e.target.value as DuplicateAction)
                            }
                            className="text-[10px] px-1 py-0.5 rounded-sm w-full"
                            style={{
                              ...retroStyles.sunken,
                              color: retro.text,
                            }}
                          >
                            <option value="update">Update</option>
                            <option value="create">New</option>
                            <option value="skip">Skip</option>
                          </select>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-sm"
                            style={{
                              backgroundColor: retro.positive + '30',
                              color: retro.positive,
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              <p className="text-xs" style={{ color: retro.muted }}>
                {selectedCount} of {previewAssets.length} assets selected
              </p>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader size="lg" variant="bar" />
              <p className="text-sm" style={{ color: retro.text }}>
                Importing assets...
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {step === 'preview' && (
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              {step === 'preview' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0}
                >
                  Import {selectedCount} Assets
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
