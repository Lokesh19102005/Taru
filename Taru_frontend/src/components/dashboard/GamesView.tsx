import { useState } from 'react'
import { Cloud, Sparkles, Sun, ChevronRight } from 'lucide-react'
import COLORS from '../../lib/theme'

export default function GamesView() {
  const [active, setActive] = useState<string | null>(null)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')

  const startBreath = () => {
    setActive('breath')
    const seq: { phase: 'inhale' | 'hold' | 'exhale'; dur: number }[] = [
      { phase: 'inhale', dur: 4000 },
      { phase: 'hold', dur: 4000 },
      { phase: 'exhale', dur: 6000 },
    ]
    let t = 0
    seq.forEach(({ phase, dur }) => {
      setTimeout(() => setBreathPhase(phase), t)
      t += dur
    })
  }

  const games = [
    { id: 'breath', icon: <Cloud size={20} />, title: '4-4-6 Breathing', desc: 'A calming breath technique used by therapists to reduce acute anxiety in under 2 minutes.', tag: 'Anxiety relief' },
    { id: 'grounding', icon: <Sparkles size={20} />, title: '5-4-3-2-1 Grounding', desc: 'Notice 5 things you can see, 4 you can touch, 3 you can hear — anchors you to the present.', tag: 'Mindfulness' },
    { id: 'journal', icon: <Sun size={20} />, title: 'Gratitude Journal', desc: "Write three things you're grateful for. Small or large — studies show it shifts your mood.", tag: 'Mood boost' },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Stress Relief Activities</h2>
      {active === 'breath' ? (
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <p className="text-xs mb-6" style={{ color: COLORS.fg3 }}>Focus on the circle</p>
          <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-4"
              style={{
                borderColor: COLORS.border,
                background: COLORS.muted,
                transform: breathPhase === 'inhale' ? 'scale(1.2)' : breathPhase === 'exhale' ? 'scale(0.8)' : 'scale(1.2)',
                transition: `transform ${breathPhase === 'inhale' ? 4 : breathPhase === 'hold' ? 0.1 : 6}s ease-in-out`,
              }}
            />
            <div className="relative text-center">
              <div className="text-lg font-extrabold" style={{ color: COLORS.fg }}>
                {breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'hold' ? 'Hold' : 'Exhale'}
              </div>
            </div>
          </div>
          <button onClick={() => setActive(null)} className="text-sm hover:underline" style={{ color: COLORS.fg3 }}>← Back</button>
        </div>
      ) : (
        games.map(g => (
          <div
            key={g.id}
            className="rounded-2xl p-5 border flex items-center gap-4 cursor-pointer hover:border-black hover:shadow-sm transition-all group"
            style={{ background: COLORS.card, borderColor: COLORS.border }}
            onClick={() => g.id === 'breath' ? startBreath() : setActive(g.id)}
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors group-hover:bg-black group-hover:text-white" style={{ background: COLORS.muted, color: COLORS.fg }}>
              {g.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold" style={{ color: COLORS.fg }}>{g.title}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>{g.tag}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.fg2 }}>{g.desc}</p>
            </div>
            <ChevronRight size={15} className="shrink-0 transition-colors group-hover:text-black" style={{ color: COLORS.fg4 }} />
          </div>
        ))
      )}
    </div>
  )
}
