import { useState, useEffect } from 'react'
import { Users, Search, Filter, X } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { fetchStudents } from '../../api/institution'

interface StudentCheckin {
  username: string
  year: string
  degree: string
  batch: string
  age: number | null
  gender: string
  todayCheckin: {
    mood: { label: string; score: number }
    energy: number; stress: number; sleep: number
    concentration: number; support: number; motivation: number
    totalScore: number; feedback: string
  } | null
}

const getColor = (value: number, max: number) => {
  if (max === 28) {
    if (value >= 21) return '#DC2626'
    if (value >= 14) return '#D97706'
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

const AGE_RANGES = [
  { label: 'Under 18', min: 0, max: 17 },
  { label: '18–20', min: 18, max: 20 },
  { label: '21–23', min: 21, max: 23 },
  { label: '24+', min: 24, max: 999 },
]

export default function InstitutionStudentsView() {
  const [students, setStudents] = useState<StudentCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'pending'>('all')
  const [batchFilter, setBatchFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchStudents()
      .then(res => { if (res.success) setStudents(res.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // All possible options (matching registration form)
  const ALL_BATCHES = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']
  const ALL_GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

  const activeFilterCount = [batchFilter, genderFilter, ageFilter].filter(Boolean).length

  const clearAllFilters = () => {
    setBatchFilter('')
    setGenderFilter('')
    setAgeFilter('')
  }

  const filtered = students.filter(s => {
    // Search
    if (search && !s.username.toLowerCase().includes(search.toLowerCase())) return false
    // Status
    if (statusFilter === 'checked' && !s.todayCheckin) return false
    if (statusFilter === 'pending' && s.todayCheckin) return false
    // Batch
    if (batchFilter && s.batch !== batchFilter) return false
    // Gender
    if (genderFilter && s.gender !== genderFilter) return false
    // Age range
    if (ageFilter) {
      const range = AGE_RANGES.find(r => r.label === ageFilter)
      if (range) {
        if (!s.age || s.age < range.min || s.age > range.max) return false
      }
    }
    return true
  })

  const checkedCount = students.filter(s => s.todayCheckin).length
  const pendingCount = students.length - checkedCount

  if (loading) {
    return <div className="text-center py-16 text-sm animate-pulse-gentle" style={{ color: COLORS.fg3 }}>Loading students...</div>
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} style={{ color: COLORS.fg }} />
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Students</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: COLORS.muted, color: COLORS.fg2 }}>{students.length}</span>
        </div>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.fg3 }} />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
            style={{ background: COLORS.card, borderColor: COLORS.border, color: COLORS.fg }}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl p-1" style={{ background: COLORS.muted }}>
            {([
              { key: 'all', label: `All (${students.length})` },
              { key: 'checked', label: `Checked in (${checkedCount})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-teal-50"
                style={{
                  background: statusFilter === f.key ? COLORS.card : 'transparent',
                  color: statusFilter === f.key ? COLORS.primary : COLORS.fg3,
                  boxShadow: statusFilter === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:border-teal-400 relative"
            style={{
              background: showFilters || activeFilterCount > 0 ? COLORS.primary : COLORS.card,
              color: showFilters || activeFilterCount > 0 ? '#fff' : COLORS.fg,
              borderColor: showFilters || activeFilterCount > 0 ? COLORS.primary : COLORS.border,
            }}
          >
            <Filter size={12} /> Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#fff', color: COLORS.primary }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Classification filters panel */}
      {showFilters && (
        <div className="rounded-2xl p-4 border animate-slide-down" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold" style={{ color: COLORS.fg }}>Classify Students</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: '#cc0000' }}
              >
                <X size={10} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Batch filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1 font-semibold" style={{ color: COLORS.fg4 }}>Batch</label>
              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-50 appearance-none hover:bg-teal-50"
                style={{ background: COLORS.bg, borderColor: batchFilter ? COLORS.primary : COLORS.border, color: batchFilter ? COLORS.fg : COLORS.fg3 }}
              >
                <option value="">All batches</option>
                {ALL_BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Gender filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1 font-semibold" style={{ color: COLORS.fg4 }}>Gender</label>
              <select
                value={genderFilter}
                onChange={e => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-50 appearance-none hover:bg-teal-50"
                style={{ background: COLORS.bg, borderColor: genderFilter ? COLORS.primary : COLORS.border, color: genderFilter ? COLORS.fg : COLORS.fg3 }}
              >
                <option value="">All genders</option>
                {ALL_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Age range filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1 font-semibold" style={{ color: COLORS.fg4 }}>Age Range</label>
              <select
                value={ageFilter}
                onChange={e => setAgeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-50 appearance-none hover:bg-teal-50"
                style={{ background: COLORS.bg, borderColor: ageFilter ? COLORS.primary : COLORS.border, color: ageFilter ? COLORS.fg : COLORS.fg3 }}
              >
                <option value="">All ages</option>
                {AGE_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Active filters chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: COLORS.border }}>
              <span className="text-[10px] font-semibold py-1" style={{ color: COLORS.fg3 }}>Active:</span>
              {batchFilter && (
                <button onClick={() => setBatchFilter('')}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:bg-teal-50"
                  style={{ borderColor: COLORS.border, color: COLORS.fg }}>
                  Batch: {batchFilter} <X size={9} />
                </button>
              )}
              {genderFilter && (
                <button onClick={() => setGenderFilter('')}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:bg-teal-50"
                  style={{ borderColor: COLORS.border, color: COLORS.fg }}>
                  Gender: {genderFilter} <X size={9} />
                </button>
              )}
              {ageFilter && (
                <button onClick={() => setAgeFilter('')}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:bg-teal-50"
                  style={{ borderColor: COLORS.border, color: COLORS.fg }}>
                  Age: {ageFilter} <X size={9} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result count when filters are active */}
      {activeFilterCount > 0 && (
        <div className="text-xs font-semibold" style={{ color: COLORS.fg3 }}>
          Showing {filtered.length} of {students.length} students
        </div>
      )}

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 border text-center card-hover transition-all" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.fg }}>
            {students.length === 0 ? 'No students registered yet' : 'No students match your filters'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs font-semibold mt-2 hover:underline" style={{ color: COLORS.primary }}>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, idx) => (
            <div key={s.username || idx} className="rounded-2xl p-5 border card-hover transition-all" style={{ background: COLORS.card, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm" style={{ background: COLORS.muted, color: COLORS.primary }}>
                    {s.username?.charAt(5)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{s.username || 'Student'}</div>
                    <div className="text-[10px] flex items-center gap-1.5 flex-wrap" style={{ color: COLORS.fg3 }}>
                      {[s.year, s.degree].filter(Boolean).join(' · ') || 'Student'}
                      {s.batch && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: COLORS.muted, color: COLORS.fg2 }}>
                          Batch {s.batch}
                        </span>
                      )}
                      {s.gender && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: COLORS.muted, color: COLORS.fg2 }}>
                          {s.gender}
                        </span>
                      )}
                      {s.age && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: COLORS.muted, color: COLORS.fg2 }}>
                          Age {s.age}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {s.todayCheckin ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#CCFBF1', color: '#0D9488' }}>CHECKED IN</span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>PENDING</span>
                )}
              </div>

              {s.todayCheckin ? (
                <div className="mt-3 pt-3 border-t transition-colors hover:bg-teal-50/30 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl" style={{ borderColor: COLORS.border }}>
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
    </div>
  )
}
