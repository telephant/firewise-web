'use client';

import { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { retro } from './theme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './dialog';

interface CelebrationEvent extends CustomEvent {
  detail: {
    debtName?: string;
    type?: 'debt-paid-off' | 'goal-reached';
    message?: string;
  };
}

export function Celebration() {
  const [open, setOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const triggerConfetti = useCallback(() => {
    // Fire confetti from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Burst from left
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      origin: { x: 0.2, y: 0.7 },
    });

    // Burst from right
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      origin: { x: 0.8, y: 0.7 },
    });

    // Center burst
    fire(0.2, {
      spread: 60,
      origin: { x: 0.5, y: 0.7 },
    });

    // Delayed secondary burst
    setTimeout(() => {
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        origin: { x: 0.5, y: 0.6 },
      });
    }, 200);

    // Final burst
    setTimeout(() => {
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.5 },
      });
    }, 400);
  }, []);

  useEffect(() => {
    const handleDebtPaidOff = (event: Event) => {
      const customEvent = event as CelebrationEvent;
      const debtName = customEvent.detail?.debtName || 'your debt';

      setCelebrationData({
        title: 'Debt Paid Off!',
        message: `Congratulations! You've completely paid off ${debtName}. This is a huge milestone on your FIRE journey!`,
      });
      setOpen(true);

      // Trigger confetti after a short delay for the dialog to appear
      setTimeout(triggerConfetti, 100);
    };

    window.addEventListener('debt-paid-off', handleDebtPaidOff);

    return () => {
      window.removeEventListener('debt-paid-off', handleDebtPaidOff);
    };
  }, [triggerConfetti]);

  const handleClose = () => {
    setOpen(false);
    setCelebrationData(null);
  };

  if (!celebrationData) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            <span className="text-2xl">🎉</span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 py-4">
          <h2
            className="text-xl font-bold"
            style={{ color: retro.positive }}
          >
            {celebrationData.title}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: retro.text }}
          >
            {celebrationData.message}
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 text-sm font-medium rounded-sm transition-colors"
            style={{
              backgroundColor: retro.accent,
              color: 'white',
              border: `2px solid ${retro.border}`,
              boxShadow: `2px 2px 0 ${retro.bevelDark}`,
            }}
          >
            Continue
          </button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
