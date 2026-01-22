'use client';

import {
  IconArrow,
  IconDollar,
  IconGift,
  IconBriefcase,
  IconHome,
  IconCoin,
  IconBank,
  IconChart,
  IconChartDown,
  IconTransfer,
  IconCreditCard,
  IconRecycle,
  IconMore,
  IconDebt,
} from './icons';

// Shared category icon mapping - used in add-flow-dialog and category-selector
export const CATEGORY_ICONS: Record<string, (size: number) => React.ReactNode> = {
  salary: (size) => <IconDollar size={size} />,
  bonus: (size) => <IconGift size={size} />,
  freelance: (size) => <IconBriefcase size={size} />,
  rental: (size) => <IconHome size={size} />,
  gift: (size) => <IconGift size={size} />,
  dividend: (size) => <IconCoin size={size} />,
  interest: (size) => <IconCoin size={size} />,
  deposit: (size) => <IconBank size={size} />,
  expense: (size) => (
    <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>
      <IconArrow size={size} />
    </span>
  ),
  invest: (size) => <IconChart size={size} />,
  pay_debt: (size) => <IconCreditCard size={size} />,
  transfer: (size) => <IconTransfer size={size} />,
  sell: (size) => <IconChartDown size={size} />,
  reinvest: (size) => <IconRecycle size={size} />,
  add_mortgage: (size) => <IconHome size={size} />,
  add_loan: (size) => <IconDebt size={size} />,
  other: (size) => <IconMore size={size} />,
};

// Helper to get icon for a category
export function getCategoryIcon(categoryId: string, size: number = 16): React.ReactNode {
  const iconFn = CATEGORY_ICONS[categoryId];
  return iconFn ? iconFn(size) : null;
}
