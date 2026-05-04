'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Button,
  Input,
  Label,
  colors,
} from '@/components/fire/ui';
import { portfolioApi, type Portfolio } from '@/lib/fire/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio;
  onSuccess: (portfolio: Portfolio) => void;
}

export function EditPortfolioDialog({ open, onOpenChange, portfolio, onSuccess }: Props) {
  const [name, setName] = useState(portfolio.name);
  const [description, setDescription] = useState(portfolio.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync fields when portfolio changes
  useEffect(() => {
    setName(portfolio.name);
    setDescription(portfolio.description ?? '');
    setError(null);
  }, [portfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await portfolioApi.update(portfolio.id, {
      name,
      description: description || undefined,
    });
    setLoading(false);
    if (result.success && result.data) {
      onSuccess(result.data);
    } else {
      setError(result.error || 'Failed to update portfolio');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Portfolio</DialogTitle>
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
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Currency</Label>
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>{portfolio.currency} (cannot be changed)</p>
            </div>
            <Button type="submit" disabled={loading || !name.trim()} style={{ width: '100%' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
