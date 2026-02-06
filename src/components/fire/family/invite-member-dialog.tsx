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
  IconCheck,
  IconWarning,
  IconMail,
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
      }, 2500);
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
          <DialogTitle>
            <span className="flex items-center gap-2">
              <IconMail size={18} />
              Invite Family Member
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            {success ? (
              <div className="py-6">
                {/* Success animation */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.positive}20` }}
                  >
                    <span style={{ color: colors.positive }}><IconCheck size={32} /></span>
                  </div>
                  <div className="text-lg font-medium mb-1" style={{ color: colors.text }}>
                    Invitation Sent!
                  </div>
                  <div className="text-sm" style={{ color: colors.muted }}>
                    They&apos;ll receive an email with instructions to join your family.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Description */}
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: `${colors.info}15` }}
                >
                  <span className="text-lg">✉️</span>
                  <p className="text-sm" style={{ color: colors.text }}>
                    Enter the email address of the person you want to invite.
                    They&apos;ll receive an email with a link to join your family.
                  </p>
                </div>

                {/* Email input */}
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

                {/* Error */}
                {error && (
                  <div
                    className="flex items-center gap-2 text-sm p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.negative}15`, color: colors.negative }}
                  >
                    <IconWarning size={14} />
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
