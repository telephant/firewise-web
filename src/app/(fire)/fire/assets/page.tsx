'use client';

import { useState, useMemo } from 'react';
import {
  retro,
  Button,
  SidebarTrigger,
  IconPlus,
  IconUpload,
} from '@/components/fire/ui';
import {
  AssetTypeStats,
  AssetsTable,
  AssetDetailDialog,
  EditAssetDialog,
  DeleteAssetDialog,
  ImportAssetsDialog,
} from '@/components/fire/assets';
import { AddAssetDialog } from '@/components/fire/dashboard/add-asset-dialog';
import { AdjustBalanceDialog } from '@/components/fire/dashboard/adjust-balance-dialog';
import { useAssets, useStockPrices, useUserPreferences } from '@/hooks/fire/use-fire-data';
import type { AssetWithBalance, AssetType } from '@/types/fire';

const PAGE_SIZE = 20;

export default function AssetsPage() {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithBalance | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Filter state
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch assets
  const { assets, isLoading, mutate } = useAssets();

  // Get user preferences for currency
  const { preferences } = useUserPreferences();
  const displayCurrency = preferences?.convert_all_to_preferred
    ? preferences.preferred_currency
    : 'USD';

  // Get tickers for stock prices
  const tickers = useMemo(() => {
    return assets
      .filter((a) => ['stock', 'etf', 'crypto'].includes(a.type) && a.ticker)
      .map((a) => (a.ticker as string).toUpperCase());
  }, [assets]);

  const { prices: stockPrices } = useStockPrices(tickers);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Type filter
      if (selectedType !== 'all' && asset.type !== selectedType) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = asset.name.toLowerCase().includes(query);
        const matchesTicker = asset.ticker?.toLowerCase().includes(query);
        if (!matchesName && !matchesTicker) {
          return false;
        }
      }

      return true;
    });
  }, [assets, selectedType, searchQuery]);

  // Paginate
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, currentPage]);

  const totalPages = Math.ceil(filteredAssets.length / PAGE_SIZE);

  // Reset page when filters change
  const handleTypeChange = (type: AssetType | 'all') => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Calculate total value (use converted_balance for all assets)
  // Backend now returns converted_balance for stocks too (shares × price × exchange rate)
  const totalValue = useMemo(() => {
    return filteredAssets.reduce((sum, asset) => {
      // Use converted_balance if available (includes currency conversion)
      return sum + (asset.converted_balance ?? asset.balance);
    }, 0);
  }, [filteredAssets]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `2px solid ${retro.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: retro.text }}>
            Assets
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="gap-1.5"
          >
            <IconUpload size={12} />
            <span>Import</span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddAssetOpen(true)}
            className="gap-1.5"
          >
            <IconPlus size={12} />
            <span>Add Asset</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Asset Type Stats */}
          <AssetTypeStats
            assets={assets}
            stockPrices={stockPrices}
            isLoading={isLoading}
            onTypeClick={handleTypeChange}
            selectedType={selectedType}
            currency={displayCurrency}
          />

          {/* Assets Table */}
          <AssetsTable
            assets={paginatedAssets}
            stockPrices={stockPrices}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredAssets.length}
            totalValue={totalValue}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            currency={displayCurrency}
            onRowClick={(asset) => {
              setSelectedAsset(asset);
              setIsDetailOpen(true);
            }}
            onEdit={(asset) => {
              setSelectedAsset(asset);
              setIsEditOpen(true);
            }}
            onAdjust={(asset) => {
              setSelectedAsset(asset);
              setIsAdjustOpen(true);
            }}
            onDelete={(asset) => {
              setSelectedAsset(asset);
              setIsDeleteOpen(true);
            }}
          />
        </div>
      </main>

      {/* Add Asset Dialog */}
      <AddAssetDialog
        open={isAddAssetOpen}
        onOpenChange={setIsAddAssetOpen}
      />

      {/* Edit Asset Dialog */}
      <EditAssetDialog
        asset={selectedAsset}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={() => mutate()}
      />

      {/* Asset Detail Dialog */}
      <AssetDetailDialog
        asset={selectedAsset}
        stockPrices={stockPrices}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(asset) => {
          setIsDetailOpen(false);
          setSelectedAsset(asset);
          setIsEditOpen(true);
        }}
        onAdjust={(asset) => {
          setIsDetailOpen(false);
          setSelectedAsset(asset);
          setIsAdjustOpen(true);
        }}
        onDelete={(asset) => {
          setIsDetailOpen(false);
          setSelectedAsset(asset);
          setIsDeleteOpen(true);
        }}
      />

      {/* Adjust Balance Dialog */}
      <AdjustBalanceDialog
        asset={selectedAsset}
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
      />

      {/* Delete Asset Dialog */}
      <DeleteAssetDialog
        asset={selectedAsset}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => {
          mutate();
        }}
      />

      {/* Import Assets Dialog */}
      <ImportAssetsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={() => mutate()}
      />
    </div>
  );
}
