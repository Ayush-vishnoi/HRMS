'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Loader2, Send, X } from 'lucide-react';
import { useChat } from '@/shared/providers/ChatContext';
import { useHRMS } from '@/shared/providers/HRMSContext';

export const ChatModal: React.FC = () => {
  const { isChatOpen, activeEmployee, messages, closeChat, sendMessage, isLoadingMessages } = useChat();
  const { currentUser } = useHRMS();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation on new messages or open
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isChatOpen && !isLoadingMessages) {
      textareaRef.current?.focus();
    }
  }, [isChatOpen, isLoadingMessages]);

  if (!isChatOpen || !activeEmployee) return null;

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    const textToSend = inputText;
    setInputText('');
    setIsSending(true);

    try {
      await sendMessage(textToSend);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17324A]/45 px-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      <div className="flex h-[540px] max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D9E5EE] bg-[#F8FAFC] px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={activeEmployee.avatar}
                alt={activeEmployee.name}
                className="h-10 w-10 rounded-full border border-[#B0D0EA] object-cover ring-2 ring-[#B0D0EA]/40"
              />
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                  activeEmployee.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h2 id="chat-modal-title" className="truncate text-sm font-bold text-[#17324A] flex items-center gap-1.5">
                💬 {activeEmployee.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                <span className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      activeEmployee.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span className={`font-semibold text-[11px] ${activeEmployee.isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {activeEmployee.isOnline ? 'Online' : 'Offline'}
                  </span>
                </span>
                <span>·</span>
                <span className="truncate text-[11px]">{activeEmployee.department}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeChat}
            className="rounded-lg p-1.5 text-[#667085] hover:bg-[#EAF2F8] hover:text-[#17324A] transition-colors"
            aria-label="Close conversation modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F9FBFD]">
          {isLoadingMessages ? (
            <div className="flex h-full items-center justify-center text-xs text-[#667085] gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#2d577b]" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-[#667085]">
              <p className="text-xs font-semibold text-[#17324A]">No previous conversation history</p>
              <p className="mt-1 text-[11px]">Send a message to start a 1-to-1 real-time conversation with {activeEmployee.name}.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOutgoing = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                      isOutgoing
                        ? 'bg-[#2d577b] text-white rounded-br-none'
                        : 'bg-white border border-[#D9E5EE] text-[#17324A] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">{msg.content}</p>

                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        isOutgoing ? 'text-white/70' : 'text-[#667085]'
                      }`}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isOutgoing && (
                        <span className="ml-0.5 inline-flex items-center">
                          {msg.status === 'SENT' && <span title="Sent"><Check className="h-3 w-3 text-white/70" /></span>}
                          {msg.status === 'DELIVERED' && <span title="Delivered"><CheckCheck className="h-3 w-3 text-white/70" /></span>}
                          {msg.status === 'SEEN' && <span title="Seen"><CheckCheck className="h-3 w-3 text-emerald-300" /></span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Modal Footer / Input Area */}
        <div className="border-t border-[#D9E5EE] bg-white p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type a message to ${activeEmployee.name}...`}
              rows={1}
              className="min-h-[40px] max-h-[100px] flex-1 resize-none rounded-xl border border-[#D9E5EE] px-3.5 py-2 text-xs text-[#17324A] outline-none focus:border-[#2d577b] focus:ring-1 focus:ring-[#2d577b]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2d577b] px-4 text-xs font-bold text-white transition-colors hover:bg-[#316286] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
