'use client';

import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: string;
};

const SUGGESTED_PROMPTS = [
  'What is our company leave policy for sick and earned leaves?',
  'What was my latest monthly salary and statutory deductions breakdown?',
  'Generate an enterprise Job Description for Senior Full-Stack Engineer',
  'What are the key compliance requirements under the POSH Act 2026?',
  'Provide an executive overview of active headcount and pending approvals',
];

export default function CopilotPage() {
  const { currentUser } = useHRMS();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: `👋 Hello **${currentUser.name}**! I am your **Antigravity AI HR Copilot**.\n\nI can assist you with:\n• **HR & Compliance Policies** (Leave, WFH, Attendance, POSH)\n• **Personal Compensation & Benefits** (Payslips, Deductions, Claims)\n• **Recruitment & ATS** (Job Descriptions, Candidate screening summaries)\n• **Workforce Analytics & Operations** (Shifts, Leave approvals)\n\n*Note: Strict Role-Based Access Control (RBAC) guardrails protect confidential peer data.*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          userId: currentUser.id,
          userRole: currentUser.userRole,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: json.data.reply,
            intent: json.data.intent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (err) {
      console.error('Failed to send Copilot prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D9E5EE]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#17324A] via-[#234B68] to-[#315B76] text-white flex items-center justify-center shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#17324A] flex items-center gap-2">
              AI HR Copilot
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2F8] text-[#17324A] border border-[#B0D0EA]">
                RBAC Protected
              </span>
            </h1>
            <p className="text-xs text-[#667085]">
              Intelligent contextual HR assistant for policies, compensation, job descriptions, and operations.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <Zap className="h-3.5 w-3.5" /> Active Session: {currentUser.name} ({currentUser.userRole.toUpperCase()})
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> Quick Prompts:
        </span>
        {SUGGESTED_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E5EE] hover:border-[#9FC2DC] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-medium whitespace-nowrap shadow-2xs transition-all cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-[#D9E5EE] p-6 shadow-inner space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-[#17324A] text-white'
                    : 'bg-[#EAF2F8] text-[#17324A] border border-[#B0D0EA]'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-[#17324A] text-white rounded-tr-none'
                    : 'bg-[#F8FAFC] text-[#17324A] border border-[#EAF2F8] rounded-tl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line font-normal">{msg.content}</div>
                <div
                  className={`text-[9px] font-semibold text-right ${
                    isUser ? 'text-white/60' : 'text-[#8A9AAA]'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#EAF2F8] text-[#17324A] flex items-center justify-center border border-[#B0D0EA]">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#EAF2F8] text-xs text-[#667085] flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              Thinking and formulating contextual HR response...
            </div>
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-[#9FC2DC] shadow-md focus-within:ring-2 focus-within:ring-[#B0D0EA]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot about policies, payslips, benefits, job descriptions, or leave balances..."
          className="flex-1 px-3 py-2 text-xs text-[#17324A] outline-none bg-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          Ask Copilot
        </button>
      </form>
    </div>
  );
}
