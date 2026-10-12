import { useState, useEffect, useMemo } from 'react'
import { Megaphone, MessageCircle, ChevronUp, ChevronDown, ChevronDownIcon } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { getConcernsForInstitution, getInstitutionComments } from '../../api/concern'

/* ── Helpers ─────────────────────────────── */

const TYPE_MAP: Record<string, { emoji: string; label: string }> = {
  all: { emoji: '🎯', label: 'All Types' },
  college_admin: { emoji: '🏫', label: 'College/Admin' },
  faculty: { emoji: '👨‍🏫', label: 'Faculty/Teacher' },
  student_peer: { emoji: '👥', label: 'Student/Peer' },
  hostel: { emoji: '🏠', label: 'Hostel' },
  safety: { emoji: '🛡️', label: 'Safety' },
  financial: { emoji: '💰', label: 'Financial/Fees' },
  other: { emoji: '📋', label: 'Other' },
}

const PERIOD_MAP: Record<string, { label: string; days: number }> = {
  all: { label: 'All time', days: 99999 },
  today: { label: 'Today', days: 1 },
  week: { label: 'Last 7 days', days: 7 },
  month: { label: 'Last 30 days', days: 30 },
  year: { label: 'Last 1 year', days: 365 },
}

const SORT_MAP: Record<string, { label: string }> = {
  newest: { label: 'Newest first' },
  upvotes: { label: 'Most upvotes' },
  downvotes: { label: 'Most downvotes' },
  comments: { label: 'Most comments' },
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

/* ── Types ───────────────────────────────── */

interface Comment {
  _id: string
  username: string
  text: string
  createdAt: string
}

interface Concern {
  _id: string
  username: string
  type: string
  description: string
  upvoteCount: number
  downvoteCount: number
  commentCount: number
  createdAt: string
}

/* ── Sub-components ──────────────────────── */

function ReadOnlyCommentSection({ concernId }: { concernId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getInstitutionComments(concernId)
      .then(res => setComments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [concernId])

  return (
    <div className="mt-3 pt-3 border-t animate-fade-in" style={{ borderColor: COLORS.border }}>
      {loading ? (
        <p className="text-xs py-2 font-medium" style={{ color: COLORS.fg3 }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs py-2 font-medium" style={{ color: COLORS.fg3 }}>No comments yet.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.map(c => (
            <div key={c._id} className="flex gap-2.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{ background: COLORS.muted, color: COLORS.primary }}
              >
                {c.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: COLORS.fg }}>{c.username}</span>
                  <span className="text-[10px]" style={{ color: COLORS.fg3 }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-[13px] font-medium leading-relaxed mt-0.5" style={{ color: COLORS.fg2 }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstitutionConcernCard({ concern }: { concern: Concern }) {
  const [showComments, setShowComments] = useState(false)
  const typeInfo = TYPE_MAP[concern.type] || TYPE_MAP.other

  return (
    <div
      className="rounded-2xl border p-5 bg-white shadow-sm transition-all hover:shadow-md"
      style={{ borderColor: COLORS.border }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: '#F0FDFA', color: COLORS.primary, border: `1px solid ${COLORS.border2}` }}
          >
            {typeInfo.emoji} {typeInfo.label}
          </span>
          <span className="text-sm font-extrabold" style={{ color: COLORS.fg }}>{concern.username}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: COLORS.fg3 }}>
          {timeAgo(concern.createdAt)}
        </span>
      </div>

      {/* Description */}
      <p className="text-[15px] font-medium leading-relaxed mb-4 pl-1" style={{ color: COLORS.fg2 }}>
        {concern.description}
      </p>

      {/* Read-only Stats & Comment Toggle */}
      <div className="flex items-center gap-3 pl-1 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: COLORS.primary }}>
          <ChevronUp size={16} strokeWidth={3} />
          <span>{concern.upvoteCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
          <ChevronDown size={16} strokeWidth={3} />
          <span>{concern.downvoteCount}</span>
        </div>
        
        {/* Clickable Comment Toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-xs font-bold ml-2 px-2 py-1 rounded-lg transition-colors hover:bg-teal-50"
          style={{ color: showComments ? COLORS.primary : COLORS.fg3 }}
        >
          <MessageCircle size={15} strokeWidth={2.5} />
          <span>{concern.commentCount} {concern.commentCount === 1 ? 'comment' : 'comments'}</span>
        </button>
      </div>

      {/* Expandable Comments (Read-Only) */}
      {showComments && (
        <ReadOnlyCommentSection concernId={concern._id} />
      )}
    </div>
  )
}

/* ── Main View ───────────────────────────── */

export default function InstitutionConcernsView() {
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  useEffect(() => {
    loadConcerns()
  }, [])

  const loadConcerns = async () => {
    setLoading(true)
    try {
      const res = await getConcernsForInstitution()
      if (res.success) {
        setConcerns(res.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and Sort logic
  const filteredAndSortedConcerns = useMemo(() => {
    let result = [...concerns]

    // 1. Filter by Type
    if (filterType !== 'all') {
      result = result.filter(c => c.type === filterType)
    }

    // 2. Filter by Date
    if (filterPeriod !== 'all') {
      const days = PERIOD_MAP[filterPeriod].days
      const cutoffTime = new Date()
      if (filterPeriod === 'today') {
        cutoffTime.setHours(0, 0, 0, 0)
      } else {
        cutoffTime.setDate(cutoffTime.getDate() - days)
      }
      result = result.filter(c => new Date(c.createdAt) >= cutoffTime)
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'upvotes') return b.upvoteCount - a.upvoteCount
      if (sortBy === 'downvotes') return b.downvoteCount - a.downvoteCount
      if (sortBy === 'comments') return b.commentCount - a.commentCount
      return 0
    })

    return result
  }, [concerns, filterType, filterPeriod, sortBy])


  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: COLORS.gradient }}
          >
            <Megaphone size={20} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: COLORS.fg }}>Campus Concerns</h2>
        </div>
        <p className="text-sm font-medium" style={{ color: COLORS.fg2 }}>
          View and track concerns raised by students across the campus
        </p>
      </div>

      {/* Filters Section (3 Columns) */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border" 
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        
        {/* Concern Type Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider pl-1" style={{ color: COLORS.fg3 }}>
            Concern Type
          </label>
          <div className="relative group">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full appearance-none bg-white border outline-none font-semibold text-sm py-2.5 pl-4 pr-10 rounded-xl transition-all cursor-pointer hover:border-teal-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              style={{ color: COLORS.fg, borderColor: COLORS.border }}
            >
              {Object.entries(TYPE_MAP).map(([key, { emoji, label }]) => (
                <option key={key} value={key}>{emoji} {label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-teal-600 transition-colors" style={{ color: COLORS.fg3 }}>
              <ChevronDownIcon size={16} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Period Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider pl-1" style={{ color: COLORS.fg3 }}>
            Period
          </label>
          <div className="relative group">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full appearance-none bg-white border outline-none font-semibold text-sm py-2.5 pl-4 pr-10 rounded-xl transition-all cursor-pointer hover:border-teal-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              style={{ color: COLORS.fg, borderColor: COLORS.border }}
            >
              {Object.entries(PERIOD_MAP).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-teal-600 transition-colors" style={{ color: COLORS.fg3 }}>
              <ChevronDownIcon size={16} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Sort by Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider pl-1" style={{ color: COLORS.fg3 }}>
            Sort by
          </label>
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-white border outline-none font-semibold text-sm py-2.5 pl-4 pr-10 rounded-xl transition-all cursor-pointer hover:border-teal-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              style={{ color: COLORS.fg, borderColor: COLORS.border }}
            >
              {Object.entries(SORT_MAP).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-teal-600 transition-colors" style={{ color: COLORS.fg3 }}>
              <ChevronDownIcon size={16} strokeWidth={2.5} />
            </div>
          </div>
        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold" style={{ color: COLORS.fg }}>
          Showing {filteredAndSortedConcerns.length} {filteredAndSortedConcerns.length === 1 ? 'concern' : 'concerns'}
        </h3>
      </div>

      {/* Concerns List */}
      {loading ? (
        <div className="rounded-2xl p-10 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="animate-pulse-gentle">
            <p className="text-sm font-medium" style={{ color: COLORS.fg3 }}>Loading campus concerns...</p>
          </div>
        </div>
      ) : filteredAndSortedConcerns.length === 0 ? (
        <div className="rounded-2xl p-12 border text-center bg-white shadow-sm" style={{ borderColor: COLORS.border }}>
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="font-extrabold text-base mb-1" style={{ color: COLORS.fg }}>No concerns found</h3>
          <p className="text-sm font-medium" style={{ color: COLORS.fg3 }}>
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedConcerns.map(concern => (
            <InstitutionConcernCard key={concern._id} concern={concern} />
          ))}
        </div>
      )}
    </div>
  )
}
