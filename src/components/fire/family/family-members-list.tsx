'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useViewMode } from '@/contexts/fire/view-mode-context';
import { useFamilyMembers } from '@/hooks/fire/use-family';
import { familyApi } from '@/lib/fire/family-api';
import { colors, Button, Loader, IconX, IconMail } from '@/components/fire/ui';
import type { FamilyMember, FamilyInvitation } from '@/types/family';

interface FamilyMembersListProps {
  onRemoveMember?: (member: FamilyMember) => void;
}

// Generate consistent color from string
function stringToColor(str: string): string {
  const avatarColors = [
    colors.accent,
    colors.positive,
    colors.info,
    colors.warning,
    colors.purple,
    colors.cyan,
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Avatar component
function Avatar({ name, email, size = 'md' }: { name?: string; email?: string; size?: 'sm' | 'md' }) {
  const displayName = name || email || '?';
  const initial = displayName[0].toUpperCase();
  const bgColor = stringToColor(email || name || '?');
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: bgColor, color: '#fff' }}
    >
      {initial}
    </div>
  );
}

// Status badge component
function StatusBadge({ status, expired }: { status: 'owner' | 'member' | 'pending' | 'expired'; expired?: boolean }) {
  const config = {
    owner: { bg: `${colors.warning}25`, color: colors.warning, text: 'Owner' },
    member: { bg: `${colors.accent}25`, color: colors.accent, text: 'Member' },
    pending: { bg: `${colors.info}25`, color: colors.info, text: 'Pending' },
    expired: { bg: `${colors.negative}25`, color: colors.negative, text: 'Expired' },
  };
  const c = expired ? config.expired : config[status];

  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.text}
    </span>
  );
}

export function FamilyMembersList({ onRemoveMember }: FamilyMembersListProps) {
  const { family } = useViewMode();
  const { members, isLoading, error, removeMember } = useFamilyMembers(family?.id || null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = useState<FamilyInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    if (!family?.id) return;
    setLoadingInvitations(true);
    try {
      const response = await familyApi.getPendingInvitations(family.id);
      if (response.success && response.data) {
        setPendingInvitations(response.data);
      }
    } catch {
      console.error('Failed to fetch invitations');
    } finally {
      setLoadingInvitations(false);
    }
  }, [family?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResend = async (invitation: FamilyInvitation) => {
    if (!family?.id || resendingId) return;

    setResendingId(invitation.id);
    try {
      const response = await familyApi.resendInvitation(family.id, invitation.id);
      if (response.success) {
        toast.success(`Invitation resent to ${invitation.email}`);
        fetchInvitations();
      } else {
        toast.error(response.error || 'Failed to resend invitation');
      }
    } catch {
      toast.error('Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (invitation: FamilyInvitation) => {
    if (!family?.id || cancelingId) return;

    setCancelingId(invitation.id);
    try {
      const response = await familyApi.cancelInvitation(family.id, invitation.id);
      if (response.success) {
        toast.success('Invitation cancelled');
        setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id));
      } else {
        toast.error(response.error || 'Failed to cancel invitation');
      }
    } catch {
      toast.error('Failed to cancel invitation');
    } finally {
      setCancelingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size="sm" variant="dots" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-center py-4 text-sm rounded-lg"
        style={{ backgroundColor: `${colors.negative}15`, color: colors.negative }}
      >
        Failed to load members
      </div>
    );
  }

  const handleRemove = async (member: FamilyMember) => {
    if (removingId) return;

    setRemovingId(member.user_id);
    const success = await removeMember(member.user_id);
    setRemovingId(null);

    if (success && onRemoveMember) {
      onRemoveMember(member);
    }
  };

  const isCreator = (member: FamilyMember) => family?.created_by === member.user_id;
  const isExpired = (invitation: FamilyInvitation) => new Date(invitation.expires_at) < new Date();

  return (
    <div className="space-y-4">
      {/* Active Members */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.02]"
            style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={member.profile?.full_name}
                email={member.profile?.email}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                    {member.profile?.full_name || 'Unknown'}
                  </span>
                  <StatusBadge status={isCreator(member) ? 'owner' : 'member'} />
                </div>
                <div className="text-xs truncate" style={{ color: colors.muted }}>
                  {member.profile?.email || 'No email'}
                </div>
              </div>
            </div>

            {/* Only show remove button for non-creators */}
            {!isCreator(member) && (
              <button
                onClick={() => handleRemove(member)}
                disabled={removingId === member.user_id}
                className="p-1.5 rounded-md transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer disabled:opacity-50"
                style={{ color: colors.muted }}
                title="Remove member"
              >
                {removingId === member.user_id ? (
                  <Loader size="sm" variant="dots" />
                ) : (
                  <IconX size={14} />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      {(pendingInvitations.length > 0 || loadingInvitations) && (
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide pt-2"
            style={{ color: colors.muted, borderTop: `1px solid ${colors.border}` }}
          >
            <IconMail size={12} />
            Pending Invitations
          </div>

          {loadingInvitations ? (
            <div className="flex items-center justify-center py-4">
              <Loader size="sm" variant="dots" />
            </div>
          ) : (
            pendingInvitations.map((invitation) => {
              const expired = isExpired(invitation);
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor: colors.surfaceLight,
                    border: `1px solid ${colors.border}`,
                    opacity: expired ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar email={invitation.email} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {invitation.email}
                        </span>
                        <StatusBadge status="pending" expired={expired} />
                      </div>
                      <div className="text-[11px]" style={{ color: colors.muted }}>
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                        {!expired && (
                          <> · Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id || cancelingId === invitation.id}
                      className="text-xs px-2"
                    >
                      {resendingId === invitation.id ? '...' : 'Resend'}
                    </Button>
                    <button
                      onClick={() => handleCancel(invitation)}
                      disabled={resendingId === invitation.id || cancelingId === invitation.id}
                      className="p-1.5 rounded-md transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer disabled:opacity-50"
                      style={{ color: colors.negative }}
                      title="Cancel invitation"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {members.length === 0 && pendingInvitations.length === 0 && (
        <div
          className="text-center py-8 rounded-lg"
          style={{ backgroundColor: colors.surfaceLight, color: colors.muted }}
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="text-sm">No members yet</div>
          <div className="text-xs mt-1">Invite someone to get started</div>
        </div>
      )}
    </div>
  );
}
