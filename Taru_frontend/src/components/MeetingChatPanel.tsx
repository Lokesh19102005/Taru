import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'

export interface ChatMessage {
  id: string
  message: string
  senderName: string
  timestamp: number
  isSelf: boolean
}

interface MeetingChatPanelProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  onSend: (message: string) => void
  unreadCount: number
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function MeetingChatPanel({ isOpen, onClose, messages, onSend, unreadCount: _ }: MeetingChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative ml-auto w-[360px] max-w-[90vw] bg-[#2d2e31] shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={20} className="text-[#8ab4f8]" />
            <h3 className="text-[#e8eaed] text-sm font-semibold">In-call messages</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={40} className="text-[#5f6368] mb-3" />
              <p className="text-[#9aa0a6] text-sm font-medium">No messages yet</p>
              <p className="text-[#5f6368] text-xs mt-1">
                Messages are only visible to people in the call<br />
                and are deleted when the call ends
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}
              >
                {/* Sender name (only for received messages) */}
                {!msg.isSelf && (
                  <span className="text-[#8ab4f8] text-[10px] font-medium mb-0.5 px-1">
                    {msg.senderName}
                  </span>
                )}
                
                <div 
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.isSelf 
                      ? 'bg-[#8ab4f8] text-[#202124] rounded-br-md' 
                      : 'bg-[#3c4043] text-[#e8eaed] rounded-bl-md'
                  }`}
                >
                  {msg.message}
                </div>
                
                <span className="text-[#5f6368] text-[10px] mt-0.5 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-[#3c4043]">
          <div className="flex items-center gap-2 bg-[#3c4043] rounded-full px-4 py-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-transparent text-[#e8eaed] text-sm py-2 outline-none placeholder-[#9aa0a6]"
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8ab4f8] hover:bg-[#4a4d51] transition-colors disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[#5f6368] text-[10px] mt-2 text-center">
            Messages are not saved after the call ends
          </p>
        </div>
      </div>
    </div>
  )
}
