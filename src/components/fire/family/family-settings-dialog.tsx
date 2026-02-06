'use client';

import { useState } from 'react';
import { useViewMode } from '@/contexts/fire/view-mode-context';
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  IconCheck,
  IconWarning,
  IconPlus,
} from '@/components/fire/ui';
import { FamilyMembersList } from './family-members-list';
import { InviteMemberDialog } from './invite-member-dialog';

interface FamilySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom checkbox component
function Checkbox({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-50"
      style={{
        backgroundColor: checked ? colors.accent : colors.surface,
        border: `1px solid ${checked ? colors.accent : colors.border}`,
      }}
    >
      {checked && <span style={{ color: '#fff' }}><IconCheck size={12} /></span>}
    </button>
  );
}

// Action card for danger zone
function ActionCard({
  title,
  description,
  buttonText,
  onAction,
  isLoading,
  confirmText,
  variant = 'default',
}: {
  title: string;
  description: string;
  buttonText: string;
  onAction: () => void;
  isLoading: boolean;
  confirmText: string;
  variant?: 'default' | 'danger';
}) {
  const [confirming, setConfirming] = useState(false);

  const handleAction = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await onAction();
    setConfirming(false);
  };

  const isDanger = variant === 'danger';

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.surfaceLight,
        border: `1px solid ${isDanger ? `${colors.negative}40` : colors.border}`,
      }}
    >
      {!confirming ? (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: colors.text }}>
              {title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: colors.muted }}>
              {description}
            </div>
          </div>
          <Button
            size="sm"
            variant={isDanger ? 'ghost' : 'outline'}
            onClick={handleAction}
            style={isDanger ? { color: colors.negative } : undefined}
          >
            {buttonText}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span style={{ color: colors.negative, flexShrink: 0, marginTop: 2, display: 'flex' }}><IconWarning size={16} /></span>
            <div className="text-sm" style={{ color: isDanger ? colors.negative : colors.text }}>
              {confirmText}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAction}
              disabled={isLoading}
              style={isDanger ? { backgroundColor: colors.negative } : undefined}
            >
              {isLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FamilySettingsDialog({ open, onOpenChange }: FamilySettingsDialogProps) {
  const { family, isInFamily } = useViewMode();
  const {
    createFamily,
    leaveFamily,
    deleteFamily,
    migrateData,
    isCreating,
    isLeaving,
    isDeleting,
    isMigrating,
  } = useFamilyActions();

  const [familyName, setFamilyName] = useState('');
  const [migrateOnCreate, setMigrateOnCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!familyName.trim()) {
      setError('Family name is required');
      return;
    }

    const result = await createFamily({
      name: familyName.trim(),
      migrate_data: migrateOnCreate,
    });

    if (result.success) {
      setFamilyName('');
      onOpenChange(false);
    } else {
      setError(result.error || 'Failed to create family');
    }
  };

  const handleLeaveFamily = async () => {
    const success = await leaveFamily();
    if (success) {
      onOpenChange(false);
    }
  };

  const handleDeleteFamily = async () => {
    const success = await deleteFamily();
    if (success) {
      onOpenChange(false);
    }
  };

  const handleMigrateData = async () => {
    const result = await migrateData();
    if (result.success && result.result) {
      const { assets, flows, debts, schedules, categories } = result.result;
      alert(`Migrated: ${assets} assets, ${flows} flows, ${debts} debts, ${schedules} schedules, ${categories} categories`);
    }
  };

  // If not in a family, show create family form
  if (!isInFamily) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Family</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateFamily}>
            <DialogBody>
              <div className="space-y-5">
                {/* Description */}
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: `${colors.info}15` }}
                >
                  <span className="text-lg">👨‍👩‍👧</span>
                  <p className="text-sm" style={{ color: colors.text }}>
                    Create a family to share your financial data with your partner or family members.
                    Everyone in the family can view and edit shared data.
                  </p>
                </div>

                {/* Family name input */}
                <div className="space-y-2">
                  <Label>Family Name</Label>
                  <Input
                    id="family-name"
                    value={familyName}
                    onChange={(e) => {
                      setFamilyName(e.target.value);
                      setError(null);
                    }}
                    placeholder="The Smiths"
                    disabled={isCreating}
                  />
                </div>

                {/* Migrate checkbox */}
                <div
                  className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/[0.02]"
                  style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}` }}
                  onClick={() => !isCreating && setMigrateOnCreate(!migrateOnCreate)}
                >
                  <Checkbox
                    id="migrate-data"
                    checked={migrateOnCreate}
                    onChange={setMigrateOnCreate}
                    disabled={isCreating}
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor="migrate-data"
                      className="cursor-pointer text-sm font-medium"
                      style={{ color: colors.text }}
                    >
                      Share my existing data with the family
                    </label>
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Your current assets, flows, and debts will be moved to the family.
                      You can still create personal items later.
                    </p>
                  </div>
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
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Family'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // If in a family, show family management
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <span>👨‍👩‍👧</span>
                {family?.name || 'Family'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <Tabs defaultValue="members">
              <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-4">
                <div className="space-y-4">
                  {/* Header with invite button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: colors.muted }}>
                      Family members can view and edit all shared data.
                    </div>
                    <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                      <IconPlus size={14} />
                      <span className="ml-1">Invite</span>
                    </Button>
                  </div>

                  <FamilyMembersList />
                </div>
              </TabsContent>

              <TabsContent value="data" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm" style={{ color: colors.muted }}>
                    Migrate your personal data to the family, or keep it separate.
                  </div>

                  <ActionCard
                    title="Migrate Personal Data"
                    description="Move all your personal assets, flows, and debts to the family."
                    buttonText={isMigrating ? 'Migrating...' : 'Migrate'}
                    onAction={handleMigrateData}
                    isLoading={isMigrating}
                    confirmText="This will move all your personal financial data to the family. Other family members will be able to see and edit it."
                  />
                </div>
              </TabsContent>

              <TabsContent value="danger" className="mt-4">
                <div className="space-y-3">
                  <ActionCard
                    title="Leave Family"
                    description="You'll lose access to shared family data."
                    buttonText="Leave"
                    onAction={handleLeaveFamily}
                    isLoading={isLeaving}
                    confirmText="Are you sure you want to leave this family? You'll lose access to all shared data."
                    variant="danger"
                  />

                  <ActionCard
                    title="Delete Family"
                    description="This will permanently delete the family and all shared data."
                    buttonText="Delete"
                    onAction={handleDeleteFamily}
                    isLoading={isDeleting}
                    confirmText="This action cannot be undone. All shared data including assets, flows, and debts will be permanently deleted."
                    variant="danger"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </>
  );
}
