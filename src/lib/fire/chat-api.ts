import { createClient } from '@/lib/supabase/client';
import { getCurrentViewMode } from '@/contexts/fire/view-mode-context';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

// Chat types
export interface ExecutedAction {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  success: boolean;
}

// Preview data returned by AI when ready to submit
export interface AIPreviewData {
  category: string;       // salary, dividend, expense, invest, etc.
  amount: number;
  currency?: string;
  to_asset_id?: string;
  from_asset_id?: string;
  debt_id?: string;
  description?: string;
  shares?: number;
  ticker?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  message: string;
  conversation_id: string | null;
  task_completed: boolean;
  executed_actions: ExecutedAction[];
  error?: string;
  // Preview mode: AI returns data for user to review before execution
  preview_action?: 'preview';
  preview_data?: AIPreviewData;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  executed_actions?: ExecutedAction[];
  timestamp: number;
}

// Chat API
export const chatApi = {
  sendMessage: async (
    message: string,
    conversationId?: string
  ): Promise<ApiResponse<ChatResponse>> => {
    const authHeader = await getAuthHeader();
    const viewMode = getCurrentViewMode();

    const response = await fetch(`${API_URL}/fire/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-View-Mode': viewMode,
        ...authHeader,
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
      credentials: 'include',
    });

    return response.json();
  },
};
