import { useState } from 'react'
import COLORS from '../../lib/theme'

export default function TalkView() {
  const [message, setMessage] = useState('')
  const messages = [
    { from: 'peer', text: "Hey! I'm Rahul, a fellow student here to listen. How are you doing today?", time: '10:02am' },
    { from: 'me', text: "Hi Rahul. Honestly feeling pretty overwhelmed with exams coming up.", time: '10:03am' },
    { from: 'peer', text: "That's completely understandable — exam season is really tough. Want to tell me more about what's weighing on you the most right now?", time: '10:04am' },
  ]

  return (
    <div className="max-w-lg mx-auto h-[calc(100vh-130px)] flex flex-col">
      <div className="rounded-2xl border flex flex-col flex-1 overflow-hidden" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: COLORS.border }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: COLORS.muted, color: COLORS.fg }}>R</div>
          <div>
            <div className="text-sm font-bold" style={{ color: COLORS.fg }}>Rahul K.</div>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.fg3 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Fellow student · Online now
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
                style={{ background: m.from === 'me' ? COLORS.primary : COLORS.muted, color: m.from === 'me' ? '#fff' : COLORS.fg }}
              >
                <p className="leading-relaxed">{m.text}</p>
                <p className="text-[10px] mt-1 text-right" style={{ color: m.from === 'me' ? 'rgba(255,255,255,0.45)' : COLORS.fg3 }}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2" style={{ borderColor: COLORS.border }}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: COLORS.muted, color: COLORS.fg }}
          />
          <button className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-80" style={{ background: COLORS.primary, color: '#fff' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
