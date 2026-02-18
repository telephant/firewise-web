'use client';

import { MessageCircle } from 'lucide-react';
import { useChat } from '@/contexts/fire/chat-context';
import { colors } from '@/components/fire/ui/theme';
import { cn } from '@/lib/utils';

interface ChatToggleButtonProps {
  className?: string;
}

export function ChatToggleButton({ className }: ChatToggleButtonProps) {
  const { toggleChat, isOpen, messages } = useChat();

  // Count unread messages (assistant messages)
  const unreadCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <button
      onClick={toggleChat}
      className={cn(
        'relative flex items-center justify-center',
        'w-8 h-8 rounded-md',
        'transition-all duration-200',
        'hover:bg-white/[0.08]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isOpen && 'bg-white/[0.08]',
        className
      )}
      style={{ color: isOpen ? colors.accent : colors.muted }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      <MessageCircle size={18} />

      {/* Unread badge */}
      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
