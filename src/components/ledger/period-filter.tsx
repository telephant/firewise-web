'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from '@/components/icons';
import { format } from 'date-fns';
import { type PeriodOption, type CustomDateRange, PERIOD_OPTIONS, getPeriodLabel } from '@/lib/date-utils';

interface PeriodFilterProps {
  value: PeriodOption;
  customRange?: CustomDateRange;
  onChange: (period: PeriodOption, customRange?: CustomDateRange) => void;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PeriodFilter({ value, customRange, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(customRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(customRange?.end);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const handleSelect = (period: PeriodOption) => {
    if (period === 'custom') {
      setTempStartDate(customRange?.start || new Date());
      setTempEndDate(customRange?.end || new Date());
      setOpen(false);
      setCustomDialogOpen(true);
    } else {
      onChange(period);
      setOpen(false);
    }
  };

  const handleCustomRangeConfirm = () => {
    if (tempStartDate && tempEndDate) {
      const start = tempStartDate <= tempEndDate ? tempStartDate : tempEndDate;
      const end = tempStartDate <= tempEndDate ? tempEndDate : tempStartDate;
      onChange('custom', { start, end });
      setCustomDialogOpen(false);
    }
  };

  const handleCustomDialogClose = (open: boolean) => {
    if (!open) {
      setTempStartDate(customRange?.start);
      setTempEndDate(customRange?.end);
    }
    setCustomDialogOpen(open);
  };

  const displayValue = value === 'custom' && customRange
    ? getPeriodLabel('custom', customRange)
    : PERIOD_OPTIONS.find(o => o.value === value)?.label;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 text-[13px] font-medium bg-gradient-to-b from-background to-muted/30 border border-border/60 hover:border-border hover:shadow-sm rounded-full transition-all duration-200">
            <CalendarIcon className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-foreground/80 group-hover:text-foreground">{displayValue}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 rounded-xl border-border/60 shadow-xl shadow-black/5" align="start" sideOffset={6}>
          <div className="flex flex-col gap-0.5">
            {PERIOD_OPTIONS.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-150 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={customDialogOpen} onOpenChange={handleCustomDialogClose}>
        <DialogContent className="sm:max-w-[340px] rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold">Select Date Range</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</label>
                <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-center gap-2 w-full h-10 text-sm font-medium bg-muted/40 hover:bg-muted border border-transparent hover:border-border/50 rounded-xl transition-all duration-200">
                      <CalendarIcon className="h-4 w-4 text-primary/60" />
                      <span className={tempStartDate ? 'text-foreground' : 'text-muted-foreground'}>
                        {tempStartDate ? format(tempStartDate, 'MMM d') : 'Start'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={tempStartDate}
                      onSelect={(d) => {
                        if (d) {
                          setTempStartDate(d);
                          setStartCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</label>
                <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-center gap-2 w-full h-10 text-sm font-medium bg-muted/40 hover:bg-muted border border-transparent hover:border-border/50 rounded-xl transition-all duration-200">
                      <CalendarIcon className="h-4 w-4 text-primary/60" />
                      <span className={tempEndDate ? 'text-foreground' : 'text-muted-foreground'}>
                        {tempEndDate ? format(tempEndDate, 'MMM d') : 'End'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                    <Calendar
                      mode="single"
                      selected={tempEndDate}
                      onSelect={(d) => {
                        if (d) {
                          setTempEndDate(d);
                          setEndCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Range preview pill */}
            {tempStartDate && tempEndDate && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/5 rounded-full">
                <span className="text-xs font-medium text-primary">
                  {format(tempStartDate, 'MMM d')} → {format(tempEndDate, 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                onClick={() => handleCustomDialogClose(false)}
                className="flex-1 h-9 rounded-xl text-[13px] font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomRangeConfirm}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1 h-9 rounded-xl text-[13px] font-medium"
              >
                Apply
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
