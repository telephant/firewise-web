'use client';

import { useEffect, useState } from 'react';
import { familyApi } from '@/lib/fire/api';
import type { FamilyInvitation } from '@/lib/fire/api';
import { colors, Button, Input, Card, Label, Loader } from '@/components/fire/ui';
import { useAuth } from '@/hooks/use-auth';
import { useFamilies } from '@/hooks/fire/use-families';

export default function FamilyPage() {
  const { user } = useAuth();
  const { families, selectedFamilyId, setSelectedFamily, loading: familiesLoading } = useFamilies();
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  // Derive activeFamily — always reflects the latest families data
  const activeFamily = families.find(f => f.id === (activeFamilyId ?? selectedFamilyId)) ?? null;
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Remove/leave
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Invitation actions
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Load invitations when activeFamily changes
  useEffect(() => {
    if (!activeFamily) return;
    const isOwner = activeFamily.owner_id === user?.id;
    if (!isOwner) {
      setInvitations([]);
      return;
    }
    setInvitationsLoading(true);
    familyApi.getInvitations(activeFamily.id).then(res => {
      if (res.success && res.data) {
        setInvitations(res.data.filter(inv => !inv.accepted_at));
      }
      setInvitationsLoading(false);
    });
  }, [activeFamily, user?.id]);

  function handleSelectFamily(familyId: string) {
    setActiveFamilyId(familyId);
    setSelectedFamily(familyId);
    setInviteEmail('');
    setInviteMessage(null);
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFamily) return;
    setInviting(true);
    setInviteMessage(null);
    const result = await familyApi.invite(activeFamily.id, inviteEmail);
    setInviting(false);
    if (result.success) {
      setInviteEmail('');
      setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      // Refresh invitations list
      familyApi.getInvitations(activeFamily.id).then(res => {
        if (res.success && res.data) setInvitations(res.data.filter(inv => !inv.accepted_at));
      });
    } else {
      setInviteMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeFamily || !confirm('Remove this member from the family?')) return;
    setRemovingId(userId);
    const result = await familyApi.removeMember(activeFamily.id, userId);
    setRemovingId(null);
    if (result.success) {
      window.location.reload();
    }
  };

  const handleLeave = async () => {
    if (!activeFamily || !confirm(`Leave ${activeFamily.name}?`)) return;
    setLeaving(true);
    const result = await familyApi.leave(activeFamily.id);
    setLeaving(false);
    if (result.success) {
      window.location.reload();
    }
  };

  const handleResend = async (invId: string) => {
    if (!activeFamily) return;
    setResendingId(invId);
    await familyApi.resendInvitation(activeFamily.id, invId);
    setResendingId(null);
  };

  const handleCancel = async (invId: string) => {
    if (!activeFamily) return;
    setCancellingId(invId);
    const result = await familyApi.cancelInvitation(activeFamily.id, invId);
    setCancellingId(null);
    if (result.success) {
      setInvitations(prev => prev.filter(inv => inv.id !== invId));
    }
  };

  if (familiesLoading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
        <p style={{ color: colors.muted, fontSize: 14 }}>No family found. Please refresh.</p>
      </div>
    );
  }

  const isOwner = activeFamily.owner_id === user?.id;

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
<h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Family</h1>

        {/* Family tabs — only if user is in multiple families */}
        {families.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 0 }}>
            {families.map(fam => (
              <button
                key={fam.id}
                onClick={() => handleSelectFamily(fam.id)}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: activeFamily.id === fam.id ? colors.text : colors.muted,
                  borderBottom: activeFamily.id === fam.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.15s',
                }}
              >
                {fam.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Members card */}
          <Card title={activeFamily.name}>
            <p style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>
              Created {new Date(activeFamily.created_at).toLocaleDateString()}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 12 }}>Members</p>
            {!activeFamily.members || activeFamily.members.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.muted }}>No members yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activeFamily.members.map((member, idx) => {
                  const memberIsOwner = activeFamily.owner_id === member.user_id;
                  const isCurrentUser = user?.id === member.user_id;
                  const isLast = idx === (activeFamily.members?.length ?? 0) - 1;
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: colors.text, margin: 0 }}>
                          {member.profile?.full_name || member.profile?.email || member.user_id}
                          {memberIsOwner && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: colors.accent }}>(owner)</span>
                          )}
                          {isCurrentUser && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: colors.muted }}>(you)</span>
                          )}
                        </p>
                        {member.profile?.email && (
                          <p style={{ fontSize: 11, color: colors.muted, margin: '2px 0 0' }}>{member.profile.email}</p>
                        )}
                      </div>
                      {isOwner && !memberIsOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingId === member.user_id}
                          style={{ color: colors.negative }}
                        >
                          {removingId === member.user_id ? 'Removing...' : 'Remove'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Leave button for non-owner members */}
            {!isOwner && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
                <Button variant="ghost" size="sm" onClick={handleLeave} disabled={leaving} style={{ color: colors.negative }}>
                  {leaving ? 'Leaving...' : 'Leave Family'}
                </Button>
              </div>
            )}
          </Card>

          {/* Invite Member — owner only */}
          {isOwner && (
            <Card title="Invite Member">
              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {inviteMessage && (
                  <p style={{ fontSize: 13, color: inviteMessage.type === 'success' ? colors.positive : colors.negative, margin: 0 }}>
                    {inviteMessage.text}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                      required
                      placeholder="member@example.com"
                    />
                  </div>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Pending Invitations — owner only */}
          {isOwner && (
            <Card title="Pending Invitations">
              {invitationsLoading ? (
                <Loader size="sm" variant="dots" />
              ) : invitations.length === 0 ? (
                <p style={{ fontSize: 13, color: colors.muted }}>No pending invitations.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {invitations.map((inv, idx) => {
                    const isLast = idx === invitations.length - 1;
                    return (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 13, color: colors.text, margin: 0 }}>{inv.email}</p>
                          <p style={{ fontSize: 11, color: colors.muted, margin: '2px 0 0' }}>
                            Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv.id)}
                            disabled={resendingId === inv.id}
                          >
                            {resendingId === inv.id ? 'Sending...' : 'Resend'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(inv.id)}
                            disabled={cancellingId === inv.id}
                            style={{ color: colors.negative }}
                          >
                            {cancellingId === inv.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
