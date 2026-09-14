import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import COLORS from "../../lib/theme";
import { sendChatbotMessage } from "../../api/chatbot";

const CHAT_STORAGE_KEY = "taru_chatbot_messages";
const CHAT_RETENTION_MS = 24 * 60 * 60 * 1000;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm Taru's wellbeing assistant. You can share what has been on your mind, and I'll help you reflect on it.",
};

const SUGGESTIONS = [
  "I'm feeling overwhelmed",
  "Help me relax",
  "I can't sleep well",
];

export default function ChatbotView() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!saved) return [initialMessage];
      const parsed = JSON.parse(saved) as { savedAt: number; messages: ChatMessage[] };
      if (Date.now() - parsed.savedAt > CHAT_RETENTION_MS || !Array.isArray(parsed.messages)) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        return [initialMessage];
      }
      return parsed.messages.length > 0 ? parsed.messages : [initialMessage];
    } catch {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return [initialMessage];
    }
  });

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer for loading state
  useEffect(() => {
    if (isSending) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSending]);

  useEffect(() => {
    const toStore = messages.filter((m) => m.id !== initialMessage.id);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), messages: toStore }));
  }, [messages]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isSending]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isSending) return;
    setErrorMessage("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages((c) => [...c, userMessage]);
    setIsSending(true);

    try {
      const result = await sendChatbotMessage(msg);
      setMessages((c) => [...c, { id: `a-${Date.now()}`, role: "assistant", content: result.response }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const handleClear = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([initialMessage]);
    setErrorMessage("");
  };

  const isOnlyWelcome = messages.length === 1;

  const thinkingText =
    elapsed < 4 ? "Thinking" :
    elapsed < 8 ? "Still thinking" :
    elapsed < 13 ? "Waking up — hang tight" :
    "Almost there";

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col">

      {/* ─── Chat Container ─── */}
      <div
        className="flex flex-1 min-h-0 flex-col rounded-3xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        }}
      >

        {/* ── Slim Top Bar ── */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: '#f1f5f9' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: COLORS.primary }}
            >
              <Bot size={15} color="#fff" />
              {/* green dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: COLORS.fg }}>Taru AI</span>
              <span className="ml-2 text-[10px] font-medium" style={{ color: COLORS.fg3 }}>
                {isSending ? "typing…" : "online"}
              </span>
            </div>
          </div>
          <button
            onClick={handleClear}
            disabled={isSending}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors hover:bg-slate-100"
            style={{ color: COLORS.fg3 }}
            title="Clear conversation"
          >
            <RotateCcw size={12} />
            New chat
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-3">

          {/* Disclaimer — inline, minimal */}
          <div className="text-center mb-3">
            <p className="inline-block text-[10px] rounded-full px-3 py-1" style={{ background: '#f8fafc', color: COLORS.fg3 }}>
              Taru AI helps you reflect — it's not a doctor or emergency service
            </p>
          </div>

          {/* Welcome empty state */}
          {isOnlyWelcome && (
            <div className="flex flex-col items-center pt-6 pb-4" style={{ animation: 'fadeIn 0.5s ease-out both' }}>
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: COLORS.muted }}
              >
                <Sparkles size={28} style={{ color: COLORS.primary }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: COLORS.fg }}>
                What's on your mind?
              </p>
              <p className="text-xs mb-5 max-w-xs text-center leading-relaxed" style={{ color: COLORS.fg2 }}>
                Talk about anything — stress, sleep, relationships, or just how your day went.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void handleSend(s)}
                    className="rounded-full border px-3.5 py-2 text-xs font-medium transition-all hover:border-teal-300 hover:bg-teal-50 active:scale-95"
                    style={{ borderColor: '#e2e8f0', color: COLORS.fg }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                style={{ animation: 'fadeIn 0.25s ease-out both' }}
              >
                <div className={`flex gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
                  {!isUser && (
                    <div
                      className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: COLORS.primary }}
                    >
                      <Bot size={12} color="#fff" />
                    </div>
                  )}
                  <div
                    className="px-3.5 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      background: isUser ? COLORS.primary : '#f1f5f9',
                      color: isUser ? '#fff' : COLORS.fg,
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Loading / Thinking ── */}
          {isSending && (
            <div className="flex justify-start" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
              <div className="flex gap-2 max-w-[80%]">
                <div
                  className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: COLORS.primary }}
                >
                  <Bot size={12} color="#fff" />
                </div>
                <div
                  className="px-4 py-3 rounded-[18px] rounded-bl-[4px]"
                  style={{ background: '#f1f5f9' }}
                >
                  {/* Animated wave dots */}
                  <div className="flex items-center gap-2.5">
                    <svg width="32" height="16" viewBox="0 0 32 16">
                      <circle cx="4" cy="8" r="3" fill={COLORS.primary} opacity="0.9">
                        <animate attributeName="cy" values="8;3;8" dur="0.8s" repeatCount="indefinite" begin="0s" />
                      </circle>
                      <circle cx="16" cy="8" r="3" fill={COLORS.primary} opacity="0.7">
                        <animate attributeName="cy" values="8;3;8" dur="0.8s" repeatCount="indefinite" begin="0.15s" />
                      </circle>
                      <circle cx="28" cy="8" r="3" fill={COLORS.primary} opacity="0.5">
                        <animate attributeName="cy" values="8;3;8" dur="0.8s" repeatCount="indefinite" begin="0.3s" />
                      </circle>
                    </svg>
                    <span className="text-[11px] font-medium" style={{ color: COLORS.fg3 }}>
                      {thinkingText}
                    </span>
                  </div>

                  {/* Progress indicator for cold start */}
                  {elapsed >= 5 && (
                    <div
                      className="mt-2 overflow-hidden rounded-full"
                      style={{ height: 3, background: '#e2e8f0' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: COLORS.primary,
                          width: `${Math.min((elapsed / 20) * 100, 92)}%`,
                          transition: 'width 1s linear',
                        }}
                      />
                    </div>
                  )}
                  {elapsed >= 8 && (
                    <p
                      className="mt-1.5 text-[10px]"
                      style={{ color: COLORS.fg3, animation: 'fadeIn 0.4s ease-out both' }}
                    >
                      First reply may take a few extra seconds ☕
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            className="mx-4 mb-2 rounded-lg px-3 py-2 text-xs"
            style={{ background: '#fef2f2', color: '#dc2626' }}
          >
            {errorMessage}
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-4 pb-4 pt-2">
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2.5 transition-all"
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
            }}
            onFocus={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = COLORS.primary;
              el.style.boxShadow = `0 0 0 3px ${COLORS.primary}15`;
            }}
            onBlur={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#e2e8f0';
              el.style.boxShadow = 'none';
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              rows={1}
              maxLength={4000}
              placeholder="Type a message..."
              className="flex-1 resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-slate-400"
              style={{ color: COLORS.fg, minHeight: '24px', maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isSending}
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:scale-100"
              style={{ background: (!input.trim() || isSending) ? '#cbd5e1' : COLORS.primary }}
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px]" style={{ color: COLORS.fg3 }}>
            ↵ Send · ⇧↵ New line
          </p>
        </div>
      </div>
    </div>
  );
}
