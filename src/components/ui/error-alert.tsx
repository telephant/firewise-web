import { AlertCircleIcon } from '@/components/icons';

interface ErrorAlertProps {
  message: string | null;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
      <AlertCircleIcon className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
