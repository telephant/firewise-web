'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolioApi } from '@/lib/fire/api';
import { colors, Button, Input, Card, Label, CurrencyCombobox } from '@/components/fire/ui';

export default function NewPortfolioPage() {
  const router = useRouter();
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
      router.push(`/fire/portfolios/${result.data.id}`);
    } else {
      setError(result.error || 'Failed to create portfolio');
    }
  };

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Create Portfolio</h1>
        <Card title="Portfolio Details">
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
            <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
              <Button
                type="button"
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Creating...' : 'Create Portfolio'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
