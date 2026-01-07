export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Ledger {
  id: string;
  name: string;
  description: string | null;
  default_currency_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  role?: 'owner' | 'member';
  default_currency?: { id: string; code: string; name: string } | null;
}

export interface LedgerUser {
  id: string;
  ledger_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_by: string;
  created_at: string;
}

export interface LedgerMember {
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  profile: Profile;
}

export interface Expense {
  id: string;
  name: string;
  ledger_id: string;
  category_id: string | null;
  description: string | null;
  amount: number;
  currency_id: string;
  payment_method_id: string | null;
  date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  currency?: { id: string; code: string; name: string } | null;
  payment_method?: { id: string; name: string } | null;
  created_by_profile?: { full_name: string; email: string } | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Stats types
export interface CategoryStats {
  category_id: string | null;
  category_name: string;
  amount: number;
  percentage: number;
}

export interface ExpenseStats {
  total: number;
  currency_code: string;
  currency_id: string;
  by_category: CategoryStats[];
  start_date: string;
  end_date: string;
}

// Monthly stats types
export interface MonthTotal {
  month: string; // 'YYYY-MM' format
  total: number;
}

export interface MonthlyStats {
  months: MonthTotal[];
  currency_code: string;
  currency_id: string;
}
