import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Info,
  Database,
  Building2,
  AlertTriangle,
  ChevronDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { MSME, ChatMessage } from '../types';
import { api } from '../services/api';

interface ChatbotProps {
  currentBorrower: MSME;
}

export const Chatbot: React.FC<ChatbotProps> = ({ currentBorrower }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [assistantMode, setAssistantMode] = useState<'ai' | 'demo'>('demo');
  const [lastError, setLastError] = useState<string | null>(null);

  // Initial welcome message
  const initialMessages: ChatMessage[] = [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! I am the **CrediLens Intelligence Assistant**.\n\nI can analyze operational signals, explain risk scores, forecast cash flow, evaluate What-If stress scenarios, and summarize fairness audits for **${currentBorrower.business_name} (${currentBorrower.msme_id})** or the broader 127 MSME portfolio.\n\nHow can I support your underwriting assessment today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      data_sources: [`${currentBorrower.business_name} Operational Profile (${currentBorrower.msme_id})`],
      mode: 'demo'
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Dynamic suggested questions based on selected borrower
  const suggestedQuestions = [
    `Why is ${currentBorrower.business_name} risky?`,
    "Explain the cash-flow forecast.",
    "What happens under moderate stress?",
    "What does DSCR mean for this business?",
    "Which MSMEs have the highest risk?",
    "Explain the model's performance.",
    "Summarize the fairness audit."
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setLastError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text, currentBorrower.msme_id, currentBorrower);
      setAssistantMode(response.mode);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_sources: response.data_sources,
        mode: response.mode
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setLastError(err?.message || 'Unable to communicate with assistant. Please try again.');
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I encountered an error retrieving that analysis. Please click **Retry** below.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        mode: assistantMode
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. I am analyzing **${currentBorrower.business_name} (${currentBorrower.msme_id})** in the **${currentBorrower.sector}** sector. What would you like to investigate?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_sources: [`${currentBorrower.business_name} Operational Profile (${currentBorrower.msme_id})`],
        mode: assistantMode
      }
    ]);
    setLastError(null);
  };

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.text);
    }
  };

  // Helper to render basic markdown formatting cleanly
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Check for markdown headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A] mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="pl-3 py-1 my-1.5 border-l-2 border-[#FF7A1A] bg-[#332015]/40 text-[#F5F5F5] italic text-[11px] rounded-r">
            {line.replace('> ', '')}
          </blockquote>
        );
      }

      // Format bold text **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-[#F5F5F5]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <div key={idx} className={line.trim() === '' ? 'h-1.5' : 'leading-relaxed'}>
          {formattedParts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-95 text-white rounded-full shadow-2xl border border-[#75401F] transition-all group"
        aria-label="Open CrediLens Intelligence Assistant"
      >
        <div className="relative flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#22A477] rounded-full border-2 border-[#171719] animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold tracking-tight leading-none text-white">
            Intelligence Assistant
          </div>
          <div className="text-[10px] text-orange-100 mt-0.5 font-medium leading-none truncate max-w-[150px]">
            {currentBorrower.business_name}
          </div>
        </div>
      </button>

      {/* Floating Chat Panel Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[600px] max-h-[85vh] bg-[#171719] border border-[#303035] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Chat Header */}
          <div className="p-3.5 bg-[#141416] border-b border-[#303035] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#332015] border border-[#75401F] flex items-center justify-center text-[#FF7A1A]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#F5F5F5] tracking-tight">
                    CrediLens Assistant
                  </h3>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                      assistantMode === 'ai'
                        ? 'bg-[#22A477]/15 text-[#22A477] border-[#22A477]/30'
                        : 'bg-[#332015] text-[#FF7A1A] border-[#75401F]'
                    }`}
                  >
                    {assistantMode === 'ai' ? 'AI Assistant' : 'Demo Assistant'}
                  </span>
                </div>
                <div className="text-[10px] text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3 h-3 text-[#71717A]" />
                  <span className="truncate max-w-[200px] font-medium">
                    {currentBorrower.business_name} ({currentBorrower.msme_id})
                  </span>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mandatory Regulatory / Safety Disclaimer */}
          <div className="px-3.5 py-2 bg-[#332015]/50 border-b border-[#75401F]/40 text-[10px] text-[#A1A1AA] flex items-start gap-1.5 shrink-0">
            <Info className="w-3.5 h-3.5 text-[#FF7A1A] shrink-0 mt-0.5" />
            <span className="leading-snug">
              This assistant explains synthetic demonstration data and model outputs. It does not automate lending decisions.
            </span>
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-[#F5F5F5] bg-[#0D0D0F]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[#71717A] mb-1 px-1">
                  {msg.sender === 'user' ? (
                    <>
                      <span className="text-[#A1A1AA]">Underwriter</span>
                      <User className="w-3 h-3 text-[#FF7A1A]" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-[#FF7A1A]" />
                      <span className="text-[#A1A1AA]">CrediLens Assistant</span>
                      {msg.mode && (
                        <span className="text-[9px] font-mono uppercase text-[#71717A]">
                          • {msg.mode}
                        </span>
                      )}
                    </>
                  )}
                  <span>• {msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed shadow-xs text-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#332015] border border-[#75401F] text-[#F5F5F5] rounded-tr-xs'
                      : msg.isError
                      ? 'bg-[#EF5350]/15 border border-[#EF5350]/30 text-[#EF5350] rounded-tl-xs'
                      : 'bg-[#171719] border border-[#303035] text-[#F5F5F5] rounded-tl-xs'
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {msg.isError && (
                    <button
                      onClick={handleRetry}
                      className="mt-2.5 px-3 py-1 bg-[#EF5350] hover:bg-red-700 text-white rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Request</span>
                    </button>
                  )}
                </div>

                {/* Data Sources Pill (Assistant only) */}
                {msg.sender === 'assistant' && msg.data_sources && msg.data_sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
                    <span className="text-[9px] text-[#71717A] font-medium flex items-center gap-1">
                      <Database className="w-2.5 h-2.5 text-[#FF7A1A]" />
                      Sources:
                    </span>
                    {msg.data_sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-start space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-[#71717A] px-1">
                  <Bot className="w-3 h-3 text-[#FF7A1A]" />
                  <span>CrediLens Assistant is analyzing...</span>
                </div>
                <div className="p-3 bg-[#171719] border border-[#303035] rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Horizontal Scroller */}
          <div className="p-2 bg-[#141416] border-t border-[#303035] shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] px-1 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FF7A1A]" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#1E1E21] hover:bg-[#332015] border border-[#303035] hover:border-[#75401F] text-[11px] text-[#A1A1AA] hover:text-[#FF7A1A] transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box and Send Controls */}
          <div className="p-3 bg-[#141416] border-t border-[#303035] shrink-0 space-y-1.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${currentBorrower.business_name}, risk factors, cash flow...`}
                className="flex-1 bg-[#171719] border border-[#303035] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#FF7A1A] resize-none max-h-24 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-[#FF7A1A] hover:bg-[#FF8F3D] disabled:bg-[#1E1E21] disabled:text-[#71717A] text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[10px] text-[#71717A] text-center font-mono">
              Press Enter ↵ to send • Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  );
};
