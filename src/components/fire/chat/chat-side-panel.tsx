'use client';

import { useRef, useEffect, useState, KeyboardEvent, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useChat } from '@/contexts/fire/chat-context';
import { colors } from '@/components/fire/ui/theme';
import { cn } from '@/lib/utils';
import type { ChatMessage, ExecutedAction } from '@/lib/fire/chat-api';

// Animation duration in ms
const ANIMATION_DURATION = 300;

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

interface ChatSidePanelProps {
  isMobile?: boolean;
}

// Chat side panel - desktop: right sidebar, mobile: full-screen overlay
export function ChatSidePanel({ isMobile = false }: ChatSidePanelProps) {
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

  // Track mounted state and visibility separately for animation
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Handle open - mount first, then animate in
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Use requestAnimationFrame to ensure DOM is painted before animating
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen]);

  // Handle close - animate out, then unmount
  useEffect(() => {
    if (!isOpen && shouldRender) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isVisible) {
      // Small delay to let animation start
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    // Regular Enter creates new line (default behavior)
  };

  // Don't render if not mounted
  if (!shouldRender) return null;

  // Mobile: full-screen overlay
  if (isMobile) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50',
          'flex flex-col',
          'transition-all ease-out'
        )}
        style={{
          backgroundColor: colors.surface,
          transitionDuration: `${ANIMATION_DURATION}ms`,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.98)',
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
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              {isLoading && <LoadingBubble />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && <ErrorBanner error={error} />}

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </div>
    );
  }

  // Desktop: side panel with slide animation
  return (
    <div
      className={cn(
        'h-full shrink-0',
        'flex flex-col',
        'transition-all overflow-hidden'
      )}
      style={{
        backgroundColor: colors.surface,
        borderLeft: isVisible ? `1px solid ${colors.border}` : 'none',
        transitionDuration: `${ANIMATION_DURATION}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        width: isVisible ? 380 : 0,
      }}
    >
      {/* Inner container for slide transform */}
      <div
        className="w-[380px] h-full flex flex-col transition-all"
        style={{
          transitionDuration: `${ANIMATION_DURATION}ms`,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          opacity: isVisible ? 1 : 0,
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
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              {isLoading && <LoadingBubble />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && <ErrorBanner error={error} />}

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}

// Shared components
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <MessageCircle size={32} style={{ color: colors.muted }} className="mb-3" />
      <p className="text-sm" style={{ color: colors.muted }}>
        Hi! I can help you record financial data.
      </p>
      <p className="text-xs mt-1" style={{ color: colors.muted }}>
        Try: &quot;I got paid $3500 today&quot;
      </p>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3"
        style={{ backgroundColor: colors.surfaceLight }}
      >
        <Loader2 size={16} className="animate-spin" style={{ color: colors.muted }} />
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div
      className="px-4 py-2 text-xs flex items-center gap-2"
      style={{ backgroundColor: `${colors.negative}15`, color: colors.negative }}
    >
      <AlertCircle size={12} />
      {error}
    </div>
  );
}

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

function ChatInput({
  input,
  setInput,
  handleSubmit,
  handleKeyDown,
  isLoading,
  inputRef,
}: ChatInputProps) {
  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set to scrollHeight, capped at max-height (6rem = 96px)
      const newHeight = Math.min(textarea.scrollHeight, 96);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputRef]);

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
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
          onChange={handleChange}
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
  );
}
