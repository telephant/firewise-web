'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { retro, retroStyles } from './theme';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root modal={true} {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-[50%] left-[50%] z-50 w-full max-w-md',
          'translate-x-[-50%] translate-y-[-50%]',
          'rounded-sm',
          'max-h-[90vh] flex flex-col',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'duration-200 outline-none',
          className
        )}
        style={retroStyles.raised}
        // Prevent dialog from closing when clicking on portalled Select dropdowns
        onPointerDownOutside={(e) => {
          // Check if the click target is inside a Select dropdown (portalled to body)
          const target = e.target as HTMLElement;
          if (target.closest('[data-select-dropdown]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-select-dropdown]')) {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {/* Content wrapper with padding - header is outside this */}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

// Content body wrapper with padding (use after DialogHeader)
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('px-6 pt-6 pb-4 overflow-y-auto flex-1', className)}
      {...props}
    />
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 rounded-t-sm',
        className
      )}
      style={retroStyles.titleBar}
      {...props}
    >
      {props.children}
      {/* Window buttons - matching Card style */}
      <div className="flex gap-1">
        {/* Decorative buttons (disabled) */}
        <div
          className="w-4 h-4 flex items-center justify-center text-[10px] pointer-events-none select-none opacity-50"
          style={retroStyles.windowButton}
        >
          &#95;
        </div>
        <div
          className="w-4 h-4 flex items-center justify-center text-[10px] pointer-events-none select-none opacity-50"
          style={retroStyles.windowButton}
        >
          &#9633;
        </div>
        {/* Close button - functional */}
        <DialogPrimitive.Close asChild>
          <button
            className="w-4 h-4 flex items-center justify-center text-xs leading-none hover:opacity-70 transition-opacity"
            style={retroStyles.windowButton}
          >
            &#215;
          </button>
        </DialogPrimitive.Close>
      </div>
    </div>
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex justify-end gap-2 px-6 pb-6', className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-sm font-medium flex-1', className)}
      style={{ color: retro.text }}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm', className)}
      style={{ color: retro.muted }}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
