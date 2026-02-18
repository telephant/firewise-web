'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  Legend,
} from 'recharts';
import { colors, Card, Loader, BarShape, Amount } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils'; // Keep for chart formatters

interface AssetActivity {
  name: string;
  flowCount: number;
  totalIn: number;
  totalOut: number;
}

interface MostActiveAssetsProps {
  assets: AssetActivity[];
  currency?: string;
  isLoading?: boolean;
}

export function MostActiveAssets({
  assets,
  currency = 'USD',
  isLoading = false,
}: MostActiveAssetsProps) {
  // Find net receiver and sender
  const netReceiver = assets.reduce(
    (best, asset) => {
      const net = asset.totalIn - asset.totalOut;
      return net > best.net ? { name: asset.name, net } : best;
    },
    { name: '', net: -Infinity }
  );

  const netSender = assets.reduce(
    (best, asset) => {
      const net = asset.totalIn - asset.totalOut;
      return net < best.net ? { name: asset.name, net } : best;
    },
    { name: '', net: Infinity }
  );

  // Prepare chart data - show top 5 assets
  const chartData = assets.slice(0, 5).map((asset) => ({
    name: asset.name.length > 10 ? asset.name.substring(0, 10) + '...' : asset.name,
    fullName: asset.name,
    in: asset.totalIn,
    out: asset.totalOut,
    net: asset.totalIn - asset.totalOut,
  }));

  if (isLoading) {
    return (
      <Card title="Most Active Assets">
        <div className="h-[180px] flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Most Active Assets">
      
      <div
        className="rounded-md p-3"
        style={{
          backgroundColor: colors.surfaceLight,
          border: `1px solid ${colors.border}`,
        }}
      >
        {assets.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: colors.muted }}>
            No asset activity this month
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={chartData.length * 50 + 30}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
              barCategoryGap={12}
            >
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: colors.text,
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
                width={80}
              />
              <Legend
                verticalAlign="top"
                height={24}
                iconType="square"
                iconSize={10}
                formatter={(value) => (
                  <span style={{ color: colors.text, fontSize: 10 }}>{value}</span>
                )}
              />
              <Bar
                dataKey="in"
                name="In"
                shape={<BarShape />}
                fill={colors.positive}
                barSize={14}
              >
                <LabelList
                  dataKey="in"
                  position="right"
                  offset={4}
                  formatter={(value: unknown) =>
                    typeof value === 'number'
                      ? formatCurrency(value, { currency, compact: true })
                      : ''
                  }
                  style={{
                    fill: colors.positive,
                    fontSize: 9,
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                  }}
                />
              </Bar>
              <Bar
                dataKey="out"
                name="Out"
                shape={<BarShape />}
                fill={colors.negative}
                barSize={14}
              >
                <LabelList
                  dataKey="out"
                  position="right"
                  offset={4}
                  formatter={(value: unknown) =>
                    typeof value === 'number'
                      ? formatCurrency(value, { currency, compact: true })
                      : ''
                  }
                  style={{
                    fill: colors.negative,
                    fontSize: 9,
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Net Receiver/Sender Summary */}
      {assets.length > 0 && (
        <div
          className="mt-3 pt-2 space-y-1"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          {netReceiver.name && netReceiver.net > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: colors.muted }}>
                Net Receiver:
              </span>
              <span className="text-xs font-medium" style={{ color: colors.positive }}>
                {netReceiver.name} +<Amount value={netReceiver.net} currency={currency} size="xs" color="positive" />
              </span>
            </div>
          )}
          {netSender.name && netSender.net < 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: colors.muted }}>
                Net Sender:
              </span>
              <span className="text-xs font-medium" style={{ color: colors.negative }}>
                {netSender.name} <Amount value={netSender.net} currency={currency} size="xs" color="negative" />
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
