'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingButton } from '@/components/ui/loading-button';
import { TrashIcon, UsersIcon, CheckCircleIcon } from '@/components/icons';
import { useLedgerMembers } from '@/hooks/use-ledgers';
import type { Ledger, LedgerMember } from '@/types';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledger: Ledger;
  currentUserId: string;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  ledger,
  currentUserId,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { members, inviteUser, removeMember } = useLedgerMembers(open ? ledger.id : null);

  const isOwner = ledger.role === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteUser(email.trim());
      setEmail('');
      setSuccess('User invited successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: LedgerMember) => {
    if (!confirm(`Remove ${member.profile.full_name || member.profile.email} from this ledger?`)) {
      return;
    }

    try {
      await removeMember(member.user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Manage Members</DialogTitle>
              <DialogDescription>
                {isOwner
                  ? 'Invite users to collaborate.'
                  : 'View members of this ledger.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isOwner && (
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <LoadingButton type="submit" loading={loading} loadingText="Inviting...">
                Invite
              </LoadingButton>
            </form>
          )}

          <ErrorAlert message={error} />
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Members ({members.length})</Label>
            <ScrollArea className="h-[200px] mt-2 rounded-lg border p-1">
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(member.profile.full_name, member.profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile.full_name || member.profile.email}
                      </p>
                      {member.profile.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile.email}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={member.role === 'owner' ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== currentUserId && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
