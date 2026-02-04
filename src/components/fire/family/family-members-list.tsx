'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useViewMode } from '@/contexts/fire/view-mode-context';
import { useFamilyMembers } from '@/hooks/fire/use-family';
import { familyApi } from '@/lib/fire/family-api';
import { colors, Button, Loader } from '@/components/fire/ui';
import type { FamilyMember, FamilyInvitation } from '@/types/family';

interface FamilyMembersListProps {
  onRemoveMember?: (member: FamilyMember) => void;
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
        fetchInvitations(); // Refresh list
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
        <Loader size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4" style={{ color: colors.negative }}>
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
            className="flex items-center justify-between p-3 rounded-md"
            style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: colors.info,
                  color: '#ffffff',
                }}
              >
                {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: colors.text }}>
                  {member.profile?.full_name || 'Unknown'}
                  {isCreator(member) && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: colors.warning,
                        color: colors.text,
                      }}
                    >
                      Owner
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: colors.muted }}>
                  {member.profile?.email || 'No email'}
                </div>
              </div>
            </div>

            {/* Only show remove button for non-creators */}
            {!isCreator(member) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(member)}
                disabled={removingId === member.user_id}
                style={{ color: colors.negative }}
              >
                {removingId === member.user_id ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      {(pendingInvitations.length > 0 || loadingInvitations) && (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.muted }}>
            Pending Invitations
          </div>

          {loadingInvitations ? (
            <div className="flex items-center justify-center py-4">
              <Loader size="sm" />
            </div>
          ) : (
            pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-md"
                style={{
                  backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px',
                  opacity: isExpired(invitation) ? 0.6 : 1,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: colors.muted,
                      color: '#ffffff',
                    }}
                  >
                    {invitation.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: colors.text }}>
                      {invitation.email}
                      <span
                        className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isExpired(invitation) ? colors.negative : colors.info,
                          color: '#ffffff',
                        }}
                      >
                        {isExpired(invitation) ? 'Expired' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: colors.muted }}>
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                      {!isExpired(invitation) && (
                        <> · Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(invitation)}
                    disabled={resendingId === invitation.id || cancelingId === invitation.id}
                    style={{ color: colors.info }}
                  >
                    {resendingId === invitation.id ? 'Sending...' : 'Resend'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(invitation)}
                    disabled={resendingId === invitation.id || cancelingId === invitation.id}
                    style={{ color: colors.negative }}
                  >
                    {cancelingId === invitation.id ? '...' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {members.length === 0 && pendingInvitations.length === 0 && (
        <div className="text-center py-4" style={{ color: colors.muted }}>
          No members yet
        </div>
      )}
    </div>
  );
}
