import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Search, X, Send, LogOut, ArrowRight, Shield, Heart, Users } from 'lucide-react'
import COLORS from '../../lib/theme'
import { socket, connectSocket } from '../../lib/socket'

interface ChatMessage {
  id: string
  from: 'me' | 'peer'
  text: string
  timestamp: number
}

type ViewState = 'landing' | 'searching' | 'chatting' | 'ended'

export default function TalkView() {
  const [viewState, setViewState] = useState<ViewState>('landing')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [endReason, setEndReason] = useState<'you' | 'partner'>('you')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Socket event handlers
  useEffect(() => {
    connectSocket()

    const onRoomState = (data: { status: string }) => {
      if (data.status === 'waiting') {
        setViewState('searching')
      } else if (data.status === 'left') {
        setViewState('landing')
      }
    }

    const onChatMatched = (data: { roomId: string; partnerName: string }) => {
      setRoomId(data.roomId)
      setPartnerName(data.partnerName)
      setMessages([])
      setViewState('chatting')
    }

    const onReceiveMessage = (data: { text: string; timestamp: number }) => {
      const msg: ChatMessage = {
        id: `peer-${Date.now()}-${Math.random()}`,
        from: 'peer',
        text: data.text,
        timestamp: data.timestamp,
      }
      setMessages(prev => [...prev, msg])
    }

    const onPartnerLeft = () => {
      setEndReason('partner')
      setViewState('ended')
    }

    socket.on('room_state', onRoomState)
    socket.on('chat_matched', onChatMatched)
    socket.on('chat_receive_message', onReceiveMessage)
    socket.on('chat_partner_left', onPartnerLeft)

    return () => {
      socket.off('room_state', onRoomState)
      socket.off('chat_matched', onChatMatched)
      socket.off('chat_receive_message', onReceiveMessage)
      socket.off('chat_partner_left', onPartnerLeft)
    }
  }, [])

  const handleStartSearching = () => {
    connectSocket()
    socket.emit('chat_join_queue')
  }

  const handleCancelSearch = () => {
    socket.emit('chat_leave_queue')
    setViewState('landing')
  }

  const handleSendMessage = () => {
    const text = inputText.trim()
    if (!text || !roomId) return

    socket.emit('chat_message', { roomId, text })

    const msg: ChatMessage = {
      id: `me-${Date.now()}-${Math.random()}`,
      from: 'me',
      text,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])
    setInputText('')
    inputRef.current?.focus()
  }

  const handleStopChat = () => {
    socket.emit('chat_stopped', { roomId })
    setEndReason('you')
    setViewState('ended')
  }

  const handleBackToLanding = () => {
    setMessages([])
    setPartnerName('')
    setRoomId('')
    setViewState('landing')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // ─── LANDING ────────────────────────────────────────────────
  if (viewState === 'landing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-4 animate-fade-in">
        {/* Hero Card */}
        <div className="w-full max-w-md">
          {/* Emoji header */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}
              >
                <MessageCircle size={36} className="text-white md:hidden" />
                <MessageCircle size={44} className="text-white hidden md:block" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-2" style={{ color: COLORS.fg }}>
            Talk to Someone
          </h1>
          <p className="text-sm md:text-base text-center mb-8 leading-relaxed" style={{ color: COLORS.fg2 }}>
            Connect anonymously with a fellow student. Share your thoughts, vent about exams, or just have a friendly chat.
          </p>

          {/* Guidelines */}
          <div
            className="rounded-2xl border p-4 md:p-5 mb-6 space-y-3"
            style={{ background: COLORS.card, borderColor: COLORS.border }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4' }}>
                <Shield size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold" style={{ color: COLORS.fg }}>Your identity is hidden</p>
                <p className="text-xs" style={{ color: COLORS.fg3 }}>You'll appear with a random name. No personal info is shared.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fef2f2' }}>
                <Heart size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold" style={{ color: COLORS.fg }}>Be kind & respectful</p>
                <p className="text-xs" style={{ color: COLORS.fg3 }}>Treat others the way you'd like to be treated.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff' }}>
                <Users size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold" style={{ color: COLORS.fg }}>You can leave anytime</p>
                <p className="text-xs" style={{ color: COLORS.fg3 }}>Click stop whenever you want — no pressure.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartSearching}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 md:py-4 rounded-2xl text-sm md:text-base font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: COLORS.primary }}
          >
            Start Talking
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ─── SEARCHING ──────────────────────────────────────────────
  if (viewState === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-4 animate-fade-in">
        <div className="w-full max-w-sm text-center">
          {/* Animated search icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div
                className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center"
                style={{ background: COLORS.muted }}
              >
                <Search size={36} className="md:hidden" style={{ color: COLORS.fg2 }} />
                <Search size={44} className="hidden md:block" style={{ color: COLORS.fg2 }} />
              </div>
              {/* Pulsing rings */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: COLORS.primary }}
              />
              <div
                className="absolute -inset-3 rounded-full animate-pulse opacity-10"
                style={{ background: COLORS.primary }}
              />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold mb-2" style={{ color: COLORS.fg }}>
            Looking for someone…
          </h2>
          <p className="text-sm mb-8" style={{ color: COLORS.fg3 }}>
            Hang tight! We're connecting you with a fellow student.
          </p>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLORS.fg3, animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLORS.fg3, animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLORS.fg3, animationDelay: '300ms' }} />
          </div>

          <button
            onClick={handleCancelSearch}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-red-50"
            style={{ color: '#cc0000', border: '1px solid #fecaca' }}
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ─── ENDED ──────────────────────────────────────────────────
  if (viewState === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-4 animate-fade-in">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: COLORS.muted }}
            >
              <MessageCircle size={36} style={{ color: COLORS.fg3 }} />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold mb-2" style={{ color: COLORS.fg }}>
            Chat Ended
          </h2>
          <p className="text-sm mb-8" style={{ color: COLORS.fg3 }}>
            {endReason === 'partner'
              ? 'Your chat partner has left the conversation.'
              : 'You ended the conversation.'}
          </p>

          <button
            onClick={handleBackToLanding}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: COLORS.primary }}
          >
            <MessageCircle size={18} />
            Talk to Someone New
          </button>
        </div>
      </div>
    )
  }

  // ─── CHATTING ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-130px)] max-w-lg mx-auto">
      {/* Chat container */}
      <div
        className="flex flex-col flex-1 rounded-2xl border overflow-hidden shadow-sm"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        {/* ── Header ── */}
        <div
          className="px-4 py-3 md:px-5 md:py-4 flex items-center justify-between border-b backdrop-blur-sm shrink-0"
          style={{ borderColor: COLORS.border, background: 'rgba(255,255,255,0.85)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #0D9488, #059669)', color: '#fff' }}
              >
                {partnerName.charAt(0)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: COLORS.fg }}>{partnerName}</p>
              <p className="text-[11px] flex items-center gap-1" style={{ color: COLORS.fg3 }}>
                Fellow student · Online now
              </p>
            </div>
          </div>
          <button
            onClick={handleStopChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-red-50 active:scale-95"
            style={{ color: '#cc0000', border: '1px solid #fecaca' }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Stop</span>
          </button>
        </div>

        {/* ── Messages ── */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-4 space-y-2.5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: COLORS.muted }}
              >
                <MessageCircle size={24} style={{ color: COLORS.fg4 }} />
              </div>
              <p className="text-xs font-medium" style={{ color: COLORS.fg3 }}>
                You're connected! Say hello 👋
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'slideUp 0.25s ease-out' }}
            >
              <div
                className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.from === 'me'
                    ? 'rounded-br-md'
                    : 'rounded-bl-md'
                }`}
                style={{
                  background: m.from === 'me' ? COLORS.primary : COLORS.muted,
                  color: m.from === 'me' ? '#fff' : COLORS.fg,
                }}
              >
                <p className="leading-relaxed break-words whitespace-pre-wrap">{m.text}</p>
                <p
                  className="text-[10px] mt-1 text-right"
                  style={{ color: m.from === 'me' ? 'rgba(255,255,255,0.5)' : COLORS.fg3 }}
                >
                  {formatTime(m.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div
          className="px-3 py-3 md:px-4 md:py-3.5 border-t flex items-center gap-2 shrink-0"
          style={{ borderColor: COLORS.border, background: COLORS.card }}
        >
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-black/5"
            style={{ background: COLORS.muted, color: COLORS.fg }}
            autoComplete="off"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shrink-0"
            style={{ background: COLORS.primary }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      {/* CSS Animation for message slide-up */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
