'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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

interface AiAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanResult;
  contextId?: string | null;
  contextQuestion?: string | null;
  contextClientId?: string | null;
}

export function AiAssistantSheet({
  open,
  onOpenChange,
  plan,
  contextId,
  contextQuestion,
  contextClientId,
}: AiAssistantSheetProps) {
  const storageKey = useMemo(
    () => `atlas-ai-chat:${plan.clients.map((client) => client.client_id).join(',')}:${plan.kpis.actual_received_t}`,
    [plan]
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Getting data...');
  const lastAutoQuestionRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadingStatuses = useMemo(
    () => [
      'Getting data...',
      'Reading data...',
      'Checking plan logs...',
      'Reviewing exports...',
      'Scanning farm gaps...',
      'Summarizing results...',
      'Preparing answer...',
    ],
    []
  );

  

  useEffect(() => {
    setIsStorageReady(false);

    try {
      const stored = window.localStorage.getItem(storageKey);
      setMessages(stored ? JSON.parse(stored) : []);
    } catch {
      setMessages([]);
    } finally {
      setIsStorageReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isStorageReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [isStorageReady, messages, storageKey]);

  useEffect(() => {
    if (!open) return;

    const id = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });

    return () => window.cancelAnimationFrame(id);
  }, [open, messages, isLoading, errorMessage]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStatus('Getting data...');
      return;
    }

    let index = 0;
    setLoadingStatus(loadingStatuses[index]);

    const interval = window.setInterval(() => {
      index = (index + 1) % loadingStatuses.length;
      setLoadingStatus(loadingStatuses[index]);
    }, 900);

    return () => window.clearInterval(interval);
  }, [isLoading, loadingStatuses]);

  const sampleQuestions = [
    'Hello, who are you?',
    'What is Atlas Fresh exporting today?',
    'Which clients are at risk and why?',
    'Which farm/segment gaps matter most today?',
    'Why is fruit going local and what is its estimated value?',
    'Show me the biggest export shortfalls.',
    'Which farms have the highest local residual value?',
    'What changed in the latest allocation run?',
    'Summarize the top risks in one view.',
  ];

  const showSuggestions = input.trim().length === 0;

  const handleSend = useCallback(async (questionText?: string) => {
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
      const res = await askAI(
        q,
        {
          ...(contextClientId ? { clientId: contextClientId } : {}),
          ...(contextId ? { contextId } : {}),
        }
      );
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
  }, [contextClientId, input, isLoading]);

  useEffect(() => {
    if (!open) {
      lastAutoQuestionRef.current = null;
      return;
    }

    if (!contextQuestion || lastAutoQuestionRef.current === contextQuestion) return;

    lastAutoQuestionRef.current = contextQuestion;
    void handleSend(contextQuestion);
  }, [open, contextQuestion, handleSend]);

  const handleClearChat = () => {
    setMessages([]);
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
          {messages.length === 0 && !isLoading && (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-slate-500">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-amber-300 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">No messages yet</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Ask a question or tap one of the suggested prompts to start the conversation.
              </p>
            </div>
          )}

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
                  {isUser ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="m-0 text-xs sm:text-sm">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-xs sm:text-sm">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-sm">{children}</ol>,
                          li: ({ children }) => <li className="ml-0">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-slate-800 text-white p-3 rounded-lg overflow-x-auto my-2 text-[11px] font-mono">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-600 my-2">
                              {children}
                            </blockquote>
                          ),
                          h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1 text-slate-900">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1 text-slate-900">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold mt-1 mb-0.5 text-slate-900">{children}</h3>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs sm:text-sm">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

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

          <div ref={messagesEndRef} />

          {isLoading && (
            <div className="flex gap-3 text-xs sm:text-sm items-center text-slate-500">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-amber-300">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-xl px-3.5 py-2 bg-slate-100 border border-slate-200 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>{loadingStatus}</span>
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
        {showSuggestions && (
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
        )}

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
