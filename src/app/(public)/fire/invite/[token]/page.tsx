'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePublicInvitation } from '@/hooks/fire/use-family';
import { familyApi } from '@/lib/fire/family-api';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Loader,
  retro,
  retroStyles,
} from '@/components/fire/ui';
import type { Family } from '@/types/family';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { user, loading: authLoading } = useAuth();
  const { invitation, isLoading, error, isAccepting, accept } = usePublicInvitation(token);
  const [migrateData, setMigrateData] = useState(true);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch user's family separately (not using ViewModeProvider)
  const [userFamily, setUserFamily] = useState<Family | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      setFamilyLoading(true);
      familyApi.getMyFamily()
        .then((response) => {
          if (response.success && response.data) {
            setUserFamily(response.data);
          }
        })
        .finally(() => setFamilyLoading(false));
    }
  }, [user, authLoading]);

  const handleAccept = async () => {
    setAcceptError(null);
    const result = await accept({ migrate_data: migrateData });

    if (result.success) {
      setSuccess(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/fire');
      }, 2000);
    } else {
      setAcceptError(result.error || 'Failed to accept invitation');
    }
  };

  const handleLogin = () => {
    // Redirect to login with return URL to come back here
    const returnUrl = encodeURIComponent(`/fire/invite/${token}`);
    router.push(`/login?returnUrl=${returnUrl}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">:(</div>
            <p style={{ color: retro.muted }}>
              This invitation link is invalid or has expired.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push('/fire')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.accepted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Already Accepted</CardTitle>
          </CardHeader>
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">:)</div>
            <p style={{ color: retro.muted }}>
              This invitation has already been accepted.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push('/fire')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check if expired
  const isExpired = new Date(invitation.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invitation Expired</CardTitle>
          </CardHeader>
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">:(</div>
            <p style={{ color: retro.muted }}>
              This invitation has expired. Please ask for a new invitation.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push('/fire')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check if user is logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Family Invitation</CardTitle>
          </CardHeader>
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="text-xl font-bold mb-2" style={{ color: retro.text }}>
                You&apos;ve been invited to join
              </div>
              <div
                className="text-2xl font-bold py-4 px-6 rounded-sm"
                style={{
                  ...retroStyles.sunken,
                  color: retro.accent,
                }}
              >
                {invitation.family?.name || 'A Family'}
              </div>
              {invitation.inviter?.full_name && (
                <p className="mt-3 text-sm" style={{ color: retro.muted }}>
                  Invited by {invitation.inviter.full_name}
                </p>
              )}
            </div>

            <div
              className="p-4 rounded-sm text-center"
              style={retroStyles.sunken}
            >
              <p style={{ color: retro.muted }}>
                Please log in or create an account to accept this invitation.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleLogin}
              >
                Log In / Sign Up
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Still loading family info
  if (familyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Loader size="lg" />
      </div>
    );
  }

  // Check if user is already in a family
  if (userFamily) {
    const isSameFamily = userFamily.id === invitation.family_id;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>
              {isSameFamily ? 'Already a Member' : 'Already in a Family'}
            </CardTitle>
          </CardHeader>
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">
              {isSameFamily ? ':)' : ':/'}
            </div>
            <p style={{ color: retro.muted }}>
              {isSameFamily
                ? `You're already a member of ${userFamily.name}.`
                : `You're already a member of "${userFamily.name}". You need to leave your current family before joining another one.`}
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push('/fire')}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome to the Family!</CardTitle>
          </CardHeader>
          <div className="p-6 text-center">
            <div className="text-4xl mb-4" style={{ color: retro.positive }}>
              :D
            </div>
            <p style={{ color: retro.muted }}>
              You&apos;ve successfully joined {invitation.family?.name || 'the family'}.
            </p>
            <p className="text-sm mt-2" style={{ color: retro.muted }}>
              Redirecting to dashboard...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Family Invitation</CardTitle>
        </CardHeader>
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="text-xl font-bold mb-2" style={{ color: retro.text }}>
              You&apos;ve been invited to join
            </div>
            <div
              className="text-2xl font-bold py-4 px-6 rounded-sm"
              style={{
                ...retroStyles.sunken,
                color: retro.accent,
              }}
            >
              {invitation.family?.name || 'A Family'}
            </div>
            {invitation.inviter?.full_name && (
              <p className="mt-3 text-sm" style={{ color: retro.muted }}>
                Invited by {invitation.inviter.full_name}
              </p>
            )}
          </div>

          <div
            className="flex items-start gap-3 p-3 rounded-sm"
            style={retroStyles.sunken}
          >
            <input
              type="checkbox"
              id="migrate-data"
              checked={migrateData}
              onChange={(e) => setMigrateData(e.target.checked)}
              disabled={isAccepting}
              className="mt-1"
            />
            <div>
              <label htmlFor="migrate-data" className="cursor-pointer text-xs uppercase tracking-wide font-medium" style={{ color: retro.text }}>
                Share my existing data with the family
              </label>
              <p className="text-xs mt-1" style={{ color: retro.muted }}>
                Your current assets, flows, and debts will be moved to the family.
              </p>
            </div>
          </div>

          {acceptError && (
            <div
              className="text-sm p-2 rounded"
              style={{
                backgroundColor: `${retro.negative}20`,
                color: retro.negative,
              }}
            >
              {acceptError}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => router.push('/fire')}
              disabled={isAccepting}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? 'Joining...' : 'Accept & Join'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
