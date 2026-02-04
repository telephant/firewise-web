'use client';

import { useState } from 'react';
import { useFamilyActions } from '@/hooks/fire/use-family';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Input,
  Label,
  colors,
} from '@/components/fire/ui';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { inviteMember, isInviting } = useFamilyActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const result = await inviteMember(email.trim());
    if (result.success) {
      setSuccess(true);
      setEmail('');
      // Auto close after success
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } else {
      setError(result.error || 'Failed to send invitation');
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Family Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            {success ? (
              <div
                className="text-center py-8"
                style={{ color: colors.positive }}
              >
                <div className="text-2xl mb-2">Invitation Sent!</div>
                <div className="text-sm" style={{ color: colors.muted }}>
                  They&apos;ll receive an email with instructions to join.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: colors.muted }}>
                  Enter the email address of the person you want to invite to your family.
                  They&apos;ll receive an email with a link to join.
                </p>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="partner@example.com"
                    disabled={isInviting}
                  />
                </div>

                {error && (
                  <div
                    className="text-sm p-2 rounded"
                    style={{
                      backgroundColor: `${colors.negative}20`,
                      color: colors.negative,
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            )}
          </DialogBody>

          {!success && (
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
