'use client';

import {
  colors,
  Card,
  FilterDropdown,
  Input,
  Amount,
  IconCash,
  IconBank,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconMetals,
  IconChart,
  IconBox,
  IconEdit,
  IconTrash,
  IconMaximize,
  IconMinimize,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableActionButton,
  Pagination,
} from '@/components/fire/ui';
import type { FilterOption } from '@/components/fire/ui';
import { formatCurrency, formatShares, formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType, AssetSortField, SortOrder } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';
import {
  METAL_OPTIONS,
  UNIT_OPTIONS,
  convertMetalPrice,
  type MetalType,
  type MetalUnit,
} from '@/components/fire/add-transaction/metals-selector';

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
  metals: IconMetals,
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
  metals: 'Metals',
  other: 'Other',
};

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto', 'metals'];
const ADJUSTABLE_TYPES: AssetType[] = ['cash', 'deposit', 'real_estate', 'bond', 'other'];

const TYPE_OPTIONS: FilterOption[] = [
  { id: 'cash', label: 'Cash', icon: <IconCash size={14} /> },
  { id: 'deposit', label: 'Deposit', icon: <IconBank size={14} /> },
  { id: 'stock', label: 'Stock', icon: <IconStock size={14} /> },
  { id: 'etf', label: 'ETF', icon: <IconEtf size={14} /> },
  { id: 'bond', label: 'Bond', icon: <IconBond size={14} /> },
  { id: 'real_estate', label: 'Real Estate', icon: <IconRealEstate size={14} /> },
  { id: 'crypto', label: 'Crypto', icon: <IconCrypto size={14} /> },
  { id: 'metals', label: 'Metals', icon: <IconMetals size={14} /> },
  { id: 'other', label: 'Other', icon: <IconBox size={14} /> },
];

const COLUMNS = 'grid-cols-[1fr_80px_140px_100px_50px_70px_60px]';

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
  // Helper to get metal display info (for showing weight × price details)
  const getMetalDisplayInfo = (asset: AssetWithBalance): { pricePerUnit: number; unit: string } | null => {
    if (asset.type !== 'metals' || !asset.metadata) return null;
    const metalType = asset.metadata.metal_type as MetalType;
    const metalUnit = (asset.metadata.metal_unit || 'gram') as MetalUnit;
    const metalConfig = METAL_OPTIONS.find(m => m.id === metalType);
    if (!metalConfig) return null;

    const yahooPrice = stockPrices[metalConfig.symbol];
    if (!yahooPrice) return null;

    // Convert Yahoo price (troy oz or pound) to the asset's unit
    // Note: This is USD price for display only, actual value uses converted_balance from backend
    const pricePerUnit = convertMetalPrice(yahooPrice.price, metalConfig.priceUnit, metalUnit);
    const unitConfig = UNIT_OPTIONS.find(u => u.id === metalUnit);
    return { pricePerUnit, unit: unitConfig?.shortLabel || metalUnit };
  };

  const getAssetValue = (asset: AssetWithBalance): { value: number; currency: string } => {
    // For all assets, use converted_balance if available (backend handles currency conversion)
    if (asset.converted_balance !== undefined && asset.converted_currency) {
      return { value: asset.converted_balance, currency: asset.converted_currency };
    }
    // Fallback: Handle share-based assets with real-time price (balance = shares, not currency)
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
    // Handle metals display: "10g × $95.50/g" (showing USD price from Yahoo)
    if (asset.type === 'metals') {
      const metalInfo = getMetalDisplayInfo(asset);
      const unitConfig = UNIT_OPTIONS.find(u => u.id === (asset.metadata?.metal_unit || 'gram'));
      const unitLabel = unitConfig?.shortLabel || 'g';
      if (metalInfo) {
        // Show USD price from Yahoo (actual value uses converted_balance from backend)
        return `${formatShares(asset.balance)}${unitLabel} × ${formatCurrency(metalInfo.pricePerUnit, { currency: 'USD', decimals: 2 })}/${unitLabel}`;
      }
      return `${formatShares(asset.balance)} ${unitLabel}`;
    }
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
    // Handle metals day change
    if (asset.type === 'metals') {
      const metalType = asset.metadata?.metal_type as MetalType;
      const metalConfig = METAL_OPTIONS.find(m => m.id === metalType);
      if (metalConfig) {
        const yahooPrice = stockPrices[metalConfig.symbol];
        if (yahooPrice && yahooPrice.changePercent != null) {
          const metalUnit = (asset.metadata?.metal_unit || 'gram') as MetalUnit;
          const currentPricePerUnit = convertMetalPrice(yahooPrice.price, metalConfig.priceUnit, metalUnit);
          const prevPricePerUnit = convertMetalPrice(yahooPrice.previousClose, metalConfig.priceUnit, metalUnit);
          return {
            change: asset.balance * (currentPricePerUnit - prevPricePerUnit),
            percent: yahooPrice.changePercent,
          };
        }
      }
      return null;
    }
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
              <Amount value={totalValue} currency={currency} size="sm" weight="bold" />
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
      <Table>
        <TableHeader columns={COLUMNS}>
          <TableHeaderCell
            sortable
            active={sortBy === 'name'}
            sortOrder={sortOrder}
            onSort={() => onSort?.('name')}
          >
            Name
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            active={sortBy === 'type'}
            sortOrder={sortOrder}
            onSort={() => onSort?.('type')}
          >
            Type
          </TableHeaderCell>
          <TableHeaderCell>Details</TableHeaderCell>
          <TableHeaderCell
            align="right"
            sortable
            active={sortBy === 'balance'}
            sortOrder={sortOrder}
            onSort={() => onSort?.('balance')}
          >
            Value
          </TableHeaderCell>
          <TableHeaderCell align="right">%</TableHeaderCell>
          <TableHeaderCell align="right">Change</TableHeaderCell>
          <TableHeaderCell />
        </TableHeader>

        <TableBody
          height={TABLE_BODY_HEIGHT}
          isLoading={isLoading}
          isEmpty={assets.length === 0}
          emptyMessage="No assets found"
        >
          {assets.map((asset, index) => {
            const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
            const { value, currency: valueCurrency } = getAssetValue(asset);
            const details = getAssetDetails(asset);
            const dayChange = getDayChange(asset);
            const percentOfTotal = totalValue > 0 ? (value / totalValue) * 100 : 0;

            return (
              <TableRow
                key={asset.id}
                columns={COLUMNS}
                isLast={index === assets.length - 1}
                onClick={() => onRowClick?.(asset)}
              >
                {/* Name */}
                <TableCell>
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
                </TableCell>

                {/* Type */}
                <TableCell>
                  <span className="text-xs" style={{ color: colors.muted }}>
                    {ASSET_TYPE_LABELS[asset.type]}
                  </span>
                </TableCell>

                {/* Details */}
                <TableCell>
                  <span className="text-xs truncate" style={{ color: colors.muted }}>
                    {details}
                  </span>
                </TableCell>

                {/* Value */}
                <TableCell align="right">
                  <div
                    className="text-xs font-bold tabular-nums"
                    style={{ color: colors.text }}
                  >
                    <Amount value={value} currency={valueCurrency} size="xs" weight="bold" />
                  </div>
                  {asset.converted_balance !== undefined &&
                    asset.converted_currency &&
                    asset.converted_currency !== asset.currency &&
                    !SHARE_BASED_TYPES.includes(asset.type) && (
                      <div
                        className="text-[10px] tabular-nums"
                        style={{ color: colors.muted }}
                      >
                        (<Amount value={asset.balance} currency={asset.currency} size={10} color="muted" />)
                      </div>
                    )}
                </TableCell>

                {/* Percentage */}
                <TableCell align="right">
                  <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
                    {percentOfTotal.toFixed(1)}%
                  </span>
                </TableCell>

                {/* Day Change */}
                <TableCell align="right">
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
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <TableActionButton
                        icon={<IconEdit size={14} />}
                        onClick={() => onEdit(asset)}
                        title="Edit"
                      />
                    )}
                    {onDelete && (
                      <TableActionButton
                        icon={<IconTrash size={14} />}
                        onClick={() => onDelete(asset)}
                        title="Delete"
                        color={colors.negative}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </Card>
  );
}
