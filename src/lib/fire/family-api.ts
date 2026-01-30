import { createClient } from '@/lib/supabase/client';
import type {
  Family,
  FamilyMember,
  FamilyInvitation,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  InviteMemberRequest,
  AcceptInvitationRequest,
  MigrateDataResult,
} from '@/types/family';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader,
  };

  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>;
    Object.assign(headers, optHeaders);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response.json();
}

// Family API
export const familyApi = {
  // Get current user's family
  getMyFamily: () => fetchApi<Family | null>('/fire/families/me'),

  // Create a new family
  create: (data: CreateFamilyRequest) =>
    fetchApi<{ family: Family; migrated?: MigrateDataResult }>('/fire/families', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update family name
  update: (id: string, data: UpdateFamilyRequest) =>
    fetchApi<Family>(`/fire/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete family (creator only)
  delete: (id: string) =>
    fetchApi(`/fire/families/${id}`, {
      method: 'DELETE',
    }),

  // Get family members
  getMembers: (familyId: string) =>
    fetchApi<FamilyMember[]>(`/fire/families/${familyId}/members`),

  // Remove a member (creator only, can't remove self)
  removeMember: (familyId: string, userId: string) =>
    fetchApi(`/fire/families/${familyId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Leave family (for non-creators)
  leave: (familyId: string) =>
    fetchApi(`/fire/families/${familyId}/leave`, {
      method: 'POST',
    }),

  // Invite a member by email
  invite: (familyId: string, data: InviteMemberRequest) =>
    fetchApi<FamilyInvitation>(`/fire/families/${familyId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get pending invitations
  getPendingInvitations: (familyId: string) =>
    fetchApi<FamilyInvitation[]>(`/fire/families/${familyId}/invitations`),

  // Resend invitation
  resendInvitation: (familyId: string, invitationId: string) =>
    fetchApi<FamilyInvitation>(`/fire/families/${familyId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    }),

  // Cancel invitation
  cancelInvitation: (familyId: string, invitationId: string) =>
    fetchApi(`/fire/families/${familyId}/invitations/${invitationId}`, {
      method: 'DELETE',
    }),

  // Migrate personal data to family
  migrateData: (familyId: string) =>
    fetchApi<MigrateDataResult>(`/fire/families/${familyId}/migrate-data`, {
      method: 'POST',
    }),
};

// Invitation API (public endpoints for accepting invites)
export const invitationApi = {
  // Get invitation details by token (public - no auth required for viewing)
  get: (token: string) =>
    fetchApi<FamilyInvitation>(`/fire/invitations/${token}`),

  // Accept invitation
  accept: (token: string, data?: AcceptInvitationRequest) =>
    fetchApi<{ family: Family; migrated?: MigrateDataResult }>(
      `/fire/invitations/${token}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    ),
};
