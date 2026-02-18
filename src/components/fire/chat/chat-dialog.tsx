'use client';

import { useRef, useEffect, useState, KeyboardEvent, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useChat } from '@/contexts/fire/chat-context';
import { colors } from '@/components/fire/ui/theme';
import { cn } from '@/lib/utils';
import type { ChatMessage, ExecutedAction } from '@/lib/fire/chat-api';

// Floating trigger button
export function ChatTrigger() {
  const { toggleChat, isOpen, messages } = useChat();
  const unreadCount = messages.filter(m => m.role === 'assistant').length;

  if (isOpen) return null;

  return (
    <button
      onClick={toggleChat}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',
        'shadow-lg transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
      )}
      style={{
        backgroundColor: colors.accent,
        color: '#fff',
      }}
      aria-label="Open chat"
    >
      <MessageCircle size={24} />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center"
          style={{ backgroundColor: colors.negative, color: '#fff' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// Message bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        )}
        style={{
          backgroundColor: isUser ? colors.accent : colors.surfaceLight,
          color: colors.text,
        }}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Show executed actions if any */}
        {message.executed_actions && message.executed_actions.length > 0 && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
            {message.executed_actions.map((action, i) => (
              <ExecutedActionBadge key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Badge for executed actions
function ExecutedActionBadge({ action }: { action: ExecutedAction }) {
  const toolName = action.tool.replace('create_', '').replace(/_/g, ' ');

  return (
    <div
      className="flex items-center gap-1.5 text-xs py-1"
      style={{ color: action.success ? colors.positive : colors.negative }}
    >
      {action.success ? (
        <CheckCircle2 size={12} />
      ) : (
        <AlertCircle size={12} />
      )}
      <span className="capitalize">
        {action.success ? `Created ${toolName}` : `Failed to create ${toolName}`}
      </span>
    </div>
  );
}

// Main chat dialog panel
export function ChatPanel() {
  const {
    messages,
    isOpen,
    isLoading,
    error,
    closeChat,
    sendMessage,
    clearMessages,
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    // Regular Enter creates new line (default behavior)
  };

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 96);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-[380px] h-[520px] max-h-[80vh]',
        'rounded-xl shadow-2xl',
        'flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} style={{ color: colors.accent }} />
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            Financial Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 rounded-md transition-colors hover:bg-white/[0.08]"
              style={{ color: colors.muted }}
              title="Clear chat"
            >
              <span className="text-xs">Clear</span>
            </button>
          )}
          <button
            onClick={closeChat}
            className="p-1.5 rounded-md transition-colors hover:bg-white/[0.08]"
            style={{ color: colors.muted }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <MessageCircle size={32} style={{ color: colors.muted }} className="mb-3" />
            <p className="text-sm" style={{ color: colors.muted }}>
              Hi! I can help you record financial data.
            </p>
            <p className="text-xs mt-1" style={{ color: colors.muted }}>
              Try: &quot;I got paid $3500 today&quot;
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3"
                  style={{ backgroundColor: colors.surfaceLight }}
                >
                  <Loader2 size={16} className="animate-spin" style={{ color: colors.muted }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2 text-xs flex items-center gap-2"
          style={{ backgroundColor: `${colors.negative}15`, color: colors.negative }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Input */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: `1px solid ${colors.border}` }}
      >
        <div
          className="flex items-end gap-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              'flex-1 bg-transparent resize-none',
              'text-sm outline-none',
              'min-h-[24px] max-h-24',
              'overflow-y-auto'
            )}
            style={{ color: colors.text }}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-1.5 rounded-md transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'hover:bg-white/[0.08]'
            )}
            style={{ color: input.trim() ? colors.accent : colors.muted }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] mt-1 px-1" style={{ color: colors.muted }}>
          Press Cmd+Enter to send
        </p>
      </div>
    </div>
  );
}

// Combined component for easy use
export function ChatDialog() {
  return (
    <>
      <ChatTrigger />
      <ChatPanel />
    </>
  );
}
