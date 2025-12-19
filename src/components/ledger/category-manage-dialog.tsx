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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/ui/error-alert';
import { TagIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from '@/components/icons';
import { useExpenseData } from '@/contexts/expense-data-context';
import { getCategoryColor } from '@/lib/category-colors';
import type { ExpenseCategory } from '@/types';

interface CategoryManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManageDialog({ open, onOpenChange }: CategoryManageDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    category: ExpenseCategory;
    usageCount: number;
  } | null>(null);

  const { categories, createCategory, updateCategory, deleteCategory, getCategoryUsageCount } =
    useExpenseData();

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setEditingName('');
      setNewCategoryName('');
      setShowAddNew(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleStartEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await updateCategory(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (category: ExpenseCategory) => {
    setError(null);
    setLoading(true);

    try {
      const usageCount = await getCategoryUsageCount(category.id);

      if (usageCount === 0) {
        // No expenses using this category, delete directly
        await deleteCategory(category.id);
      } else {
        // Show confirmation dialog
        setDeleteConfirm({ category, usageCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check category usage');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    setError(null);

    try {
      await deleteCategory(deleteConfirm.category.id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TagIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription>Add, edit, or delete expense categories.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            <ErrorAlert message={error} />

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-1">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No categories yet. Add your first category below.
                  </p>
                ) : (
                  categories.map((category) => {
                    const colors = getCategoryColor(category.name);
                    const isEditing = editingId === category.id;

                    return (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className={`w-1 h-6 rounded-full ${colors.bar}`} />

                        {isEditing ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 h-8"
                              autoFocus
                              disabled={loading}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={handleSaveEdit}
                              disabled={loading}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={handleCancelEdit}
                              disabled={loading}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm truncate">{category.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(category);
                                }}
                                disabled={loading}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(category);
                                }}
                                disabled={loading}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add new category section */}
                {showAddNew ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                    <div className="w-1 h-6 rounded-full bg-muted" />
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 h-8"
                      autoFocus
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') {
                          setShowAddNew(false);
                          setNewCategoryName('');
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={handleAddCategory}
                      disabled={loading || !newCategoryName.trim()}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setShowAddNew(false);
                        setNewCategoryName('');
                      }}
                      disabled={loading}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                    onClick={() => setShowAddNew(true)}
                    disabled={loading}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add category
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              The category &quot;{deleteConfirm?.category.name}&quot; is used by{' '}
              <span className="font-semibold">{deleteConfirm?.usageCount}</span> expense
              {deleteConfirm?.usageCount === 1 ? '' : 's'}. Deleting it will remove the category
              from all these expenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
