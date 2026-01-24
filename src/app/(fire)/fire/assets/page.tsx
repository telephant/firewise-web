'use client';

import { useState, useMemo } from 'react';
import {
  retro,
  Button,
  SidebarTrigger,
  IconPlus,
  IconUpload,
  RetroPieChart,
  Card,
} from '@/components/fire/ui';
import type { PieSegment } from '@/components/fire/ui';
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
import { formatCurrency } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType, AssetSortField, SortOrder } from '@/types/fire';

const PAGE_SIZE = 20;

const CATEGORY_COLORS: Record<AssetType, string> = {
  cash: '#2a7848',       // Green (retro.positive)
  deposit: '#385898',    // Blue (retro.info)
  stock: '#c86428',      // Orange (retro.accent)
  etf: '#e89050',        // Light orange (retro.accentLight)
  bond: '#b08020',       // Gold (retro.warning)
  real_estate: '#8b5a2b', // Brown
  crypto: '#9b59b6',     // Purple
  other: '#5a5a6a',      // Gray (retro.muted)
};

const CATEGORY_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  deposit: 'Deposit',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  other: 'Other',
};

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

  // Sort state (default to balance/% descending)
  const [sortBy, setSortBy] = useState<AssetSortField>('balance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  // Reset page when filters change
  const handleTypeChange = (type: AssetType | 'all') => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
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

  // Calculate pie chart data (use all assets, not filtered)
  const { outerPieData, innerPieData } = useMemo(() => {
    // Group assets by type
    const grouped: Record<string, AssetWithBalance[]> = {};
    assets.forEach((asset) => {
      if (!grouped[asset.type]) {
        grouped[asset.type] = [];
      }
      grouped[asset.type].push(asset);
    });

    const outer: PieSegment[] = [];
    const inner: PieSegment[] = [];

    Object.entries(grouped).forEach(([type, typeAssets]) => {
      const assetType = type as AssetType;
      const typeTotal = typeAssets.reduce(
        (sum, a) => sum + (a.converted_balance ?? a.balance),
        0
      );

      if (typeTotal > 0) {
        outer.push({
          name: CATEGORY_LABELS[assetType],
          value: typeTotal,
          color: CATEGORY_COLORS[assetType],
        });

        typeAssets.forEach((asset) => {
          const value = asset.converted_balance ?? asset.balance;
          if (value > 0) {
            inner.push({
              name: asset.name,
              value,
              color: CATEGORY_COLORS[assetType] + 'cc', // 80% opacity
            });
          }
        });
      }
    });

    return { outerPieData: outer, innerPieData: inner };
  }, [assets]);

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
          {/* Pie Chart + Asset Type Stats */}
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
            {/* Pie Chart */}
            <Card className="p-4">
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: retro.text }}
              >
                Allocation
              </h3>
              {!isLoading && assets.length > 0 ? (
                <RetroPieChart
                  outerData={outerPieData}
                  innerData={innerPieData}
                  size={180}
                  showLegend={false}
                  valueFormatter={(v) => formatCurrency(v, { currency: displayCurrency, compact: true })}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-xs"
                  style={{ color: retro.muted, height: 180 }}
                >
                  {isLoading ? 'Loading...' : 'No assets'}
                </div>
              )}
            </Card>

            {/* Asset Type Stats */}
            <AssetTypeStats
              assets={assets}
              stockPrices={stockPrices}
              isLoading={isLoading}
              onTypeClick={handleTypeChange}
              selectedType={selectedType}
              currency={displayCurrency}
            />
          </div>

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
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
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
