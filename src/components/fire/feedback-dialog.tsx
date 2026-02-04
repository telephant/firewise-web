'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Label,
  LoadingText,
  colors,
} from '@/components/fire/ui';
import { feedbackApi, FeedbackType } from '@/lib/fire/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FeedbackType;
  prefill?: Record<string, unknown>;
  title?: string;
  description?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  type,
  prefill = {},
  title = 'Send Feedback',
  description,
}: FeedbackDialogProps) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    try {
      const res = await feedbackApi.create(type, {
        ...prefill,
        note: note.trim() || undefined,
      });

      if (res.success) {
        toast.success('Thanks for your feedback!');
        onOpenChange(false);
        setNote('');
      } else {
        toast.error(res.error || 'Failed to send feedback');
      }
    } catch {
      toast.error('Failed to send feedback');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {description && (
            <p className="text-sm mb-4" style={{ color: colors.muted }}>
              {description}
            </p>
          )}

          {/* Show prefilled data */}
          {Object.keys(prefill).length > 0 && (
            <div
              className="mb-4 p-3 rounded-md text-sm"
              style={{
                backgroundColor: colors.surfaceLight,
                border: `1px solid ${colors.border}`,
              }}
            >
              {Object.entries(prefill).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span style={{ color: colors.muted }}>{key}:</span>
                  <span style={{ color: colors.text }}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label
              className="text-xs uppercase tracking-wide block mb-1 font-medium"
              style={{ color: colors.text }}
            >
              Additional notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-md text-sm outline-none resize-none'
              )}
              style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
            />
          </div>
        </DialogBody>
        <DialogFooter className="px-6 pb-6">
          <Button variant="ghost" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending ? <LoadingText text="Sending" /> : 'Send Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Specialized dialog for missing stock feedback
interface MissingStockFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  market?: string;
}

export function MissingStockFeedbackDialog({
  open,
  onOpenChange,
  symbol,
  market = 'US',
}: MissingStockFeedbackDialogProps) {
  return (
    <FeedbackDialog
      open={open}
      onOpenChange={onOpenChange}
      type="missing_stock"
      prefill={{ symbol: symbol.toUpperCase(), market }}
      title="Report Missing Stock"
      description="We'll review your request and add this stock if it's valid."
    />
  );
}
