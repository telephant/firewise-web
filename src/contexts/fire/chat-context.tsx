'use client';

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { chatApi, ChatMessage, ChatResponse, AIPreviewData } from '@/lib/fire/chat-api';
import { useFinancialStats } from './financial-stats-context';

const CHAT_OPEN_STORAGE_KEY = 'firewise_chat_open';

interface ChatContextValue {
  // Chat state
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;

  // Preview state (for Main Stage Hijack)
  previewData: AIPreviewData | null;
  isPreviewMode: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;

  // Preview actions
  clearPreview: () => void;
  confirmPreview: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Initialize from localStorage (default closed to avoid hydration mismatch)
  const [isOpen, setIsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Preview state for Main Stage Hijack
  const [previewData, setPreviewData] = useState<AIPreviewData | null>(null);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_OPEN_STORAGE_KEY);
    if (stored === 'true') {
      setIsOpen(true);
    }
    setHasHydrated(true);
  }, []);

  // Persist open state to localStorage
  useEffect(() => {
    if (hasHydrated) {
      localStorage.setItem(CHAT_OPEN_STORAGE_KEY, isOpen ? 'true' : 'false');
    }
  }, [isOpen, hasHydrated]);

  // Get financial stats refresh function
  const { refresh: refreshStats } = useFinancialStats();

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setPreviewData(null);
  }, []);

  // Preview actions
  const clearPreview = useCallback(() => {
    setPreviewData(null);
    // Add a tip message when user dismisses preview (no LLM needed)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'No problem! Feel free to modify your request or try again. Tip: You can say things like "I spent $50 on groceries" or "Add $3000 salary income".',
      timestamp: Date.now(),
    }]);
  }, []);

  const confirmPreview = useCallback(() => {
    // Add success message to chat
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Transaction recorded successfully!',
      timestamp: Date.now(),
    }]);

    // Clear preview and conversation
    setPreviewData(null);
    setConversationId(null);

    // Refresh financial stats
    refreshStats();
  }, [refreshStats]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatApi.sendMessage(message, conversationId || undefined);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to send message');
      }

      const data: ChatResponse = response.data;

      // Check if this is a preview action (Main Stage Hijack)
      if (data.preview_action === 'preview' && data.preview_data) {
        // Add assistant message about preview
        const previewMessage: ChatMessage = {
          role: 'assistant',
          content: data.message || 'I\'ve prepared this transaction for you. Please review and confirm.',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, previewMessage]);

        // Set preview data - this will trigger the AddFlowDialog to open
        setPreviewData(data.preview_data);

        // Keep conversation ID for potential follow-up
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }
      } else {
        // Normal flow - add assistant message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          executed_actions: data.executed_actions,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Update conversation ID
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }

        // If task completed, clear conversation and refresh data
        if (data.task_completed) {
          setConversationId(null);
          // Refresh financial stats since data might have changed
          refreshStats();
        }
      }

      // Show error from agent if present
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);

      // Add error message from assistant
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, refreshStats]);

  const value = useMemo<ChatContextValue>(() => ({
    messages,
    isOpen,
    isLoading,
    error,
    conversationId,
    previewData,
    isPreviewMode: previewData !== null,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    clearMessages,
    clearPreview,
    confirmPreview,
  }), [messages, isOpen, isLoading, error, conversationId, previewData, openChat, closeChat, toggleChat, sendMessage, clearMessages, clearPreview, confirmPreview]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
