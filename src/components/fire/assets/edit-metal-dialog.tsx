'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { assetApi } from '@/lib/fire/api';
import { mutateAssets } from '@/hooks/fire/use-fire-data';
import type { AssetWithBalance } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  Button,
} from '@/components/fire/ui';
import {
  METAL_OPTIONS,
  UNIT_OPTIONS,
  type MetalType,
  type MetalUnit,
} from '@/components/fire/add-transaction/metals-selector';

interface EditMetalDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditMetalDialog({
  asset,
  open,
  onOpenChange,
  onUpdated,
}: EditMetalDialogProps) {
  const prevOpenRef = useRef(open);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [metalType, setMetalType] = useState<MetalType>('gold');
  const [metalUnit, setMetalUnit] = useState<MetalUnit>('gram');
  const [metalWeight, setMetalWeight] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && asset) {
      setName(asset.name);
      const metadata = asset.metadata as { metal_type?: MetalType; metal_unit?: MetalUnit } | null;
      setMetalType(metadata?.metal_type || 'gold');
      setMetalUnit(metadata?.metal_unit || 'gram');
      setMetalWeight(asset.balance.toString());
      setErrors({});
    } else if (!open) {
      setName('');
      setMetalType('gold');
      setMetalUnit('gram');
      setMetalWeight('');
      setErrors({});
      setLoading(false);
    }
  }, [open, asset]);

  // Handle save
  const handleSave = async () => {
    if (!asset) return;

    const newErrors: Record<string, string> = {};
    const weight = parseFloat(metalWeight);
    if (isNaN(weight) || weight <= 0) {
      newErrors.metalWeight = 'Please enter a valid weight';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const metadata: Record<string, unknown> = {
        metal_type: metalType,
        metal_unit: metalUnit,
      };

      const response = await assetApi.update(asset.id, {
        name: name.trim(),
        balance: weight,
        metadata,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update metal');
        setLoading(false);
        return;
      }

      await mutateAssets();
      toast.success(`"${name}" updated`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update metal');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  const metalConfig = METAL_OPTIONS.find(m => m.id === metalType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Metal</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <Input
              label="Name"
              placeholder="e.g., Gold Bar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />

            {/* Metal Type (read-only display) */}
            <div
              className="p-3 rounded-md"
              style={{
                backgroundColor: colors.surfaceLight,
                border: `1px solid ${colors.surfaceLight}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{metalConfig?.icon}</span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {metalConfig?.label || metalType}
                </span>
              </div>
            </div>

            {/* Weight & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Weight"
                type="number"
                step="any"
                placeholder="0"
                value={metalWeight}
                onChange={(e) => setMetalWeight(e.target.value)}
                error={errors.metalWeight}
              />
              <Select
                label="Unit"
                value={metalUnit}
                onChange={(e) => setMetalUnit(e.target.value as MetalUnit)}
                options={UNIT_OPTIONS.map(u => ({ value: u.id, label: u.label }))}
              />
            </div>

            <div
              className="p-3 rounded-md text-xs"
              style={{
                backgroundColor: colors.surfaceLight,
                border: `1px solid ${colors.surfaceLight}`,
                color: colors.muted,
              }}
            >
              Metal type cannot be changed. To track a different metal, create a new asset.
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
