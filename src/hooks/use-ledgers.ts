'use client';

import { useState, useEffect, useCallback } from 'react';
import { ledgerApi } from '@/lib/api';
import type { Ledger, LedgerMember } from '@/types';

export function useLedgers() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerApi.getAll();
      if (response.success && response.data) {
        setLedgers(response.data);
      } else {
        setError(response.error || 'Failed to fetch ledgers');
      }
    } catch {
      setError('Failed to fetch ledgers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  const createLedger = async (data: { name: string; description?: string }) => {
    const response = await ledgerApi.create(data);
    if (response.success && response.data) {
      setLedgers((prev) => [response.data!, ...prev]);
      return response.data;
    }
    throw new Error(response.error || 'Failed to create ledger');
  };

  const updateLedger = async (
    id: string,
    data: { name?: string; description?: string; default_currency_id?: string | null }
  ) => {
    const response = await ledgerApi.update(id, data);
    if (response.success && response.data) {
      setLedgers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...response.data } : l))
      );
      return response.data;
    }
    throw new Error(response.error || 'Failed to update ledger');
  };

  const deleteLedger = async (id: string) => {
    const response = await ledgerApi.delete(id);
    if (response.success) {
      setLedgers((prev) => prev.filter((l) => l.id !== id));
      return true;
    }
    throw new Error(response.error || 'Failed to delete ledger');
  };

  return {
    ledgers,
    loading,
    error,
    refetch: fetchLedgers,
    createLedger,
    updateLedger,
    deleteLedger,
  };
}

export function useLedgerMembers(ledgerId: string | null) {
  const [members, setMembers] = useState<LedgerMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerApi.getMembers(ledgerId);
      if (response.success && response.data) {
        setMembers(response.data);
      } else {
        setError(response.error || 'Failed to fetch members');
      }
    } catch {
      setError('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [ledgerId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteUser = async (email: string) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await ledgerApi.inviteUser(ledgerId, email);
    if (response.success) {
      await fetchMembers();
      return true;
    }
    throw new Error(response.error || 'Failed to invite user');
  };

  const removeMember = async (memberId: string) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await ledgerApi.removeMember(ledgerId, memberId);
    if (response.success) {
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
      return true;
    }
    throw new Error(response.error || 'Failed to remove member');
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    inviteUser,
    removeMember,
  };
}
