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
} from '@/components/fire/ui';
import { FamilyMembersList } from './family-members-list';
import { InviteMemberDialog } from './invite-member-dialog';

interface FamilySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isCreator = family?.created_by === family?.id; // This would need the current user ID

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
      setConfirmLeave(false);
      onOpenChange(false);
    }
  };

  const handleDeleteFamily = async () => {
    const success = await deleteFamily();
    if (success) {
      setConfirmDelete(false);
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
              <div className="space-y-4">
                <p className="text-sm" style={{ color: colors.muted }}>
                  Create a family to share your financial data with your partner or family members.
                  Everyone in the family can view and edit shared data.
                </p>

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

                <div
                  className="flex items-start gap-3 p-3 rounded-md"
                  style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
                >
                  <input
                    type="checkbox"
                    id="migrate-data"
                    checked={migrateOnCreate}
                    onChange={(e) => setMigrateOnCreate(e.target.checked)}
                    disabled={isCreating}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="migrate-data" className="cursor-pointer text-xs uppercase tracking-wide font-medium" style={{ color: colors.text }}>
                      Share my existing data with the family
                    </label>
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Your current assets, flows, and debts will be moved to the family.
                      You can still create personal items later.
                    </p>
                  </div>
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
            <DialogTitle>{family?.name || 'Family'} Settings</DialogTitle>
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
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: colors.muted }}>
                      Family members can view and edit all shared data.
                    </div>
                    <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                      + Invite
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

                  <div
                    className="p-4 rounded-md"
                    style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium" style={{ color: colors.text }}>
                          Migrate Personal Data
                        </div>
                        <div className="text-xs" style={{ color: colors.muted }}>
                          Move all your personal assets, flows, and debts to the family.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleMigrateData}
                        disabled={isMigrating}
                      >
                        {isMigrating ? 'Migrating...' : 'Migrate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="danger" className="mt-4">
                <div className="space-y-4">
                  {/* Leave Family (for non-creators) */}
                  <div
                    className="p-4 rounded-md"
                    style={{
                      backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px',
                      borderColor: colors.negative,
                    }}
                  >
                    {!confirmLeave ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            Leave Family
                          </div>
                          <div className="text-xs" style={{ color: colors.muted }}>
                            You&apos;ll lose access to shared family data.
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmLeave(true)}
                          style={{ color: colors.negative }}
                        >
                          Leave
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm" style={{ color: colors.negative }}>
                          Are you sure you want to leave this family?
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmLeave(false)}
                            disabled={isLeaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleLeaveFamily}
                            disabled={isLeaving}
                            style={{
                              backgroundColor: colors.negative,
                              borderColor: colors.negative,
                            }}
                          >
                            {isLeaving ? 'Leaving...' : 'Confirm Leave'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Family (for creators only) */}
                  <div
                    className="p-4 rounded-md"
                    style={{
                      backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px',
                      borderColor: colors.negative,
                    }}
                  >
                    {!confirmDelete ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium" style={{ color: colors.text }}>
                            Delete Family
                          </div>
                          <div className="text-xs" style={{ color: colors.muted }}>
                            This will permanently delete the family and all shared data.
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(true)}
                          style={{ color: colors.negative }}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm" style={{ color: colors.negative }}>
                          This action cannot be undone. All shared data will be deleted.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(false)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDeleteFamily}
                            disabled={isDeleting}
                            style={{
                              backgroundColor: colors.negative,
                              borderColor: colors.negative,
                            }}
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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
