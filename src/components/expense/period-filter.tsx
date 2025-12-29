'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function PeriodFilter({ value, customRange, onChange }: PeriodFilterProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(customRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(customRange?.end);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const handleValueChange = (newValue: string) => {
    const period = newValue as PeriodOption;
    if (period === 'custom') {
      // Initialize temp dates with current custom range or defaults
      setTempStartDate(customRange?.start || new Date());
      setTempEndDate(customRange?.end || new Date());
      setCustomDialogOpen(true);
    } else {
      onChange(period);
    }
  };

  const handleCustomRangeConfirm = () => {
    if (tempStartDate && tempEndDate) {
      // Ensure start is before end
      const start = tempStartDate <= tempEndDate ? tempStartDate : tempEndDate;
      const end = tempStartDate <= tempEndDate ? tempEndDate : tempStartDate;
      onChange('custom', { start, end });
      setCustomDialogOpen(false);
    }
  };

  const handleCustomDialogClose = (open: boolean) => {
    if (!open) {
      // Reset temp dates when closing without confirming
      setTempStartDate(customRange?.start);
      setTempEndDate(customRange?.end);
    }
    setCustomDialogOpen(open);
  };

  // Get display value for the select
  const displayValue = value === 'custom' && customRange
    ? getPeriodLabel('custom', customRange)
    : undefined;

  return (
    <>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-fit h-8 text-sm px-3 gap-2 border-0 bg-muted/50 rounded-full font-medium">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            {displayValue || PERIOD_OPTIONS.find(o => o.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={customDialogOpen} onOpenChange={handleCustomDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
            <DialogDescription>Select a start and end date for filtering expenses.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Start Date */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {tempStartDate ? format(tempStartDate, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

            {/* End Date */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {tempEndDate ? format(tempEndDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => handleCustomDialogClose(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomRangeConfirm}
              disabled={!tempStartDate || !tempEndDate}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
