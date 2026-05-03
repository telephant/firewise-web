// FIRE module shared types

export type AssetType =
  | 'cash'
  | 'deposit'
  | 'stock'
  | 'etf'
  | 'bond'
  | 'real_estate'
  | 'crypto'
  | 'metals'
  | 'other';

export type DebtType =
  | 'mortgage'
  | 'personal_loan'
  | 'credit_card'
  | 'student_loan'
  | 'auto_loan'
  | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface AssetWithBalance extends Asset {
  converted_balance?: number;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  current_balance: number;
  currency: string;
  converted_balance?: number;
  created_at: string;
  updated_at: string;
}
