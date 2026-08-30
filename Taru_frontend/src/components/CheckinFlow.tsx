import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../lib/theme'
import { useSubmitCheckin } from '../api/checkin'

interface CheckFlowProps {
  isGuest?: boolean
}

const MOOD_OPTIONS = [
  { label: 'Very Happy', score: 0, emoji: '😄' },
  { label: 'Happy', score: 1, emoji: '🙂' },
  { label: 'Neutral', score: 2, emoji: '😐' },
  { label: 'Stressed', score: 3, emoji: '😕' },
  { label: 'Sad', score: 4, emoji: '😢' },
]

const ENERGY_OPTIONS = [
  { label: 'Very Energetic', score: 0 },
  { label: 'Energetic', score: 1 },
  { label: 'Neutral', score: 2 },
  { label: 'Tired', score: 3 },
  { label: 'Very Tired', score: 4 },
]

const STRESS_OPTIONS = [
  { label: 'Not at all', score: 0 },
  { label: 'A little', score: 1 },
  { label: 'Moderately', score: 2 },
  { label: 'Quite a lot', score: 3 },
  { label: 'Extremely', score: 4 },
]

const SLEEP_OPTIONS = [
  { label: 'Very Well', score: 0 },
  { label: 'Well', score: 1 },
  { label: 'Average', score: 2 },
  { label: 'Poorly', score: 3 },
  { label: 'Very Poorly', score: 4 },
]

const FOCUS_OPTIONS = [
  { label: 'Very Easy', score: 0 },
  { label: 'Easy', score: 1 },
  { label: 'Neutral', score: 2 },
  { label: 'Difficult', score: 3 },
  { label: 'Very Difficult', score: 4 },
]

const SUPPORT_OPTIONS = [
  { label: 'Very Supported', score: 0 },
  { label: 'Supported', score: 1 },
  { label: 'Neutral', score: 2 },
  { label: 'Slightly Isolated', score: 3 },
  { label: 'Very Isolated', score: 4 },
]

const MOTIVATION_OPTIONS = [
  { label: 'Very Motivated', score: 0 },
  { label: 'Motivated', score: 1 },
  { label: 'Neutral', score: 2 },
  { label: 'Unmotivated', score: 3 },
  { label: 'Very Unmotivated', score: 4 },
]

export default function CheckinFlow({ isGuest }: CheckFlowProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useSubmitCheckin()

  const [step, setStep] = useState(0)
  const [mood, setMood] = useState<{ label: string; score: number } | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [sleep, setSleep] = useState<number | null>(null)
  const [concentration, setConcentration] = useState<number | null>(null)
  const [support, setSupport] = useState<number | null>(null)
  const [motivation, setMotivation] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [done, setDone] = useState(false)

  const total = 8
  const pct = Math.round((step / total) * 100)

  const handleBack = () => {
    if (isGuest) {
      navigate('/')
    } else {
      navigate('/dashboard')
    }
  }

  const handleDone = () => {
    if (isGuest) {
      navigate('/auth')
    } else {
      navigate('/dashboard')
    }
  }

  const handleSubmit = () => {
    if (
      mood === null ||
      energy === null ||
      stress === null ||
      sleep === null ||
      concentration === null ||
      support === null ||
      motivation === null
    ) {
      return
    }

    mutation.mutate(
      {
        mood,
        energy,
        stress,
        sleep,
        concentration,
        support,
        motivation,
        feedback,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['checkin-history'] })
          queryClient.invalidateQueries({ queryKey: ['checkin-today'] })
          setDone(true)
        },
        onError: () => {
          setDone(true)
        },
      }
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: COLORS.bg }}>
        <div className="max-w-md w-full text-center py-16">
          <div className="text-5xl mb-5">🌿</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: COLORS.fg }}>Shukriya, sharing ke liye</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: COLORS.fg2 }}>
            Aaj aapne apne liye time nikala — yeh chhoti si cheez bahut matter karti hai.
            {isGuest
              ? ' Create an account to track your wellbeing over time.'
              : ' Your check-in has been recorded.'}
          </p>
          {isGuest && (
            <button
              onClick={handleDone}
              className="w-full py-3 rounded-xl font-semibold text-sm mb-3 transition-all"
              style={{ background: COLORS.primary, color: '#fff' }}
            >
              Create a free account
            </button>
          )}
          <button
            onClick={handleBack}
            className="text-sm font-medium transition-colors"
            style={{ color: COLORS.fg3 }}
          >
            ← {isGuest ? 'Back to home' : 'Back to dashboard'}
          </button>
          <p
            className="mt-10 text-[10px] tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg4 }}
          >
            taru · cogniease techno labs pvt. ltd. · prayagraj
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg }}>
      {/* Progress bar */}
      <div
        className="sticky top-0 z-50 border-b px-6 py-3"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <span
            className="text-sm font-semibold tracking-widest"
            style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg }}
          >
            taru
          </span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: COLORS.muted }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: COLORS.primary }}
            />
          </div>
          <span
            className="text-[11px] whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}
          >
            {step} of {total}
          </span>
          <button onClick={handleBack} className="transition-colors" style={{ color: COLORS.fg3 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-6 py-8">
        {/* Step 0 — Intro */}
        {step === 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>daily check-in</p>
            <h1 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>Welcome to your daily check-in.</h1>
            <p className="text-sm leading-relaxed mb-8" style={{ color: COLORS.fg2 }}>
              Take a moment to reflect on your day. This quick check-in helps you track your wellbeing, energy, and stress over time.
            </p>
            <button
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: COLORS.primary, color: '#fff' }}
              onClick={() => setStep(1)}
            >
              let's begin →
            </button>
          </div>
        )}

        {/* Step 1 — Mood */}
        {step === 1 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>mood</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How are you feeling today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>No right answer. Just what is true right now.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setMood({ label: m.label, score: m.score })}
                  className="p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all"
                  style={{
                    borderColor: mood?.score === m.score ? COLORS.primary : COLORS.border,
                    background: mood?.score === m.score ? COLORS.muted : COLORS.card,
                  }}
                >
                  <span className="text-2xl shrink-0">{m.emoji}</span>
                  <div>
                    <div className="text-sm font-bold" style={{ color: COLORS.fg }}>{m.label}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={mood === null}
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Energy */}
        {step === 2 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>energy</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How energetic did you feel today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Reflect on your overall energy levels.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {ENERGY_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setEnergy(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: energy === m.score ? COLORS.primary : COLORS.border,
                    background: energy === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={energy === null}
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Academic Stress */}
        {step === 3 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>academic stress</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How stressed did your studies or assignments make you feel today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Consider classes, homework, and exams.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {STRESS_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setStress(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: stress === m.score ? COLORS.primary : COLORS.border,
                    background: stress === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={stress === null}
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Sleep */}
        {step === 4 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>sleep</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How well did you sleep last night?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Think about sleep quality and duration.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {SLEEP_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setSleep(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: sleep === m.score ? COLORS.primary : COLORS.border,
                    background: sleep === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={sleep === null}
                onClick={() => setStep(5)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Focus */}
        {step === 5 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>focus</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How easy was it to concentrate on your studies today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Reflect on your ability to stay focused and productive.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {FOCUS_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setConcentration(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: concentration === m.score ? COLORS.primary : COLORS.border,
                    background: concentration === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={concentration === null}
                onClick={() => setStep(6)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 6 — Social Connection */}
        {step === 6 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>social connection</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>Did you feel supported by friends, classmates, or family today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Your connections and support system.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {SUPPORT_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setSupport(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: support === m.score ? COLORS.primary : COLORS.border,
                    background: support === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(5)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={support === null}
                onClick={() => setStep(7)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 7 — Motivation */}
        {step === 7 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>motivation</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>How motivated did you feel to complete your work today?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>Drive and willingness to get things done.</p>
            <div className="flex flex-col gap-2.5 mb-8">
              {MOTIVATION_OPTIONS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setMotivation(m.score)}
                  className="p-4 rounded-xl border-2 text-sm font-bold text-left transition-all"
                  style={{
                    borderColor: motivation === m.score ? COLORS.primary : COLORS.border,
                    background: motivation === m.score ? COLORS.muted : COLORS.card,
                    color: COLORS.fg,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(6)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={motivation === null}
                onClick={() => setStep(8)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 8 — Feedback + Submit */}
        {step === 8 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>feedback</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>Anything else you want to share?</h2>
            <p className="text-sm mb-5" style={{ color: COLORS.fg2 }}>Optional notes about your day.</p>
            
            <textarea
              rows={4}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Write your thoughts here..."
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none mb-8"
              style={{ background: COLORS.card, borderColor: COLORS.border, color: COLORS.fg, lineHeight: 1.7 }}
            />
            
            <div className="flex gap-3 mb-4">
              <button onClick={() => setStep(7)} className="px-5 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>←</button>
              <button
                disabled={mutation.isPending}
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30"
                style={{ background: COLORS.primary, color: '#fff' }}
              >
                {mutation.isPending ? 'submitting...' : 'submit check-in →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
