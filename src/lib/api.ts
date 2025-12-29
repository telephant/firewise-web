import { createClient } from '@/lib/supabase/client';
import type {
  ApiResponse,
  Ledger,
  LedgerMember,
  Expense,
  ExpenseCategory,
  Currency,
  PaymentMethod,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader,
  };

  // Merge additional headers from options
  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>;
    Object.assign(headers, optHeaders);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response.json();
}

// Ledger API
export const ledgerApi = {
  getAll: () => fetchApi<Ledger[]>('/ledgers'),

  get: (id: string) => fetchApi<Ledger>(`/ledgers/${id}`),

  create: (data: { name: string; description?: string }) =>
    fetchApi<Ledger>('/ledgers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string; default_currency_id?: string | null }) =>
    fetchApi<Ledger>(`/ledgers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/ledgers/${id}`, {
      method: 'DELETE',
    }),

  getMembers: (id: string) => fetchApi<LedgerMember[]>(`/ledgers/${id}/members`),

  inviteUser: (id: string, email: string) =>
    fetchApi(`/ledgers/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeMember: (ledgerId: string, memberId: string) =>
    fetchApi(`/ledgers/${ledgerId}/members/${memberId}`, {
      method: 'DELETE',
    }),
};

// Expense API
export const expenseApi = {
  getAll: (
    ledgerId: string,
    params?: {
      page?: number;
      limit?: number;
      category_id?: string;
      payment_method_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category_id) searchParams.set('category_id', params.category_id);
    if (params?.payment_method_id)
      searchParams.set('payment_method_id', params.payment_method_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const query = searchParams.toString();
    return fetchApi<{ expenses: Expense[]; total: number }>(
      `/ledgers/${ledgerId}/expenses${query ? `?${query}` : ''}`
    );
  },

  get: (ledgerId: string, id: string) =>
    fetchApi<Expense>(`/ledgers/${ledgerId}/expenses/${id}`),

  create: (
    ledgerId: string,
    data: {
      name: string;
      amount: number;
      currency_id: string;
      category_id?: string;
      description?: string;
      payment_method_id?: string;
      date?: string;
    }
  ) =>
    fetchApi<Expense>(`/ledgers/${ledgerId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    ledgerId: string,
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      currency_id: string;
      category_id: string | null;
      description: string | null;
      payment_method_id: string | null;
      date: string;
    }>
  ) =>
    fetchApi<Expense>(`/ledgers/${ledgerId}/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (ledgerId: string, id: string) =>
    fetchApi(`/ledgers/${ledgerId}/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// Category API
export const categoryApi = {
  getAll: (ledgerId: string) => fetchApi<ExpenseCategory[]>(`/ledgers/${ledgerId}/categories`),

  create: (ledgerId: string, name: string) =>
    fetchApi<ExpenseCategory>(`/ledgers/${ledgerId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (ledgerId: string, id: string, name: string) =>
    fetchApi<ExpenseCategory>(`/ledgers/${ledgerId}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  delete: (ledgerId: string, id: string) =>
    fetchApi(`/ledgers/${ledgerId}/categories/${id}`, {
      method: 'DELETE',
    }),

  getUsageCount: (ledgerId: string, id: string) =>
    fetchApi<{ count: number }>(`/ledgers/${ledgerId}/categories/${id}/usage`),
};

// Currency API
export const currencyApi = {
  getAll: (ledgerId: string) => fetchApi<Currency[]>(`/ledgers/${ledgerId}/currencies`),

  create: (ledgerId: string, data: { code: string; name: string; rate: number }) =>
    fetchApi<Currency>(`/ledgers/${ledgerId}/currencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (ledgerId: string, id: string, data: { code?: string; name?: string; rate?: number }) =>
    fetchApi<Currency>(`/ledgers/${ledgerId}/currencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (ledgerId: string, id: string) =>
    fetchApi(`/ledgers/${ledgerId}/currencies/${id}`, {
      method: 'DELETE',
    }),

  getUsageCount: (ledgerId: string, id: string) =>
    fetchApi<{ count: number }>(`/ledgers/${ledgerId}/currencies/${id}/usage`),
};

// Payment Method API
export const paymentMethodApi = {
  getAll: (ledgerId: string) => fetchApi<PaymentMethod[]>(`/ledgers/${ledgerId}/payment-methods`),

  create: (ledgerId: string, data: { name: string; description?: string }) =>
    fetchApi<PaymentMethod>(`/ledgers/${ledgerId}/payment-methods`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (ledgerId: string, id: string, data: { name?: string; description?: string }) =>
    fetchApi<PaymentMethod>(`/ledgers/${ledgerId}/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (ledgerId: string, id: string) =>
    fetchApi(`/ledgers/${ledgerId}/payment-methods/${id}`, {
      method: 'DELETE',
    }),

  getUsageCount: (ledgerId: string, id: string) =>
    fetchApi<{ count: number }>(`/ledgers/${ledgerId}/payment-methods/${id}/usage`),
};
