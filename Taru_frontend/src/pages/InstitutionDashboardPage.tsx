import { useState, useEffect } from 'react'
import { Heart, LogOut, Building2, Users, Activity } from 'lucide-react'
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext'
import { COLORS } from '../lib/theme'
import { useNavigate } from 'react-router-dom'
import { fetchAnalytics, fetchStudents } from '../api/institution'

interface AnalyticsData {
  totalStudents: number
  studentsCheckedIn: number
  averages: {
    mood: number; energy: number; stress: number; sleep: number
    concentration: number; support: number; motivation: number; totalScore: number
  }
}

interface StudentCheckin {
  username: string
  year: string
  degree: string
  todayCheckin: {
    mood: { label: string; score: number }
    energy: number; stress: number; sleep: number
    concentration: number; support: number; motivation: number
    totalScore: number; feedback: string
  } | null
}

// Higher value = more distress = red
const getColor = (value: number, max: number) => {
  if (max === 28) {
    if (value >= 21) return '#DC2626'  // high distress
    if (value >= 14) return '#D97706'  // moderate
    return '#059669'                   // low distress
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

export default function InstitutionDashboardPage() {
  const { institution, logout } = useInstitutionAuth()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [students, setStudents] = useState<StudentCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchAnalytics(), fetchStudents()])
      .then(([analyticsRes, studentsRes]) => {
        if (analyticsRes.success) setAnalytics(analyticsRes.data)
        if (studentsRes.success) setStudents(studentsRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/institution/login')
  }

  if (!institution) return null

  const metrics = analytics ? [
    { label: 'Mood', value: analytics.averages.mood, max: 4 },
    { label: 'Energy', value: analytics.averages.energy, max: 4 },
    { label: 'Stress', value: analytics.averages.stress, max: 4 },
    { label: 'Sleep', value: analytics.averages.sleep, max: 4 },
    { label: 'Concentration', value: analytics.averages.concentration, max: 4 },
    { label: 'Support', value: analytics.averages.support, max: 4 },
    { label: 'Motivation', value: analytics.averages.motivation, max: 4 },
    { label: 'Total Score', value: analytics.averages.totalScore, max: 28 },
  ] : []

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* Header */}
      <header className="px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
            <Heart size={14} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-lg" style={{ color: COLORS.fg }}>taru campus</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: COLORS.fg2 }} />
            <span className="text-sm font-semibold" style={{ color: COLORS.fg }}>{institution.collegeName}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-6 space-y-8">
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: COLORS.fg3 }}>Loading campus data...</div>
        ) : (
          <>
            {/* Section 1: Campus Mental Health Overview */}
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={18} style={{ color: COLORS.fg }} />
                <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Campus Mental Health Overview</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: COLORS.fg3 }}>
                {analytics?.totalStudents || 0} students · {analytics?.studentsCheckedIn || 0} checked in today
              </p>

              {analytics && analytics.studentsCheckedIn > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {metrics.map(m => (
                    <div key={m.label} className="rounded-2xl p-4 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                      <div className="text-xs font-bold mb-2" style={{ color: COLORS.fg2 }}>{m.label}</div>
                      <div className="flex items-center gap-2">
                        {m.label === 'Mood' && <span className="text-2xl">{getMoodEmoji(Math.round(m.value))}</span>}
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold" style={{ color: getColor(m.value, m.max) }}>{m.value}</span>
                          <span className="text-xs font-semibold" style={{ color: COLORS.fg4 }}>/{m.max}</span>
                        </div>
                      </div>
                      {m.label === 'Mood' && <div className="text-[10px] mt-1 font-semibold" style={{ color: COLORS.fg3 }}>{getMoodLabel(Math.round(m.value))}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                  <p className="text-sm" style={{ color: COLORS.fg3 }}>No check-ins recorded today</p>
                </div>
              )}
            </section>

            {/* Section 2: Student List */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} style={{ color: COLORS.fg }} />
                <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Students</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: COLORS.muted, color: COLORS.fg2 }}>{students.length}</span>
              </div>

              {students.length === 0 ? (
                <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                  <p className="text-sm" style={{ color: COLORS.fg3 }}>No students registered from your institution yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((s, idx) => (
                    <div key={s.username || idx} className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: COLORS.muted, color: COLORS.fg }}>
                            {s.username?.charAt(5)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{s.username || 'Student'}</div>
                            <div className="text-[10px]" style={{ color: COLORS.fg3 }}>
                              {[s.year, s.degree].filter(Boolean).join(' · ') || 'Student'}
                            </div>
                          </div>
                        </div>
                        {s.todayCheckin ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>CHECKED IN</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>PENDING</span>
                        )}
                      </div>

                      {s.todayCheckin ? (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.border }}>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div><span style={{ color: COLORS.fg3 }}>Mood</span><br/><span className="font-bold" style={{ color: COLORS.fg }}>{getMoodEmoji(s.todayCheckin.mood.score)} {s.todayCheckin.mood.label} ({s.todayCheckin.mood.score})</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Energy</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.energy, 4) }}>{s.todayCheckin.energy}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Stress</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.stress, 4) }}>{s.todayCheckin.stress}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Sleep</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.sleep, 4) }}>{s.todayCheckin.sleep}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Concentration</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.concentration, 4) }}>{s.todayCheckin.concentration}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Support</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.support, 4) }}>{s.todayCheckin.support}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Motivation</span><br/><span className="font-bold" style={{ color: getColor(s.todayCheckin.motivation, 4) }}>{s.todayCheckin.motivation}</span></div>
                            <div><span style={{ color: COLORS.fg3 }}>Total</span><br/><span className="font-extrabold" style={{ color: getColor(s.todayCheckin.totalScore, 28) }}>{s.todayCheckin.totalScore}/28</span></div>
                          </div>
                          {s.todayCheckin.feedback && (
                            <div className="mt-2 text-xs" style={{ color: COLORS.fg3 }}>
                              <span className="font-semibold" style={{ color: COLORS.fg2 }}>Feedback:</span> {s.todayCheckin.feedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs" style={{ color: COLORS.fg3 }}>No check-in yet today</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
