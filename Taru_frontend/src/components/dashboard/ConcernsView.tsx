import { useState, useEffect } from 'react'
import { MessageCircle, ChevronUp, ChevronDown, Plus, Send, X, Megaphone } from 'lucide-react'
import COLORS from '../../lib/theme'
import {
  getConcerns as fetchConcerns,
  createConcern,
  voteConcern,
  getComments,
  addComment,
} from '../../api/concern'

/* ── Helpers ─────────────────────────────── */

const TYPE_MAP: Record<string, { emoji: string; label: string }> = {
  college_admin: { emoji: '🏫', label: 'College/Admin' },
  faculty: { emoji: '👨‍🏫', label: 'Faculty/Teacher' },
  student_peer: { emoji: '👥', label: 'Student/Peer' },
  hostel: { emoji: '🏠', label: 'Hostel' },
  safety: { emoji: '🛡️', label: 'Safety' },
  financial: { emoji: '💰', label: 'Financial/Fees' },
  other: { emoji: '📋', label: 'Other' },
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
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
  userVote: 'up' | 'down' | null
  createdAt: string
}

/* ── Comment Section ─────────────────────── */

function CommentSection({ concernId, commentCount, onCommentAdded }: { concernId: string; commentCount: number; onCommentAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getComments(concernId)
      .then(res => setComments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [concernId])

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await addComment(concernId, newComment.trim())
      if (res.success) {
        setComments(prev => [...prev, res.data])
        setNewComment('')
        onCommentAdded()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t animate-fade-in" style={{ borderColor: COLORS.border }}>
      {loading ? (
        <p className="text-xs py-2" style={{ color: COLORS.fg3 }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs py-2" style={{ color: COLORS.fg3 }}>No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-2.5 mb-3 max-h-64 overflow-y-auto pr-1">
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
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: COLORS.fg2 }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Write a comment..."
          maxLength={1000}
          className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none transition-all focus:border-teal-500"
          style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.fg }}
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="px-3 py-2 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: COLORS.primary }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}

/* ── Concern Card ────────────────────────── */

function ConcernCard({ concern, onVote }: { concern: Concern; onVote: (id: string, vote: 'up' | 'down') => void }) {
  const [showComments, setShowComments] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState(concern.commentCount)
  const typeInfo = TYPE_MAP[concern.type] || TYPE_MAP.other

  return (
    <div
      className="rounded-2xl border p-5 transition-all card-hover"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {/* Header: type badge + username + time */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: '#F0FDFA', color: COLORS.primary, border: `1px solid ${COLORS.border2}` }}
        >
          {typeInfo.emoji} {typeInfo.label}
        </span>
        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>{concern.username}</span>
        <span className="text-[10px]" style={{ color: COLORS.fg3 }}>• {timeAgo(concern.createdAt)}</span>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.fg2 }}>
        {concern.description}
      </p>

      {/* Actions: vote + comments */}
      <div className="flex items-center gap-1">
        {/* Upvote */}
        <button
          onClick={() => onVote(concern._id, 'up')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: concern.userVote === 'up' ? COLORS.primary : COLORS.muted,
            color: concern.userVote === 'up' ? '#fff' : COLORS.fg2,
            border: `1px solid ${concern.userVote === 'up' ? COLORS.primary : COLORS.border}`,
          }}
        >
          <ChevronUp size={14} />
          {concern.upvoteCount}
        </button>

        {/* Downvote */}
        <button
          onClick={() => onVote(concern._id, 'down')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: concern.userVote === 'down' ? '#F97316' : COLORS.muted,
            color: concern.userVote === 'down' ? '#fff' : COLORS.fg2,
            border: `1px solid ${concern.userVote === 'down' ? '#F97316' : COLORS.border}`,
          }}
        >
          <ChevronDown size={14} />
          {concern.downvoteCount}
        </button>

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-teal-50 ml-1"
          style={{
            color: showComments ? COLORS.primary : COLORS.fg2,
            border: `1px solid ${showComments ? COLORS.primary : COLORS.border}`,
            background: showComments ? COLORS.muted : 'transparent',
          }}
        >
          <MessageCircle size={13} />
          {localCommentCount} {localCommentCount === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* Expandable comments */}
      {showComments && (
        <CommentSection
          concernId={concern._id}
          commentCount={localCommentCount}
          onCommentAdded={() => setLocalCommentCount(prev => prev + 1)}
        />
      )}
    </div>
  )
}

/* ── Main View ───────────────────────────── */

export default function ConcernsView() {
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadConcerns()
  }, [])

  const loadConcerns = async () => {
    setLoading(true)
    try {
      const res = await fetchConcerns()
      setConcerns(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formType || !formDesc.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await createConcern({ type: formType, description: formDesc.trim() })
      if (res.success) {
        setConcerns(prev => [res.data, ...prev])
        setFormType('')
        setFormDesc('')
        setShowForm(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit concern')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (id: string, vote: 'up' | 'down') => {
    // Optimistic update
    setConcerns(prev =>
      prev.map(c => {
        if (c._id !== id) return c
        const wasUp = c.userVote === 'up'
        const wasDown = c.userVote === 'down'

        let newUpCount = c.upvoteCount
        let newDownCount = c.downvoteCount
        let newVote: 'up' | 'down' | null = vote

        if (vote === 'up') {
          if (wasUp) {
            // Toggle off
            newUpCount--
            newVote = null
          } else {
            newUpCount++
            if (wasDown) newDownCount--
          }
        } else {
          if (wasDown) {
            // Toggle off
            newDownCount--
            newVote = null
          } else {
            newDownCount++
            if (wasUp) newUpCount--
          }
        }

        return { ...c, upvoteCount: newUpCount, downvoteCount: newDownCount, userVote: newVote }
      })
    )

    try {
      const res = await voteConcern(id, vote)
      if (res.success) {
        setConcerns(prev =>
          prev.map(c =>
            c._id === id
              ? { ...c, upvoteCount: res.data.upvoteCount, downvoteCount: res.data.downvoteCount, userVote: res.data.userVote }
              : c
          )
        )
      }
    } catch (err) {
      // Revert on error
      loadConcerns()
    }
  }

  const typeEntries = Object.entries(TYPE_MAP)

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: COLORS.gradient }}
            >
              <Megaphone size={18} className="text-white" />
            </div>
            <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>Campus Concerns</h2>
          </div>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>Voice your concerns, upvote what matters</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shrink-0"
            style={{ background: COLORS.gradient }}
          >
            <Plus size={15} /> Raise a Concern
          </button>
        )}
      </div>

      {/* Inline Concern Form */}
      {showForm && (
        <div
          className="rounded-2xl border p-6 animate-slide-up"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: COLORS.fg }}>Raise a new concern</h3>
            <button
              onClick={() => { setShowForm(false); setFormType(''); setFormDesc(''); setError('') }}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-teal-50 transition-colors"
              style={{ color: COLORS.fg3 }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Type selector */}
          <p className="text-xs font-semibold mb-2" style={{ color: COLORS.fg2 }}>Concern type</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {typeEntries.map(([key, { emoji, label }]) => (
              <button
                key={key}
                onClick={() => setFormType(key)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                style={{
                  background: formType === key ? '#F0FDFA' : COLORS.card,
                  border: `1.5px solid ${formType === key ? COLORS.primary : COLORS.border}`,
                  color: formType === key ? COLORS.primary : COLORS.fg2,
                }}
              >
                <span className="text-sm">{emoji}</span>
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs font-semibold mb-2" style={{ color: COLORS.fg2 }}>Tell us what happened</p>
          <textarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder="Describe your concern in detail..."
            maxLength={2000}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 resize-none"
            style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.fg }}
          />
          <div className="flex items-center justify-between mt-1 mb-4">
            <span className="text-[10px]" style={{ color: COLORS.fg3 }}>{formDesc.length}/2000</span>
          </div>

          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}

          {/* Submit */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!formType || !formDesc.trim() || submitting}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: COLORS.gradient }}
            >
              {submitting ? 'Submitting...' : 'Submit Concern'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormType(''); setFormDesc(''); setError('') }}
              className="px-5 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-teal-50"
              style={{ color: COLORS.fg2, borderColor: COLORS.border }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Concerns List */}
      {loading ? (
        <div className="rounded-2xl p-8 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="animate-pulse-gentle">
            <p className="text-sm" style={{ color: COLORS.fg3 }}>Loading concerns...</p>
          </div>
        </div>
      ) : concerns.length === 0 ? (
        <div className="rounded-2xl p-10 border text-center" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="text-4xl mb-3">📢</div>
          <h3 className="font-bold text-sm mb-1" style={{ color: COLORS.fg }}>No concerns yet</h3>
          <p className="text-xs mb-4" style={{ color: COLORS.fg3 }}>
            Be the first to raise a concern for your campus. Your voice matters!
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: COLORS.gradient }}
            >
              Raise a Concern
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {concerns.map(concern => (
            <ConcernCard key={concern._id} concern={concern} onVote={handleVote} />
          ))}
        </div>
      )}
    </div>
  )
}
