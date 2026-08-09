import { useState, useRef, useEffect } from 'react'
import COLORS from '../../lib/theme'

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

interface WeekDay {
  day: string       // e.g. "Mon"
  dateLabel: string  // e.g. "Aug 9"
  checkin: any | null
}

interface Props {
  checkins: any[]
  title?: string
  maxBarHeight?: number
}

export default function WeeklyMoodChart({ checkins, title = 'Mood this week', maxBarHeight = 64 }: Props) {
  const [hovered, setHovered] = useState<{ bar: WeekDay; x: number; y: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build checkin map by date key
  const checkinMap = new Map<string, any>()
  checkins.forEach((c: any) => {
    const d = new Date(c.date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    checkinMap.set(key, c)
  })

  // Build the past 7 days array (today and 6 days before)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekDays: WeekDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    weekDays.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      checkin: checkinMap.get(key) || null,
    })
  }

  const handleMouseEnter = (bar: WeekDay, e: React.MouseEvent) => {
    if (!bar.checkin) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHovered({
      bar,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseLeave = () => setHovered(null)

  // Keep tooltip in bounds
  useEffect(() => {
    if (hovered && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current
      const container = containerRef.current.getBoundingClientRect()
      const tr = tooltip.getBoundingClientRect()
      if (tr.right > container.right) {
        tooltip.style.left = `${hovered.x - tr.width - 8}px`
      }
      if (tr.bottom > window.innerHeight - 20) {
        tooltip.style.top = `${hovered.y - tr.height - 8}px`
        tooltip.style.transform = 'none'
      }
    }
  }, [hovered])

  return (
    <div ref={containerRef} className="relative">
      <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>{title}</h3>
      <div className="flex items-end gap-2" style={{ height: `${maxBarHeight + 20}px` }}>
        {weekDays.map((wd, i) => {
          const hasData = wd.checkin !== null
          const score = wd.checkin?.totalScore ?? 0
          // Bar height proportional to score (higher score = taller bar = more stress)
          const barH = hasData ? Math.max(6, (score / 28) * maxBarHeight) : 0
          const barColor = hasData ? getScoreColor(score) : COLORS.muted
          const isToday = i === 6

          return (
            <div
              key={`${wd.day}-${i}`}
              className="flex-1 flex flex-col items-center gap-1 cursor-default"
              onMouseEnter={(e) => handleMouseEnter(wd, e)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Bar */}
              <div className="w-full flex items-end justify-center" style={{ height: `${maxBarHeight}px` }}>
                <div
                  className="w-full rounded-md transition-all duration-300 hover:opacity-80"
                  style={{
                    height: hasData ? `${barH}px` : '3px',
                    background: hasData ? barColor : COLORS.border,
                    opacity: hasData ? 1 : 0.5,
                  }}
                />
              </div>
              {/* Day label */}
              <span
                className="text-[9px] font-medium"
                style={{ color: isToday ? COLORS.fg : COLORS.fg3 }}
              >
                {wd.day}
              </span>
            </div>
          )
        })}
      </div>

      {/* Rich hover tooltip */}
      {hovered && hovered.bar.checkin && (
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
            const c = hovered.bar.checkin
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
