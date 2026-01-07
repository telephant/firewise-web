'use client';

import { Button, LoadingText } from '@/components/fire/ui';

interface FormActionsProps {
  loading: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export function FormActions({ loading, submitLabel, onCancel, onSubmit }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSubmit} disabled={loading}>
        {loading ? <LoadingText text="Saving" /> : submitLabel}
      </Button>
    </div>
  );
}
