'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useHRMS } from '@/shared/providers/HRMSContext';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'SEEN';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
}

export interface ChatEmployee {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  role: string;
  department: string;
  isOnline: boolean;
}

export interface ChatConversation {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  isOnline: boolean;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    status: MessageStatus;
    createdAt: string;
  } | null;
  updatedAt: string;
}

export interface ChatToast {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  content: string;
}

interface ChatContextType {
  isChatOpen: boolean;
  activeEmployee: ChatEmployee | null;
  messages: ChatMessage[];
  conversations: ChatConversation[];
  unreadCount: number;
  toastNotification: ChatToast | null;
  isLoadingMessages: boolean;
  openChatWith: (employeeId: string) => Promise<void>;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<boolean>;
  dismissToast: () => void;
  refreshUnreadCount: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useHRMS();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<ChatEmployee | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<ChatToast | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const activeEmployeeRef = useRef<ChatEmployee | null>(null);
  const isChatOpenRef = useRef<boolean>(false);

  useEffect(() => {
    activeEmployeeRef.current = activeEmployee;
  }, [activeEmployee]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Fetch aggregate unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/unread-count', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && typeof json.unreadCount === 'number') {
          setUnreadCount(json.unreadCount);
        }
      }
    } catch (err) {
      console.warn('Chat unread count is temporarily unavailable:', err);
    }
  }, [currentUser.id]);

  // Fetch list of conversations
  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setConversations(json.data);
        }
      }
    } catch (err) {
      console.warn('Chat conversations are temporarily unavailable:', err);
    }
  }, [currentUser.id]);

  // Chat data is secondary to the dashboard shell, so hydrate it after paint.
  useEffect(() => {
    if (!isAuthenticated) return;

    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;
    const hydrateChat = () => {
      void refreshUnreadCount();
      void refreshConversations();
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(hydrateChat, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(hydrateChat, 700);
    }

    return () => {
      if (idleCallbackId !== null) window.cancelIdleCallback(idleCallbackId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, refreshUnreadCount, refreshConversations]);

  // Connect to realtime events after the initial dashboard work has settled.
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeoutId: number | null = null;
    let disposed = false;

    const connectSSE = () => {
      if (disposed) return;
      eventSource = new EventSource('/api/chat/events');

      eventSource.addEventListener('message:new', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const currentActive = activeEmployeeRef.current;
          const isOpen = isChatOpenRef.current;

          // If chat modal is open with this sender selected
          if (isOpen && currentActive && currentActive.id === payload.senderId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });

            // Mark as SEEN immediately
            void fetch('/api/chat/messages/seen', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: payload.senderId }),
            });
          } else {
            // Otherwise increment unread count & show floating toast notification
            setUnreadCount((prev) => prev + 1);
            setToastNotification({
              id: payload.id || String(Date.now()),
              senderId: payload.senderId,
              senderName: payload.senderName || 'Team Member',
              senderAvatar: payload.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              senderRole: 'Team Member',
              content: payload.content,
            });
          }

          refreshConversations();
        } catch (err) {
          console.error('Error handling message:new SSE event:', err);
        }
      });

      eventSource.addEventListener('message:delivered', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.messageId ? { ...m, status: 'DELIVERED' } : m))
          );
        } catch (err) {
          console.error('Error handling message:delivered event:', err);
        }
      });

      eventSource.addEventListener('message:seen', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          setMessages((prev) =>
            prev.map((m) =>
              m.conversationId === payload.conversationId ? { ...m, status: 'SEEN' } : m
            )
          );
          refreshUnreadCount();
        } catch (err) {
          console.error('Error handling message:seen event:', err);
        }
      });

      eventSource.addEventListener('presence:online', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (activeEmployeeRef.current?.id === payload.employeeId) {
            setActiveEmployee((prev) => (prev ? { ...prev, isOnline: true } : null));
          }
          setConversations((prev) =>
            prev.map((c) => (c.employeeId === payload.employeeId ? { ...c, isOnline: true } : c))
          );
        } catch (err) {
          console.error('Error handling presence:online event:', err);
        }
      });

      eventSource.addEventListener('presence:offline', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (activeEmployeeRef.current?.id === payload.employeeId) {
            setActiveEmployee((prev) => (prev ? { ...prev, isOnline: false } : null));
          }
          setConversations((prev) =>
            prev.map((c) => (c.employeeId === payload.employeeId ? { ...c, isOnline: false } : c))
          );
        } catch (err) {
          console.error('Error handling presence:offline event:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!disposed) {
          reconnectTimeoutId = window.setTimeout(connectSSE, 3000);
        }
      };
    };

    const initialConnectionTimeoutId = window.setTimeout(connectSSE, 1500);

    return () => {
      disposed = true;
      window.clearTimeout(initialConnectionTimeoutId);
      if (reconnectTimeoutId !== null) window.clearTimeout(reconnectTimeoutId);
      eventSource?.close();
    };
  }, [isAuthenticated, refreshConversations, refreshUnreadCount]);

  // Open chat with a specific employee
  const openChatWith = useCallback(async (employeeId: string) => {
    setIsLoadingMessages(true);
    setIsChatOpen(true);
    setToastNotification(null);

    try {
      const res = await fetch(`/api/chat/messages?employeeId=${encodeURIComponent(employeeId)}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (!res.ok) {
        throw new Error('Failed to load conversation');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setActiveConversationId(json.data.conversationId);
        setActiveEmployee(json.data.targetEmployee);
        setMessages(json.data.messages || []);

        // The conversation is usable now; marking it seen is background work.
        void fetch('/api/chat/messages/seen', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ conversationId: json.data.conversationId, senderId: employeeId }),
        }).catch((error) => {
          console.warn('Failed to mark conversation as seen:', error);
        });

        void refreshUnreadCount();
        void refreshConversations();
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUser.id, refreshConversations, refreshUnreadCount]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setActiveEmployee(null);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const currentTarget = activeEmployeeRef.current;
      if (!currentTarget || !content.trim()) return false;

      const trimmedContent = content.trim();

      try {
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            receiverId: currentTarget.id,
            content: trimmedContent,
          }),
        });

        if (!res.ok) throw new Error('Failed to send message');

        const json = await res.json();
        if (json.success && json.data) {
          setMessages((prev) => [...prev, json.data]);
          refreshConversations();
          return true;
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
      return false;
    },
    [currentUser.id, refreshConversations]
  );

  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        activeEmployee,
        messages,
        conversations,
        unreadCount,
        toastNotification,
        isLoadingMessages,
        openChatWith,
        closeChat,
        sendMessage,
        dismissToast,
        refreshUnreadCount,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
