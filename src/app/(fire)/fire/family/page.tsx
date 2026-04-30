'use client';

import { useEffect, useState } from 'react';
import { familyApi } from '@/lib/fire/api';
import type { Family } from '@/lib/fire/api';
import { colors, Button, Input, Card, Label, Loader } from '@/components/fire/ui';
import { useAuth } from '@/hooks/use-auth';

export default function FamilyPage() {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  // Create family form
  const [familyName, setFamilyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Remove member
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    familyApi.getAll().then((r) => {
      if (r.success) setFamily(r.data?.[0] ?? null);
      setLoading(false);
    });
  }, []);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const result = await familyApi.create({ name: familyName });
    setCreating(false);
    if (result.success && result.data) {
      setFamily(result.data);
    } else {
      setCreateError(result.error || 'Failed to create family');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMessage(null);
    const result = await familyApi.invite(family!.id, inviteEmail);
    setInviting(false);
    if (result.success) {
      setInviteEmail('');
      setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
    } else {
      setInviteMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from your family?')) return;
    setRemovingId(userId);
    const result = await familyApi.removeMember(family!.id, userId);
    setRemovingId(null);
    if (result.success && family) {
      setFamily({
        ...family,
        members: family.members?.filter((m) => m.user_id !== userId),
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Family</h1>

        {!family ? (
          <Card title="Create a Family Group">
            <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
              Create a family group to share portfolio visibility with other members.
            </p>
            <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {createError && <p style={{ fontSize: 13, color: colors.negative, margin: 0 }}>{createError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Family Name</Label>
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                  placeholder="e.g. Smith Family"
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Family'}
              </Button>
            </form>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={family.name}>
              <p style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>
                Created {new Date(family.created_at).toLocaleDateString()}
              </p>

              <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 12 }}>Members</p>
              {!family.members || family.members.length === 0 ? (
                <p style={{ fontSize: 13, color: colors.muted }}>No members yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {family.members.map((member, idx) => {
                    const isOwner = family.owner_id === member.user_id;
                    const isCurrentUser = user?.id === member.user_id;
                    const isLast = idx === (family.members?.length ?? 0) - 1;
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
                            {isOwner && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: colors.muted }}>(owner)</span>
                            )}
                            {isCurrentUser && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: colors.muted }}>(you)</span>
                            )}
                          </p>
                          {member.profile?.email && (
                            <p style={{ fontSize: 11, color: colors.muted, margin: '2px 0 0' }}>{member.profile.email}</p>
                          )}
                        </div>
                        {!isOwner && family.owner_id === user?.id && (
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
            </Card>

            {family.owner_id === user?.id && (
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
                        onChange={(e) => setInviteEmail(e.target.value)}
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
          </div>
        )}
      </div>
    </div>
  );
}
