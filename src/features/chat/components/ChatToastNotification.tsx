'use client';

import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useChat } from '@/shared/providers/ChatContext';

export const ChatToastNotification: React.FC = () => {
  const { toastNotification, dismissToast, openChatWith } = useChat();

  if (!toastNotification) return null;

  const handleClick = () => {
    const senderId = toastNotification.senderId;
    dismissToast();
    void openChatWith(senderId);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3.5 rounded-2xl border border-[#B0D0EA] bg-white p-4 shadow-xl ring-1 ring-black/5">
        <div className="relative shrink-0">
          <img
            src={toastNotification.senderAvatar}
            alt={toastNotification.senderName}
            className="h-10 w-10 rounded-full border border-[#B0D0EA] object-cover ring-2 ring-[#B0D0EA]/50"
          />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2d577b] text-white">
            <MessageSquare className="h-2.5 w-2.5" />
          </span>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="min-w-0 flex-1 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-xs font-bold text-[#17324A] group-hover:text-[#2d577b]">
              {toastNotification.senderName}
            </h4>
            <span className="shrink-0 text-[10px] font-semibold text-[#2d577b] group-hover:underline">
              Reply →
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-[#667085] leading-snug">
            {toastNotification.content}
          </p>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="shrink-0 rounded-lg p-1 text-[#667085] hover:bg-[#F5F9FC] hover:text-[#17324A]"
          aria-label="Dismiss toast notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
