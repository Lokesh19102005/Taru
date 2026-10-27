import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { fetchAnalytics } from '../../api/institution'
import { TOTAL_SCORE_MAX } from '../../lib/moodScale'

interface AnalyticsData {
  totalStudents: number
  studentsCheckedIn: number
  averages: {
    // null when no student answered that question today
    mood: number | null; energy: number | null; stress: number | null
    motivation: number | null; totalScore: number | null
  }
}

// All scores: lower is better (ratings 0–4, total 0–16)
const getColor = (value: number, max: number) => {
  if (max === TOTAL_SCORE_MAX) {
    if (value >= 12) return '#DC2626'
    if (value >= 8) return '#D97706'
    return '#059669'
  }
  if (value >= 3) return '#DC2626'
  if (value >= 2) return '#D97706'
  return '#059669'
}

const getMoodEmoji = (score: number) => {
  if (score >= 4) return '😢'
  if (score >= 3) return '😟'
  if (score >= 2) return '😐'
  if (score >= 1) return '😊'
  return '😄'
}

const getMoodLabel = (score: number) => {
  if (score >= 4) return 'Very Sad'
  if (score >= 3) return 'Sad'
  if (score >= 2) return 'Neutral'
  if (score >= 1) return 'Happy'
  return 'Very Happy'
}

export default function InstitutionOverviewView() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
      .then(res => { if (res.success) setAnalytics(res.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const metrics = analytics ? [
    { label: 'Mood', value: analytics.averages.mood, max: 4 },
    { label: 'Energy', value: analytics.averages.energy, max: 4 },
    { label: 'Stress', value: analytics.averages.stress, max: 4 },
    { label: 'Motivation', value: analytics.averages.motivation, max: 4 },
    { label: 'Total Score', value: analytics.averages.totalScore, max: TOTAL_SCORE_MAX },
  ] : []

  if (loading) {
    return <div className="text-center py-16 text-sm animate-pulse-gentle" style={{ color: COLORS.fg3 }}>Loading campus data...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} style={{ color: COLORS.fg }} />
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Campus Mental Health Overview</h2>
        </div>
        <p className="text-xs" style={{ color: COLORS.fg3 }}>
          {analytics?.totalStudents || 0} students · {analytics?.studentsCheckedIn || 0} checked in today
        </p>
      </div>

      {/* Metric cards */}
      {analytics && analytics.studentsCheckedIn > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="rounded-2xl p-4 border card-hover transition-all" style={{ background: COLORS.card, borderColor: COLORS.border }}>
              <div className="text-xs font-bold mb-2" style={{ color: COLORS.fg2 }}>{m.label}</div>
              <div className="flex items-center gap-2">
                {m.label === 'Mood' && m.value !== null && <span className="text-2xl">{getMoodEmoji(Math.round(m.value))}</span>}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold" style={{ color: m.value === null ? COLORS.fg3 : getColor(m.value, m.max) }}>{m.value ?? '—'}</span>
                  <span className="text-xs font-semibold" style={{ color: COLORS.fg4 }}>/{m.max}</span>
                </div>
              </div>
              {m.label === 'Mood' && m.value !== null && <div className="text-[10px] mt-1 font-semibold" style={{ color: COLORS.fg3 }}>{getMoodLabel(Math.round(m.value))}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-8 border text-center card-hover transition-all" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.fg }}>No check-ins recorded today</p>
          <p className="text-xs" style={{ color: COLORS.fg3 }}>Student wellness data will appear here once they start checking in.</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-5 border card-hover transition-all shadow-sm" style={{ background: COLORS.gradient, borderColor: COLORS.border }}>
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-extrabold text-white">{analytics?.totalStudents || 0}</div>
          <div className="text-xs font-medium text-teal-50">Total Students</div>
        </div>
        <div className="rounded-2xl p-5 border card-hover transition-all shadow-sm" style={{ background: COLORS.gradient, borderColor: COLORS.border }}>
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-extrabold text-white">{analytics?.studentsCheckedIn || 0}</div>
          <div className="text-xs font-medium text-teal-50">Checked In Today</div>
        </div>
      </div>
    </div>
  )
}
