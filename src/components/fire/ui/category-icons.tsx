'use client';

// Category icons using emoji characters
// Replaces pixel-art SVG icons with native emoji

export const CATEGORY_ICONS: Record<string, (size: number) => React.ReactNode> = {
  salary: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>💰</span>,
  bonus: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🎁</span>,
  freelance: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>💼</span>,
  rental: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🏠</span>,
  gift: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🎀</span>,
  dividend: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📈</span>,
  interest: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🏦</span>,
  deposit: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🏧</span>,
  expense: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🛒</span>,
  invest: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📊</span>,
  pay_debt: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>💳</span>,
  transfer: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🔄</span>,
  sell: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📉</span>,
  buy: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🛒</span>,
  gain: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📈</span>,
  loss: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📉</span>,
  reinvest: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>♻️</span>,
  add_mortgage: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>🏡</span>,
  add_loan: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📝</span>,
  other: (size) => <span style={{ fontSize: size, lineHeight: 1 }}>📦</span>,
};

// Helper to get icon for a category
export function getCategoryIcon(categoryId: string, size: number = 16): React.ReactNode {
  const iconFn = CATEGORY_ICONS[categoryId];
  return iconFn ? iconFn(size) : null;
}
