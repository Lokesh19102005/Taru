import { useEffect, useRef, useState } from "react";
import { Bot, Send, ShieldCheck, Sparkles } from "lucide-react";
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

export default function ChatbotView() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);

      if (!saved) {
        return [initialMessage];
      }

      const parsed = JSON.parse(saved) as {
        savedAt: number;
        messages: ChatMessage[];
      };

      const isExpired = Date.now() - parsed.savedAt > CHAT_RETENTION_MS;

      if (isExpired || !Array.isArray(parsed.messages)) {
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const messagesToStore = messages.filter(
      (message) => message.id !== initialMessage.id,
    );

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        messages: messagesToStore,
      }),
    );
  }, [messages]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isSending]);

  const handleSend = async () => {
    const message = input.trim();

    if (!message || isSending) {
      return;
    }

    setErrorMessage("");
    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const result = await sendChatbotMessage(message);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.response,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The wellbeing assistant is temporarily unavailable. Please try again shortly.";

      setErrorMessage(message);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([initialMessage]);
    setErrorMessage("");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col animate-fade-in">
      <div className="mb-5 shrink-0">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: COLORS.gradient }}
            >
              <Bot size={23} color="#fff" />
            </div>

            <div className="min-w-0">
              <h1
                className="truncate text-xl font-extrabold"
                style={{ color: COLORS.fg }}
              >
                Taru AI Assistant
              </h1>
              <p className="text-xs" style={{ color: COLORS.fg2 }}>
                A private space to reflect and talk things through
              </p>
            </div>
          </div>

          <div className="group relative shrink-0">
            <button
              type="button"
              onClick={handleClearChat}
              className="rounded-lg px-3 py-2 text-xs font-bold transition-colors hover:bg-red-50"
              style={{
                color: "#DC2626",
                border: "1px solid #FECACA",
              }}
              disabled={isSending}
            >
              Clear chat
            </button>

            <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-48 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div
                className="rounded-lg border px-3 py-2.5 text-[10px] leading-relaxed shadow-lg"
                style={{
                  background: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.fg2,
                }}
              >
                This clears your view here — the assistant may still recall
                earlier context.
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] leading-tight sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs sm:leading-relaxed"
          style={{
            background: COLORS.gradientSubtle,
            borderColor: COLORS.border,
            color: COLORS.fg2,
          }}
        >
          <ShieldCheck
            size={13}
            className="mt-0.5 shrink-0 sm:h-3.75 sm:w-3.75"
            style={{ color: COLORS.primary }}
          />

          <span>
            Share what is on your mind. Taru AI can help you reflect, but it is
            not a doctor or emergency service.
          </span>
        </div>
      </div>

      {/* The chat box takes up the rest of the fixed height using flex-1 */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm"
        style={{
          background: COLORS.card,
          borderColor: COLORS.border,
        }}
      >
        {/* The messages scroll internally */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 space-y-5 overflow-y-auto p-4 md:p-6"
        >
          {messages.length === 1 && (
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: COLORS.muted }}
              >
                <Sparkles size={21} style={{ color: COLORS.primary }} />
              </div>

              <p className="text-sm font-bold" style={{ color: COLORS.fg }}>
                You do not have to figure everything out alone.
              </p>

              <p
                className="mx-auto mt-1 max-w-sm text-xs leading-relaxed"
                style={{ color: COLORS.fg2 }}
              >
                Start with whatever is easiest. You can talk about your mood,
                stress, relationships, studies, or anything else on your mind.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
                  style={{
                    background: isUser ? COLORS.primary : COLORS.muted,
                    color: isUser ? "#fff" : COLORS.fg,
                    borderBottomRightRadius: isUser ? 5 : undefined,
                    borderBottomLeftRadius: isUser ? undefined : 5,
                  }}
                >
                  {!isUser && (
                    <div
                      className="mb-1 flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: COLORS.primary }}
                    >
                      <Bot size={16} />
                      Taru AI
                    </div>
                  )}

                  {message.content}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div
                className="flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3"
                style={{
                  background: COLORS.muted,
                  color: COLORS.fg2,
                }}
              >
                <span className="text-xs font-semibold">
                  Taru AI is thinking
                </span>

                <span className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: COLORS.primary }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{
                      background: COLORS.primary,
                      animationDelay: "150ms",
                    }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{
                      background: COLORS.primary,
                      animationDelay: "300ms",
                    }}
                  />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {errorMessage && (
          <div
            className="mx-4 mb-3 shrink-0 rounded-xl border px-3 py-2 text-xs leading-relaxed"
            style={{
              borderColor: "#FECACA",
              background: "#FEF2F2",
              color: "#B91C1C",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          className="shrink-0 border-t p-3 md:p-4"
          style={{ borderColor: COLORS.border }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              rows={1}
              maxLength={4000}
              placeholder="Tell me what has been on your mind..."
              className="min-h-12 flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500"
              style={{
                borderColor: COLORS.border2,
                color: COLORS.fg,
                background: "#fff",
              }}
            />

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: COLORS.primary }}
            >
              <Send size={17} />
            </button>
          </div>

          <p className="mt-2 text-[10px]" style={{ color: COLORS.fg3 }}>
            Enter to send. Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
