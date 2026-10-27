import { useState, useEffect } from 'react'
import { X, Activity, TrendingUp, TrendingDown, Minus, Calendar, Brain } from 'lucide-react'
import { getStudentMoodHistory } from '../api/meeting'
import { TOTAL_SCORE_MAX, getScoreColor, getScoreLabel } from '../lib/moodScale'
import { topicSummary } from '../lib/checkinTree'

interface CheckIn {
  _id: string
  date: string
  mood: { label: string; score: number }
  category: string | null
  rootCause: string | null
  specificIssue: string | null
  // 0 (best) – 4 (worst), null = skipped
  energy: number | null
  stress: number | null
  motivation: number | null
  totalScore: number
  feedback: string
}

interface MoodHistoryPanelProps {
  meetingId: string
  studentName: string
  isOpen: boolean
  onClose: () => void
}

const MOOD_EMOJIS: Record<string, string> = {
  'Happy': '😊',
  'Neutral': '😐',
  'Sad': '😢',
  'Anxious': '😰',
  'Angry': '😠',
  'Excited': '🤩',
  'Tired': '😴',
  'Stressed': '😤',
  'Calm': '😌',
  'Grateful': '🙏',
}

function getScoreBg(score: number): string {
  if (score <= 3) return 'bg-green-900/30 text-green-400'
  if (score <= 6) return 'bg-green-900/20 text-green-300'
  if (score <= 9) return 'bg-yellow-900/30 text-yellow-400'
  if (score <= 12) return 'bg-orange-900/30 text-orange-400'
  return 'bg-red-900/30 text-red-400'
}

// Average of the answered values (skipped = null are ignored)
function averageOf(values: (number | null)[]): string | null {
  const answered = values.filter((v): v is number => typeof v === 'number')
  if (!answered.length) return null
  return (answered.reduce((s, v) => s + v, 0) / answered.length).toFixed(1)
}

function getTrendIcon(checkins: CheckIn[]) {
  if (checkins.length < 2) return { icon: Minus, label: 'Not enough data', color: 'text-[#9aa0a6]' }
  const recent = checkins.slice(0, 3).reduce((s, c) => s + c.totalScore, 0) / Math.min(3, checkins.length)
  const older = checkins.slice(-3).reduce((s, c) => s + c.totalScore, 0) / Math.min(3, checkins.length)
  // Lower score = better (0-16 scale, 0 is best)
  if (recent < older - 1) return { icon: TrendingUp, label: 'Improving', color: 'text-green-400' }
  if (recent > older + 1) return { icon: TrendingDown, label: 'Declining', color: 'text-red-400' }
  return { icon: Minus, label: 'Stable', color: 'text-[#8ab4f8]' }
}

export default function MoodHistoryPanel({ meetingId, studentName, isOpen, onClose }: MoodHistoryPanelProps) {
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    getStudentMoodHistory(meetingId)
      .then(res => {
        if (res.success) {
          setCheckins(res.data || [])
        } else {
          setError(res.message || 'Failed to load mood data')
        }
      })
      .catch(() => setError('Failed to load mood data'))
      .finally(() => setLoading(false))
  }, [isOpen, meetingId])

  if (!isOpen) return null

  const avgScore = checkins.length > 0
    ? Math.round(checkins.reduce((s, c) => s + c.totalScore, 0) / checkins.length)
    : null

  const trend = getTrendIcon(checkins)
  const TrendIcon = trend.icon

  // Dimension averages
  const dimAvg = checkins.length > 0 ? {
    energy: averageOf(checkins.map(c => c.energy)),
    stress: averageOf(checkins.map(c => c.stress)),
    motivation: averageOf(checkins.map(c => c.motivation)),
  } : null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative ml-auto w-[380px] max-w-[90vw] bg-[#2d2e31] shadow-2xl flex flex-col h-full animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <Brain size={20} className="text-[#8ab4f8]" />
            <div>
              <h3 className="text-[#e8eaed] text-sm font-semibold">Mood History</h3>
              <p className="text-[#9aa0a6] text-xs">{studentName} • Past 14 days</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#8ab4f8] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[#9aa0a6] text-sm">Loading mood data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-[#9aa0a6] text-sm">{error}</p>
            </div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={40} className="text-[#5f6368] mx-auto mb-3" />
              <p className="text-[#9aa0a6] text-sm">No mood check-ins found</p>
              <p className="text-[#5f6368] text-xs mt-1">Student hasn't logged mood in the past 14 days</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Average Score */}
                <div className="bg-[#303134] rounded-xl p-3.5">
                  <p className="text-[#9aa0a6] text-[10px] uppercase tracking-wider mb-1.5">Avg Score</p>
                  {avgScore !== null && (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold" style={{ color: getScoreColor(avgScore) }}>
                          {avgScore}
                        </span>
                        <span className="text-[#9aa0a6] text-xs">/{TOTAL_SCORE_MAX}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${getScoreBg(avgScore)}`}>
                        {getScoreLabel(avgScore)}
                      </span>
                    </>
                  )}
                </div>

                {/* Trend */}
                <div className="bg-[#303134] rounded-xl p-3.5">
                  <p className="text-[#9aa0a6] text-[10px] uppercase tracking-wider mb-1.5">Trend</p>
                  <div className="flex items-center gap-1.5">
                    <TrendIcon size={20} className={trend.color} />
                    <span className={`text-sm font-medium ${trend.color}`}>{trend.label}</span>
                  </div>
                  <p className="text-[#5f6368] text-[10px] mt-1">{checkins.length} check-ins</p>
                </div>
              </div>

              {/* Dimension Averages */}
              {dimAvg && (
                <div className="bg-[#303134] rounded-xl p-4">
                  <p className="text-[#9aa0a6] text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Activity size={12} /> Average Dimensions
                  </p>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                    {([
                      ['Energy', dimAvg.energy],
                      ['Stress', dimAvg.stress],
                      ['Motivation', dimAvg.motivation],
                    ] as [string, string | null][]).map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[#9aa0a6]">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-[#202124] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${(parseFloat(val ?? '0') / 4) * 100}%`,
                                backgroundColor: getScoreColor(parseFloat(val ?? '0') * 4)
                              }}
                            />
                          </div>
                          <span className="text-[#e8eaed] font-medium w-7 text-right">{val ?? '—'}/4</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Timeline */}
              <div>
                <p className="text-[#9aa0a6] text-[10px] uppercase tracking-wider mb-3">Daily Check-ins</p>
                <div className="space-y-2">
                  {checkins.map(c => {
                    const date = new Date(c.date)
                    const emoji = MOOD_EMOJIS[c.mood.label] || '😐'
                    return (
                      <div key={c._id} className="bg-[#303134] rounded-xl p-3.5 hover:bg-[#3c4043] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{emoji}</span>
                            <div>
                              <p className="text-[#e8eaed] text-xs font-medium">
                                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </p>
                              <p className="text-[#9aa0a6] text-[11px]">{c.mood.label}</p>
                            </div>
                          </div>
                          <span 
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getScoreBg(c.totalScore)}`}
                          >
                            {c.totalScore}/{TOTAL_SCORE_MAX}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-[#9aa0a6]">
                          <div className="text-center">
                            <div className="text-[#e8eaed] font-medium">{c.energy ?? '—'}</div>
                            <div>Energy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#e8eaed] font-medium">{c.stress ?? '—'}</div>
                            <div>Stress</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#e8eaed] font-medium">{c.motivation ?? '—'}</div>
                            <div>Motivation</div>
                          </div>
                        </div>

                        {topicSummary(c) && (
                          <p className="text-[#bdc1c6] text-[11px] mt-2 leading-relaxed">
                            {topicSummary(c)}
                          </p>
                        )}

                        {c.feedback && (
                          <p className="text-[#9aa0a6] text-[11px] mt-2 italic border-t border-[#3c4043] pt-2">
                            "{c.feedback}"
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
