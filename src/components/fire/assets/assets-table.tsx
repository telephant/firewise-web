'use client';

import {
  colors,
  Card,
  Loader,
  FilterDropdown,
  Input,
  IconCash,
  IconBank,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconBox,
  IconEdit,
  IconTrash,
  IconMaximize,
  IconMinimize,
} from '@/components/fire/ui';
import type { FilterOption } from '@/components/fire/ui';
import { formatCurrency, formatShares, formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType, AssetSortField, SortOrder } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';

interface AssetsTableProps {
  assets: AssetWithBalance[];
  stockPrices: Record<string, StockPrice>;
  isLoading?: boolean;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  totalValue: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Filters
  selectedType: AssetType | 'all';
  onTypeChange: (type: AssetType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currency: string;
  // Sorting
  sortBy?: AssetSortField;
  sortOrder?: SortOrder;
  onSort?: (field: AssetSortField) => void;
  // Fullscreen
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // Actions
  onRowClick?: (asset: AssetWithBalance) => void;
  onEdit?: (asset: AssetWithBalance) => void;
  onAdjust?: (asset: AssetWithBalance) => void;
  onDelete?: (asset: AssetWithBalance) => void;
}

const ASSET_ICONS: Record<AssetType, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: IconCash,
  deposit: IconBank,
  stock: IconStock,
  etf: IconEtf,
  bond: IconBond,
  real_estate: IconRealEstate,
  crypto: IconCrypto,
  other: IconBox,
};

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

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto'];
const ADJUSTABLE_TYPES: AssetType[] = ['cash', 'deposit', 'real_estate', 'bond', 'other'];

const TYPE_OPTIONS: FilterOption[] = [
  { id: 'cash', label: 'Cash', icon: <IconCash size={14} /> },
  { id: 'deposit', label: 'Deposit', icon: <IconBank size={14} /> },
  { id: 'stock', label: 'Stock', icon: <IconStock size={14} /> },
  { id: 'etf', label: 'ETF', icon: <IconEtf size={14} /> },
  { id: 'bond', label: 'Bond', icon: <IconBond size={14} /> },
  { id: 'real_estate', label: 'Real Estate', icon: <IconRealEstate size={14} /> },
  { id: 'crypto', label: 'Crypto', icon: <IconCrypto size={14} /> },
  { id: 'other', label: 'Other', icon: <IconBox size={14} /> },
];

export function AssetsTable({
  assets,
  stockPrices,
  isLoading = false,
  currentPage,
  totalPages,
  totalCount,
  totalValue,
  pageSize,
  onPageChange,
  selectedType,
  onTypeChange,
  searchQuery,
  onSearchChange,
  currency,
  sortBy,
  sortOrder,
  onSort,
  isFullscreen = false,
  onToggleFullscreen,
  onRowClick,
  onEdit,
  onAdjust,
  onDelete,
}: AssetsTableProps) {
  const getAssetValue = (asset: AssetWithBalance): { value: number; currency: string } => {
    // Use converted_balance if available (backend handles currency conversion for all types)
    if (asset.converted_balance !== undefined && asset.converted_currency) {
      return { value: asset.converted_balance, currency: asset.converted_currency };
    }
    // Fallback for share-based assets without conversion
    if (SHARE_BASED_TYPES.includes(asset.type) && asset.ticker) {
      const price = stockPrices[asset.ticker.toUpperCase()];
      if (price) {
        return { value: asset.balance * price.price, currency: price.currency };
      }
      return { value: 0, currency: asset.currency };
    }
    return { value: asset.balance, currency: asset.currency };
  };

  const getAssetDetails = (asset: AssetWithBalance): string => {
    if (SHARE_BASED_TYPES.includes(asset.type)) {
      const price = asset.ticker ? stockPrices[asset.ticker.toUpperCase()] : null;
      if (price) {
        return `${formatShares(asset.balance)} × ${formatCurrency(price.price, { currency: price.currency })}`;
      }
      return `${formatShares(asset.balance)} shares`;
    }
    return asset.currency;
  };

  const getDayChange = (asset: AssetWithBalance): { change: number; percent: number } | null => {
    if (SHARE_BASED_TYPES.includes(asset.type) && asset.ticker) {
      const price = stockPrices[asset.ticker.toUpperCase()];
      if (price && price.changePercent != null) {
        const currentValue = asset.balance * price.price;
        const prevValue = asset.balance * price.previousClose;
        return {
          change: currentValue - prevValue,
          percent: price.changePercent,
        };
      }
    }
    return null;
  };

  // Calculate display range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Table body height: fixed 400px normally, calc for fullscreen
  const TABLE_BODY_HEIGHT = isFullscreen ? 'calc(100vh - 280px)' : 400;

  return (
    <Card>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Type Dropdown */}
        <FilterDropdown
          options={TYPE_OPTIONS}
          value={selectedType}
          onChange={(val) => onTypeChange(val as AssetType | 'all')}
          allLabel="All Types"
          allValue="all"
        />

        {/* Search */}
        <div className="flex-1 min-w-[150px] max-w-[250px]">
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="py-1.5 text-xs"
          />
        </div>

        {/* Total Value */}
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs" style={{ color: colors.muted }}>
              Total:{' '}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: colors.text }}>
              {formatCurrency(totalValue, { currency })}
            </span>
          </div>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
              style={{
                color: colors.muted,
                border: `1px solid ${colors.border}`,
              }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-md overflow-hidden"
        style={{
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[1fr_80px_140px_100px_50px_70px_60px] gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: colors.surfaceLight,
            color: colors.text,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <button
            onClick={() => onSort?.('name')}
            className="flex items-center gap-1 hover:opacity-70 text-left transition-opacity duration-150 cursor-pointer"
            style={{ color: sortBy === 'name' ? colors.accent : colors.text }}
          >
            Name
            {sortBy === 'name' && (
              <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
          <button
            onClick={() => onSort?.('type')}
            className="flex items-center gap-1 hover:opacity-70 text-left transition-opacity duration-150 cursor-pointer"
            style={{ color: sortBy === 'type' ? colors.accent : colors.text }}
          >
            Type
            {sortBy === 'type' && (
              <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
          <div>Details</div>
          <button
            onClick={() => onSort?.('balance')}
            className="flex items-center gap-1 justify-end hover:opacity-70 text-right w-full transition-opacity duration-150 cursor-pointer"
            style={{ color: sortBy === 'balance' ? colors.accent : colors.text }}
          >
            Value
            {sortBy === 'balance' && (
              <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
          <button
            onClick={() => onSort?.('balance')}
            className="flex items-center gap-1 justify-end hover:opacity-70 text-right w-full transition-opacity duration-150 cursor-pointer"
            style={{ color: sortBy === 'balance' ? colors.accent : colors.text }}
          >
            %
            {sortBy === 'balance' && (
              <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
            )}
          </button>
          <div className="text-right">Change</div>
          <div></div>
        </div>

        {/* Table Body - Fixed Height */}
        <div
          style={{
            backgroundColor: colors.surfaceLight,
            height: TABLE_BODY_HEIGHT,
            overflowY: 'auto',
          }}
        >
          {isLoading ? (
            <div
              className="flex items-center justify-center"
              style={{ height: TABLE_BODY_HEIGHT }}
            >
              <Loader size="md" variant="bar" />
            </div>
          ) : assets.length === 0 ? (
            <div
              className="flex items-center justify-center text-xs"
              style={{ color: colors.muted, height: TABLE_BODY_HEIGHT }}
            >
              No assets found
            </div>
          ) : (
            assets.map((asset, index) => {
              const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
              const { value, currency: valueCurrency } = getAssetValue(asset);
              const details = getAssetDetails(asset);
              const dayChange = getDayChange(asset);
              const isAdjustable = ADJUSTABLE_TYPES.includes(asset.type);
              const percentOfTotal = totalValue > 0 ? (value / totalValue) * 100 : 0;

              return (
                <div
                  key={asset.id}
                  className="grid grid-cols-[1fr_80px_140px_100px_50px_70px_60px] gap-2 px-3 py-2 items-center text-sm group hover:bg-[var(--hover)] cursor-pointer"
                  style={{
                    '--hover': colors.surface,
                    borderBottom:
                      index < assets.length - 1
                        ? `1px solid ${colors.surfaceLight}`
                        : 'none',
                  } as React.CSSProperties}
                  onClick={() => onRowClick?.(asset)}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ color: colors.muted }} className="flex-shrink-0">
                      <IconComponent size={14} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: colors.text }}
                      >
                        {asset.name}
                      </p>
                      {asset.ticker && (
                        <p className="text-[10px]" style={{ color: colors.muted }}>
                          {asset.ticker}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="text-xs" style={{ color: colors.muted }}>
                    {ASSET_TYPE_LABELS[asset.type]}
                  </div>

                  {/* Details */}
                  <div className="text-xs truncate" style={{ color: colors.muted }}>
                    {details}
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div
                      className="text-xs font-bold tabular-nums"
                      style={{ color: colors.text }}
                    >
                      {formatCurrency(value, { currency: valueCurrency })}
                    </div>
                    {/* Show original amount if displaying converted */}
                    {asset.converted_balance !== undefined &&
                      asset.converted_currency &&
                      asset.converted_currency !== asset.currency &&
                      !SHARE_BASED_TYPES.includes(asset.type) && (
                        <div
                          className="text-[10px] tabular-nums"
                          style={{ color: colors.muted }}
                        >
                          ({formatCurrency(asset.balance, { currency: asset.currency })})
                        </div>
                      )}
                  </div>

                  {/* Percentage */}
                  <div className="text-right">
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: colors.muted }}
                    >
                      {percentOfTotal.toFixed(1)}%
                    </span>
                  </div>

                  {/* Day Change */}
                  <div className="text-right">
                    {dayChange ? (
                      <span
                        className="text-xs tabular-nums"
                        style={{
                          color: dayChange.percent >= 0 ? colors.positive : colors.negative,
                        }}
                      >
                        {dayChange.percent >= 0 ? '+' : ''}
                        {formatPercent(dayChange.percent)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: colors.muted }}>
                        —
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(asset);
                        }}
                        className="p-1 rounded-md hover:bg-[var(--hover)]"
                        style={{
                          color: colors.muted,
                          '--hover': colors.surfaceLight,
                        } as React.CSSProperties}
                        title="Edit"
                      >
                        <IconEdit size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(asset);
                        }}
                        className="p-1 rounded-md hover:bg-[var(--hover)]"
                        style={{
                          color: colors.negative,
                          '--hover': colors.surfaceLight,
                        } as React.CSSProperties}
                        title="Delete"
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: `1px solid ${colors.border}` }}
      >
        <div className="text-xs" style={{ color: colors.muted }}>
          {totalCount > 0 ? `Showing ${startItem}-${endItem} of ${totalCount}` : 'No results'}
        </div>

        {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-md disabled:opacity-50 transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
                style={{
                  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                  color: colors.text,
                }}
              >
                ««
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-md disabled:opacity-50 transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
                style={{
                  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                  color: colors.text,
                }}
              >
                «
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className="px-2 py-1 text-xs rounded-md min-w-[28px] transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
                    style={
                      currentPage === pageNum
                        ? {
                            backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px',
                            color: colors.text,
                            fontWeight: 'bold',
                          }
                        : {
                            backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                            color: colors.text,
                          }
                    }
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-md disabled:opacity-50 transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
                style={{
                  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                  color: colors.text,
                }}
              >
                »
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-md disabled:opacity-50 transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
                style={{
                  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                  color: colors.text,
                }}
              >
                »»
              </button>
            </div>
          )}
      </div>
    </Card>
  );
}
