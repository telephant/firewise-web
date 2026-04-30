'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invitationApi, FamilyInvitation, Family } from '@/lib/fire/api';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    invitationApi.get(token).then(res => {
      if (res.success && res.data) {
        setInvitation(res.data.invitation);
        setFamily(res.data.family);
      } else {
        setError(res.error || 'Invalid invitation');
      }
      setLoading(false);
    });
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await invitationApi.accept(token);
    if (res.success) {
      localStorage.removeItem('fire_selected_family_id');
      setSuccess(true);
      setTimeout(() => router.push('/fire'), 2000);
    } else {
      setError(res.error || 'Failed to accept invitation');
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (success && family) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">You&apos;ve joined {family.name}!</div>
          <p className="text-muted-foreground">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation || !family) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Invalid Invitation</div>
          <p className="text-muted-foreground">{error || 'This invitation is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  if (invitation.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Already Accepted</div>
          <p className="text-muted-foreground">This invitation has already been accepted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 border rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Family Invitation</h1>
        <p className="mb-2">You&apos;ve been invited to join:</p>
        <p className="text-xl font-semibold mb-4">{family.name}</p>
        <p className="text-sm text-muted-foreground mb-6">Invitation sent to: {invitation.email}</p>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium disabled:opacity-50"
        >
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
      </div>
    </div>
  );
}
