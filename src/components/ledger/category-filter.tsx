'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagIcon } from '@/components/icons';
import { useExpenseData } from '@/contexts/expense-data-context';

interface CategoryFilterProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
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

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const { categories } = useExpenseData();

  const handleSelect = (categoryId: string | null) => {
    onChange(categoryId);
    setOpen(false);
  };

  const selectedCategory = value ? categories.find(c => c.id === value) : null;
  const displayValue = selectedCategory ? selectedCategory.name : 'All Categories';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 text-[13px] font-medium bg-gradient-to-b from-background to-muted/30 border border-border/60 hover:border-border hover:shadow-sm rounded-full transition-all duration-200">
          <TagIcon className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-foreground/80 group-hover:text-foreground max-w-[100px] truncate">{displayValue}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1.5 rounded-xl border-border/60 shadow-xl shadow-black/5" align="start" sideOffset={6}>
        <div className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
          {/* All Categories option */}
          <button
            onClick={() => handleSelect(null)}
            className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-150 ${
              value === null
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>All Categories</span>
            {value === null && <CheckIcon className="h-3.5 w-3.5" />}
          </button>

          {categories.length > 0 && (
            <div className="h-px bg-border/50 my-1" />
          )}

          {categories.map((category) => {
            const isSelected = value === category.id;
            return (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="truncate">{category.name}</span>
                {isSelected && <CheckIcon className="h-3.5 w-3.5 shrink-0 ml-2" />}
              </button>
            );
          })}

          {categories.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No categories yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
