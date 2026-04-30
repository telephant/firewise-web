'use client';

import { useState, useEffect, useCallback } from 'react';
import { familyApi, Family } from '@/lib/fire/api';

interface UseFamiliesReturn {
  families: Family[];
  selectedFamilyId: string | null;
  selectedFamily: Family | null;
  setSelectedFamily: (id: string) => void;
  loading: boolean;
}

const STORAGE_KEY = 'fire_selected_family_id';

export function useFamilies(): UseFamiliesReturn {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    familyApi.getAll().then(res => {
      if (res.success && res.data) {
        setFamilies(res.data);
        const saved = localStorage.getItem(STORAGE_KEY);
        const validId = saved && res.data.find(f => f.id === saved) ? saved : res.data[0]?.id ?? null;
        setSelectedFamilyId(validId);
        if (validId) localStorage.setItem(STORAGE_KEY, validId);
      }
      setLoading(false);
    });
  }, []);

  const setSelectedFamily = useCallback((id: string) => {
    setSelectedFamilyId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selectedFamily = families.find(f => f.id === selectedFamilyId) ?? null;

  return { families, selectedFamilyId, selectedFamily, setSelectedFamily, loading };
}
