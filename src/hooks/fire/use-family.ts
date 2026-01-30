'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { familyApi, invitationApi } from '@/lib/fire/family-api';
import { useViewMode } from '@/contexts/fire/view-mode-context';
import type {
  Family,
  FamilyMember,
  FamilyInvitation,
  CreateFamilyRequest,
  AcceptInvitationRequest,
  MigrateDataResult,
} from '@/types/family';

// SWR Keys
const SWR_KEYS = {
  family: 'user-family',
  members: (familyId: string) => `family-members-${familyId}`,
};

// Hook for managing family members
interface UseFamilyMembersReturn {
  members: FamilyMember[];
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
  removeMember: (userId: string) => Promise<boolean>;
}

export function useFamilyMembers(familyId: string | null): UseFamilyMembersReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    familyId ? SWR_KEYS.members(familyId) : null,
    async () => {
      if (!familyId) return [];
      const response = await familyApi.getMembers(familyId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch members');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const response = await familyApi.removeMember(familyId, userId);
      if (response.success) {
        await swrMutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [familyId, swrMutate]);

  return {
    members: data || [],
    isLoading,
    error: error?.message || null,
    mutate: async () => { await swrMutate(); },
    removeMember,
  };
}

// Hook for family actions (create, leave, delete, invite)
interface UseFamilyActionsReturn {
  isCreating: boolean;
  isLeaving: boolean;
  isDeleting: boolean;
  isInviting: boolean;
  isMigrating: boolean;
  createFamily: (data: CreateFamilyRequest) => Promise<{ success: boolean; family?: Family; error?: string }>;
  leaveFamily: () => Promise<boolean>;
  deleteFamily: () => Promise<boolean>;
  inviteMember: (email: string) => Promise<{ success: boolean; invitation?: FamilyInvitation; error?: string }>;
  migrateData: () => Promise<{ success: boolean; result?: MigrateDataResult; error?: string }>;
}

export function useFamilyActions(): UseFamilyActionsReturn {
  const { family, refreshFamily, setViewMode } = useViewMode();
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const createFamily = useCallback(async (data: CreateFamilyRequest) => {
    setIsCreating(true);
    try {
      const response = await familyApi.create(data);
      if (response.success && response.data) {
        await refreshFamily();
        setViewMode('family'); // Switch to family mode after creating
        return { success: true, family: response.data.family };
      }
      return { success: false, error: response.error || 'Failed to create family' };
    } catch (err) {
      return { success: false, error: 'Failed to create family' };
    } finally {
      setIsCreating(false);
    }
  }, [refreshFamily, setViewMode]);

  const leaveFamily = useCallback(async () => {
    if (!family) return false;
    setIsLeaving(true);
    try {
      const response = await familyApi.leave(family.id);
      if (response.success) {
        setViewMode('personal'); // Switch back to personal mode
        await refreshFamily();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLeaving(false);
    }
  }, [family, refreshFamily, setViewMode]);

  const deleteFamily = useCallback(async () => {
    if (!family) return false;
    setIsDeleting(true);
    try {
      const response = await familyApi.delete(family.id);
      if (response.success) {
        setViewMode('personal'); // Switch back to personal mode
        await refreshFamily();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [family, refreshFamily, setViewMode]);

  const inviteMember = useCallback(async (email: string) => {
    if (!family) return { success: false, error: 'Not in a family' };
    setIsInviting(true);
    try {
      const response = await familyApi.invite(family.id, { email });
      if (response.success && response.data) {
        return { success: true, invitation: response.data };
      }
      return { success: false, error: response.error || 'Failed to send invitation' };
    } catch {
      return { success: false, error: 'Failed to send invitation' };
    } finally {
      setIsInviting(false);
    }
  }, [family]);

  const migrateData = useCallback(async () => {
    if (!family) return { success: false, error: 'Not in a family' };
    setIsMigrating(true);
    try {
      const response = await familyApi.migrateData(family.id);
      if (response.success && response.data) {
        return { success: true, result: response.data };
      }
      return { success: false, error: response.error || 'Failed to migrate data' };
    } catch {
      return { success: false, error: 'Failed to migrate data' };
    } finally {
      setIsMigrating(false);
    }
  }, [family]);

  return {
    isCreating,
    isLeaving,
    isDeleting,
    isInviting,
    isMigrating,
    createFamily,
    leaveFamily,
    deleteFamily,
    inviteMember,
    migrateData,
  };
}

// Hook for accepting invitations (requires ViewModeProvider)
interface UseInvitationReturn {
  invitation: FamilyInvitation | null;
  isLoading: boolean;
  error: string | null;
  isAccepting: boolean;
  accept: (data?: AcceptInvitationRequest) => Promise<{ success: boolean; error?: string }>;
}

export function useInvitation(token: string | null): UseInvitationReturn {
  const { refreshFamily, setViewMode } = useViewMode();
  const [isAccepting, setIsAccepting] = useState(false);

  const { data, error, isLoading } = useSWR(
    token ? `invitation-${token}` : null,
    async () => {
      if (!token) return null;
      const response = await invitationApi.get(token);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Invitation not found');
    },
    {
      revalidateOnFocus: false,
    }
  );

  const accept = useCallback(async (acceptData?: AcceptInvitationRequest) => {
    if (!token) return { success: false, error: 'No invitation token' };
    setIsAccepting(true);
    try {
      const response = await invitationApi.accept(token, acceptData);
      if (response.success) {
        await refreshFamily();
        setViewMode('family'); // Switch to family mode after joining
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to accept invitation' };
    } catch {
      return { success: false, error: 'Failed to accept invitation' };
    } finally {
      setIsAccepting(false);
    }
  }, [token, refreshFamily, setViewMode]);

  return {
    invitation: data || null,
    isLoading,
    error: error?.message || null,
    isAccepting,
    accept,
  };
}

// Standalone hook for public invitation page (no ViewModeProvider required)
export function usePublicInvitation(token: string | null): UseInvitationReturn {
  const [isAccepting, setIsAccepting] = useState(false);

  const { data, error, isLoading } = useSWR(
    token ? `invitation-${token}` : null,
    async () => {
      if (!token) return null;
      const response = await invitationApi.get(token);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Invitation not found');
    },
    {
      revalidateOnFocus: false,
    }
  );

  const accept = useCallback(async (acceptData?: AcceptInvitationRequest) => {
    if (!token) return { success: false, error: 'No invitation token' };
    setIsAccepting(true);
    try {
      const response = await invitationApi.accept(token, acceptData);
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to accept invitation' };
    } catch {
      return { success: false, error: 'Failed to accept invitation' };
    } finally {
      setIsAccepting(false);
    }
  }, [token]);

  return {
    invitation: data || null,
    isLoading,
    error: error?.message || null,
    isAccepting,
    accept,
  };
}
