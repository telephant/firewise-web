'use client';

import { useState, useMemo } from 'react';
import {
  colors,
  Button,
  SidebarTrigger,
  IconPlus,
  IconUpload,
} from '@/components/fire/ui';
import {
  AssetAllocationBar,
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
import { useUrlFilters } from '@/hooks/fire/use-url-filters';
import type { AssetWithBalance, AssetType, AssetSortField, SortOrder } from '@/types/fire';

const PAGE_SIZE = 20;
const VALID_ASSET_TYPES: AssetType[] = ['cash', 'deposit', 'stock', 'etf', 'bond', 'real_estate', 'crypto', 'other'];

export default function AssetsPage() {
  // URL-based filters
  const { filters, setType, setSearch, setPage } = useUrlFilters<AssetType>({
    validTypes: VALID_ASSET_TYPES,
  });

  const selectedType = filters.type;
  const searchQuery = filters.search;
  const currentPage = filters.page;

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithBalance | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Sort state (default to balance/% descending)
  const [sortBy, setSortBy] = useState<AssetSortField>('balance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    const filtered = assets.filter((asset) => {
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

    // Sort assets
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'balance':
          // Use converted_balance for comparison when available
          const aValue = a.converted_balance ?? a.balance;
          const bValue = b.converted_balance ?? b.balance;
          comparison = aValue - bValue;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [assets, selectedType, searchQuery, sortBy, sortOrder]);

  // Paginate
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, currentPage]);

  const totalPages = Math.ceil(filteredAssets.length / PAGE_SIZE);

  // Filter handlers - update URL
  const handleTypeChange = (type: AssetType | 'all') => {
    setType(type);
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
  };

  const handleSort = (field: AssetSortField) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc for balance, asc for others
      setSortBy(field);
      setSortOrder(field === 'balance' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // Calculate total value (use converted_balance for all assets)
  const totalValue = useMemo(() => {
    return filteredAssets.reduce((sum, asset) => {
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
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>
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
        <div className={isFullscreen ? 'h-full' : 'max-w-5xl mx-auto space-y-4'}>
          {/* Row 1: Allocation Bar - hidden in fullscreen */}
          {!isFullscreen && (
            <AssetAllocationBar
              assets={assets}
              isLoading={isLoading}
              currency={displayCurrency}
            />
          )}

          {/* Row 2: Quick Filter Buttons - hidden in fullscreen */}
          {!isFullscreen && (
            <AssetTypeStats
              assets={assets}
              stockPrices={stockPrices}
              isLoading={isLoading}
              onTypeClick={handleTypeChange}
              selectedType={selectedType}
              currency={displayCurrency}
            />
          )}

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
            onPageChange={setPage}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            currency={displayCurrency}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
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
