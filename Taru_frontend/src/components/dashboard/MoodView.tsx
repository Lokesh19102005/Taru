import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import COLORS from '../../lib/theme'
import { useCheckinHistory } from '../../api/checkin'
import WeeklyMoodChart from './WeeklyMoodChart'

const MOOD_MAP = [
  { emoji: '😄', label: 'Very Happy' },
  { emoji: '🙂', label: 'Happy' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😕', label: 'Stressed' },
  { emoji: '😢', label: 'Sad' },
]

function getScoreColor(score: number): string {
  if (score <= 5) return '#15803d'
  if (score <= 10) return '#4ade80'
  if (score <= 16) return '#facc15'
  if (score <= 22) return '#f97316'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score <= 5) return 'Very Well'
  if (score <= 10) return 'Well'
  if (score <= 16) return 'Moderate'
  if (score <= 22) return 'Stressed'
  return 'High Strain'
}

interface DayCell {
  date: Date
  checkin: any | null  // full checkin data
}

function CalendarHeatmap({ checkins }: { checkins: any[] }) {
  const [hovered, setHovered] = useState<{ cell: DayCell; x: number; y: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build a map of date -> full checkin object
  const checkinMap = new Map<string, any>()
  checkins.forEach((c: any) => {
    const d = new Date(c.date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    checkinMap.set(key, c)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: DayCell[] = []

  // Find Monday of the current week
  const currentMonday = new Date(today)
  const todayDow = currentMonday.getDay() // 0=Sun
  const toMondayOffset = todayDow === 0 ? -6 : 1 - todayDow
  currentMonday.setDate(currentMonday.getDate() + toMondayOffset)

  // Go back 4 more weeks to get 5 columns total
  const startDate = new Date(currentMonday)
  startDate.setDate(startDate.getDate() - 28)

  const totalCells = 35 // 5 weeks × 7 days
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const checkin = checkinMap.get(key) || null
    days.push({ date: d, checkin })
  }

  const weeks: DayCell[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

  const weekLabels = weeks.map(week =>
    week[0].date.toLocaleDateString('en-US', { month: 'short' })
  )
  const displayLabels = weekLabels.map((label, i) =>
    i === 0 || label !== weekLabels[i - 1] ? label : ''
  )

  const trackedDays = days.filter(d => d.checkin !== null && d.date <= today).length

  const handleMouseEnter = (cell: DayCell, e: React.MouseEvent) => {
    if (cell.date > today || !cell.checkin) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHovered({
      cell,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseLeave = () => {
    setHovered(null)
  }

  // Adjust tooltip position to stay within container
  useEffect(() => {
    if (hovered && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current
      const container = containerRef.current.getBoundingClientRect()
      const tr = tooltip.getBoundingClientRect()
      // Clamp right edge
      if (tr.right > container.right) {
        tooltip.style.left = `${hovered.x - tr.width - 8}px`
      }
    }
  }, [hovered])

  return (
    <div ref={containerRef} className="rounded-2xl p-5 border relative" style={{ background: COLORS.card, borderColor: COLORS.border }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: COLORS.fg }}>Check-in Calendar</h3>
        <span className="text-xs" style={{ color: COLORS.fg3 }}>
          {trackedDays} active day{trackedDays !== 1 ? 's' : ''} · Past 5 weeks
        </span>
      </div>

      <div className="flex gap-1.5">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[18px] flex items-center">
              <span className="text-[9px] leading-none" style={{ color: COLORS.fg4 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {week.map((day, di) => {
              const isFuture = day.date > today
              const score = day.checkin?.totalScore ?? null
              const bg = isFuture
                ? 'transparent'
                : score !== null
                  ? getScoreColor(score)
                  : COLORS.muted
              const border = isFuture ? `1px dashed ${COLORS.border}` : 'none'

              return (
                <div
                  key={di}
                  className="h-[18px] rounded-[4px] transition-transform hover:scale-110 cursor-default"
                  style={{ background: bg, border, opacity: isFuture ? 0.3 : 1 }}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={handleMouseLeave}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Month labels */}
      <div className="flex gap-1.5 mt-1.5" style={{ paddingLeft: '28px' }}>
        {displayLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px]" style={{ color: COLORS.fg4 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[9px]" style={{ color: COLORS.fg4 }}>Better</span>
        {['#15803d', '#4ade80', '#facc15', '#f97316', '#ef4444'].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span className="text-[9px]" style={{ color: COLORS.fg4 }}>Worse</span>
        <div className="w-3 h-3 rounded-[3px] ml-1" style={{ background: COLORS.muted }} />
        <span className="text-[9px]" style={{ color: COLORS.fg4 }}>No data</span>
      </div>

      {/* Tooltip */}
      {hovered && hovered.cell.checkin && (
        <div
          ref={tooltipRef}
          className="absolute z-50 rounded-xl border shadow-xl"
          style={{
            left: `${hovered.x + 12}px`,
            top: `${hovered.y - 10}px`,
            background: COLORS.bg,
            borderColor: COLORS.border,
            minWidth: '220px',
            pointerEvents: 'none',
            transform: 'translateY(-50%)',
          }}
        >
          {(() => {
            const c = hovered.cell.checkin
            const moodInfo = MOOD_MAP[c.mood?.score] || MOOD_MAP[2]
            const dateStr = new Date(c.date).toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
            })
            const scoreColor = getScoreColor(c.totalScore ?? 0)

            return (
              <div className="p-3.5">
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b" style={{ borderColor: COLORS.border }}>
                  <span className="text-lg">{moodInfo.emoji}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: COLORS.fg }}>{dateStr}</div>
                    <div className="text-[10px] font-semibold" style={{ color: COLORS.fg2 }}>{moodInfo.label}</div>
                  </div>
                </div>

                {/* Score badge */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: scoreColor, color: '#fff' }}
                  >
                    {c.totalScore}/28
                  </span>
                  <span className="text-[10px]" style={{ color: COLORS.fg3 }}>
                    {getScoreLabel(c.totalScore ?? 0)}
                  </span>
                </div>

                {/* Breakdown grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: 'Energy', val: c.energy },
                    { label: 'Stress', val: c.stress },
                    { label: 'Sleep', val: c.sleep },
                    { label: 'Focus', val: c.concentration },
                    { label: 'Support', val: c.support },
                    { label: 'Motivation', val: c.motivation },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: COLORS.fg3 }}>{item.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: COLORS.fg }}>{item.val}/4</span>
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                {c.feedback && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                    <p className="text-[10px] italic leading-relaxed" style={{ color: COLORS.fg2 }}>
                      "{c.feedback.trim()}"
                    </p>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function MoodView() {
  const navigate = useNavigate()
  const { data, isLoading } = useCheckinHistory()
  const checkins = data?.data || []

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Mood Tracker</h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>Your daily check-in history</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/check')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: COLORS.primary, color: '#fff' }}
        >
          <ClipboardList size={14} /> New Check-in
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <p className="text-sm" style={{ color: COLORS.fg3 }}>Loading your check-ins...</p>
        </div>
      ) : checkins.length === 0 ? (
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="text-4xl mb-3">🌱</div>
          <h3 className="font-bold text-sm mb-1" style={{ color: COLORS.fg }}>No check-ins yet</h3>
          <p className="text-xs mb-4" style={{ color: COLORS.fg3 }}>Complete your first daily check-in to start tracking your mood.</p>
          <button
            onClick={() => navigate('/dashboard/check')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: COLORS.primary, color: '#fff' }}
          >
            Start Check-in →
          </button>
        </div>
      ) : (
        <>
          {/* Calendar heatmap */}
          <CalendarHeatmap checkins={checkins} />

          {/* Weekly mood chart */}
          <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <WeeklyMoodChart checkins={checkins} title="Wellness Overview" />
          </div>

          {/* History list */}
          <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>Recent Check-ins</h3>
            <div className="space-y-3.5">
              {checkins.map((c: any) => {
                const moodInfo = MOOD_MAP[c.mood?.score] || MOOD_MAP[2]
                const dateStr = new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={c._id} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: COLORS.border }}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                      style={{ background: COLORS.muted }}
                    >
                      {moodInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>{dateStr}</span>
                        <span className="text-[10px]" style={{ color: COLORS.fg3 }}>{moodInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: getScoreColor(c.totalScore ?? 0), color: '#fff' }}>
                          Score: {c.totalScore}/28
                        </span>
                        {c.energy !== undefined && (
                          <span className="text-[10px]" style={{ color: COLORS.fg3 }}>
                            E:{c.energy} S:{c.stress} Sl:{c.sleep} F:{c.concentration} So:{c.support} M:{c.motivation}
                          </span>
                        )}
                      </div>
                      {c.feedback && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: COLORS.fg2 }}>"{c.feedback}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
