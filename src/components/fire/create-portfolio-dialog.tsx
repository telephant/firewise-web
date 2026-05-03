'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Button,
  Input,
  Label,
  CurrencyCombobox,
  colors,
} from '@/components/fire/ui';
import { portfolioApi, type Portfolio } from '@/lib/fire/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (portfolio: Portfolio) => void;
}

export function CreatePortfolioDialog({ open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await portfolioApi.create({
      name,
      currency,
      description: description || undefined,
    });
    setLoading(false);
    if (result.success && result.data) {
      setName('');
      setCurrency('USD');
      setDescription('');
      onSuccess(result.data);
    } else {
      setError(result.error || 'Failed to create portfolio');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Portfolio</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <p style={{ fontSize: 13, color: colors.negative, margin: 0 }}>{error}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Interactive Brokers"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <CurrencyCombobox
                label="Currency"
                value={currency}
                onChange={setCurrency}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating...' : 'Create Portfolio'}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
