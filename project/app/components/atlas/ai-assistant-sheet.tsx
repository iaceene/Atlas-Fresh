'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PlanResult } from '@/utils/types';
import { askAI } from '@/lib/api/ai';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
}

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  role: 'assistant',
  content:
    'I explain the server-computed plan using Google Gemini. I can answer questions about at-risk clients, farm and segment gaps, and local residuals.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

interface AiAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanResult;
}

export function AiAssistantSheet({
  open,
  onOpenChange,
  plan,
}: AiAssistantSheetProps) {
  const storageKey = useMemo(
    () => `atlas-ai-chat:${plan.clients.map((client) => client.client_id).join(',')}:${plan.kpis.actual_received_t}`,
    [plan]
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      return stored ? JSON.parse(stored) : [createWelcomeMessage()];
    } catch {
      return [createWelcomeMessage()];
    }
  });
  const [isStorageReady, setIsStorageReady] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  

  useEffect(() => {
    if (isStorageReady) {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [isStorageReady, messages, storageKey]);

  const sampleQuestions = [
    'Which clients are at risk and why?',
    'Which farm/segment gaps matter most today?',
    'Why is fruit going local and what is its estimated value?',
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await askAI(q);
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer || 'The assistant returned no answer.',
        sources: res.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || 'AI assistant couldn\'t answer right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([createWelcomeMessage()]);
    setErrorMessage(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-amber-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <SheetTitle>Atlas AI Assistant</SheetTitle>
          </div>
        </div>
        <SheetDescription>
          Operational planning intelligence grounded in current daily export data
        </SheetDescription>
      </SheetHeader>

      <SheetContent className="flex flex-col h-full p-0 space-y-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-amber-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 space-y-1.5 leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200'
                  }`}
                >
                  <p>{msg.content}</p>

                  {/* Sources tag if provided */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                        <BookOpen className="h-3 w-3 text-emerald-600" />
                        <span>Sources:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {msg.sources.map((s, idx) => (
                          <li key={idx} className="truncate" title={s}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <span
                    className={`block text-[10px] text-right ${
                      isUser ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs sm:text-sm items-center text-slate-500">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-amber-300">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-xl px-3.5 py-2 bg-slate-100 border border-slate-200 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>Analyzing plan data...</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center justify-between">
              <span>{errorMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSend(messages[messages.length - 1]?.content)}
                className="h-7 text-xs text-rose-800 hover:bg-rose-100"
              >
                Try again
              </Button>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <HelpCircle className="h-3 w-3" /> Quick suggestions:
            </span>
            <button
              type="button"
              onClick={handleClearChat}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Clear chat
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleQuestions.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(sq)}
                disabled={isLoading}
                className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors cursor-pointer text-left"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              id="ai-question-input"
              type="text"
              placeholder="Ask about today's plan allocations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="text-xs sm:text-sm bg-slate-50/70"
            />
            <Button
              id="ai-send-btn"
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-9 px-3 bg-slate-900 text-white hover:bg-slate-800 shrink-0"
              aria-label="Send question"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
