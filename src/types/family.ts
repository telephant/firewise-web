// Family entity
export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Family member with optional profile data
export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    email?: string;
    full_name?: string;
  };
}

// Family invitation (pending)
export interface FamilyInvitation {
  id: string;
  family_id: string;
  email: string;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  family?: {
    name: string;
  };
  inviter?: {
    email?: string;
    full_name?: string;
  };
}

// Request types
export interface CreateFamilyRequest {
  name: string;
  migrate_data?: boolean;
}

export interface UpdateFamilyRequest {
  name: string;
}

export interface InviteMemberRequest {
  email: string;
}

export interface AcceptInvitationRequest {
  migrate_data?: boolean;
}

// Response types
export interface MigrateDataResult {
  assets: number;
  flows: number;
  debts: number;
  schedules: number;
  categories: number;
  linkedLedgers: number;
}

// View mode for switching between personal and family data
export type ViewMode = 'personal' | 'family';

// Family with member count for display
export interface FamilyWithDetails extends Family {
  member_count?: number;
  is_creator?: boolean;
}
