'use client';

import { useState, useMemo } from 'react';
import { useFlowData } from '@/contexts/fire/flow-data-context';
import {
  colors,
  Button,
  Input,
  Loader,
  LoadingText,
  ButtonGroup,
  type ButtonGroupOption,
} from '@/components/fire/ui';
import { toast } from 'sonner';

interface ExpenseCategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function ExpenseCategorySelector({ value, onChange }: ExpenseCategorySelectorProps) {
  const {
    expenseCategories: categories,
    expenseCategoriesLoading: loading,
    createExpenseCategory,
  } = useFlowData();

  const [showCreate, setShowCreate] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [categoryNameError, setCategoryNameError] = useState<string | undefined>();

  // Categories are fetched by FlowDataProvider's useExpenseCategories hook via SWR
  // No need for useEffect to refetch - SWR handles initial fetch and caching

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryNameError('Category name is required');
      return;
    }
    setCategoryNameError(undefined);

    setCreating(true);
    const newCategory = await createExpenseCategory(newCategoryName.trim());
    if (newCategory) {
      onChange(newCategory.id);
      setNewCategoryName('');
      setShowCreate(false);
      toast.success('Category created');
    } else {
      toast.error('Failed to create category');
    }
    setCreating(false);
  };

  // Convert categories to ButtonGroup options
  const buttonGroupOptions: ButtonGroupOption<string>[] = useMemo(() =>
    categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      icon: cat.icon || '📁',
    })),
    [categories]
  );

  if (loading) {
    return (
      <div className="py-3 flex justify-center">
        <Loader size="sm" variant="dots" />
      </div>
    );
  }

  return (
    <div>
      {/* Category Grid */}
      <ButtonGroup
        options={buttonGroupOptions}
        value={value}
        onChange={onChange}
        label="Expense Category"
        columns={4}
        size="sm"
      />

      {/* Add New Category */}
      <div className="mt-2">
        {showCreate ? (
          <div
            className="flex flex-col gap-2 p-2 rounded-md"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (categoryNameError && e.target.value.trim()) {
                      setCategoryNameError(undefined);
                    }
                  }}
                  error={categoryNameError}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCategory();
                    if (e.key === 'Escape') {
                      setShowCreate(false);
                      setNewCategoryName('');
                      setCategoryNameError(undefined);
                    }
                  }}
                />
              </div>
              <Button onClick={handleCreateCategory} disabled={creating}>
                {creating ? <LoadingText text="Adding" /> : 'Add'}
              </Button>
              <Button variant="ghost" onClick={() => {
                setShowCreate(false);
                setNewCategoryName('');
                setCategoryNameError(undefined);
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full py-2 text-xs font-medium transition-all rounded-md active:translate-y-[1px] hover:bg-white/[0.06]"
            style={{
              color: colors.muted,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            + Add Category
          </button>
        )}
      </div>
    </div>
  );
}
