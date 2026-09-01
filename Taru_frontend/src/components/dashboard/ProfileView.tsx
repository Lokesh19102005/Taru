import { useState } from 'react'
import { Mail, GraduationCap, Calendar, Users, Hash, Pencil, Check, X, LogOut } from 'lucide-react'
import COLORS from '../../lib/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const BATCH_OPTIONS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028']
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

export default function ProfileView() {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    college: user?.college || '',
    batch: user?.batch || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({
        college: form.college,
        batch: form.batch,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
      })
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      college: user?.college || '',
      batch: user?.batch || '',
      age: user?.age?.toString() || '',
      gender: user?.gender || '',
    })
    setEditing(false)
  }

  const onLogout = () => {
    logout()
    navigate('/')
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Profile header */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        {/* Banner */}
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}>
          <div className="absolute -bottom-8 left-6">
            <div
              className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-extrabold text-2xl"
              style={{ background: COLORS.primary, color: '#fff', borderColor: COLORS.card }}
            >
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        <div className="pt-12 pb-5 px-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: COLORS.fg }}>{user?.username || 'User'}</h2>
              <p className="text-xs" style={{ color: COLORS.fg3 }}>Student · Joined {memberSince}</p>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:border-teal-500"
                style={{ color: COLORS.fg, borderColor: COLORS.border }}
              >
                <Pencil size={11} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:bg-red-50"
                  style={{ color: '#cc0000', borderColor: COLORS.border }}
                >
                  <X size={11} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: COLORS.primary, color: '#fff' }}
                >
                  <Check size={11} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-2xl border p-6 space-y-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <h3 className="text-sm font-bold" style={{ color: COLORS.fg }}>Personal Details</h3>

        {/* Username (read-only) */}
        <DetailRow
          icon={<Hash size={14} />}
          label="Username"
          value={user?.username || '—'}
          readOnly
        />

        {/* Email (read-only) */}
        <DetailRow
          icon={<Mail size={14} />}
          label="Email"
          value={user?.email || '—'}
          readOnly
        />

        {/* College */}
        {editing ? (
          <EditableField
            icon={<GraduationCap size={14} />}
            label="College / University"
            value={form.college}
            onChange={v => setForm({ ...form, college: v })}
            placeholder="Enter your college"
          />
        ) : (
          <DetailRow
            icon={<GraduationCap size={14} />}
            label="College / University"
            value={user?.college || '—'}
          />
        )}

        {/* Batch */}
        {editing ? (
          <div className="flex items-start gap-3">
            <div className="mt-2.5 shrink-0" style={{ color: COLORS.fg3 }}>
              <Calendar size={14} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.fg4 }}>Batch / Year</div>
              <select
                value={form.batch}
                onChange={e => setForm({ ...form, batch: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:border-teal-500 appearance-none"
                style={{ background: COLORS.bg, borderColor: COLORS.border, color: form.batch ? COLORS.fg : COLORS.fg3 }}
              >
                <option value="">Select batch</option>
                {BATCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <DetailRow
            icon={<Calendar size={14} />}
            label="Batch / Year"
            value={user?.batch || '—'}
          />
        )}

        {/* Age */}
        {editing ? (
          <EditableField
            icon={<Users size={14} />}
            label="Age"
            value={form.age}
            onChange={v => setForm({ ...form, age: v })}
            placeholder="e.g. 20"
            type="number"
          />
        ) : (
          <DetailRow
            icon={<Users size={14} />}
            label="Age"
            value={user?.age ? `${user.age} years` : '—'}
          />
        )}

        {/* Gender */}
        {editing ? (
          <div className="flex items-start gap-3">
            <div className="mt-2.5 shrink-0" style={{ color: COLORS.fg3 }}>
              <Users size={14} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: COLORS.fg4 }}>Gender</div>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className="py-2 rounded-lg border text-xs font-medium transition-all"
                    style={{
                      background: form.gender === g ? COLORS.primary : COLORS.bg,
                      color: form.gender === g ? '#fff' : COLORS.fg,
                      borderColor: form.gender === g ? COLORS.primary : COLORS.border,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <DetailRow
            icon={<Users size={14} />}
            label="Gender"
            value={user?.gender || '—'}
          />
        )}
      </div>

      {/* Stats card */}
      <div className="rounded-2xl border p-6" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: COLORS.fg }}>Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 border" style={{ background: COLORS.muted, borderColor: COLORS.border }}>
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xl font-extrabold" style={{ color: COLORS.fg }}>{user?.checkinStreak || 0}</div>
            <div className="text-[10px] font-medium" style={{ color: COLORS.fg3 }}>Day streak</div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: COLORS.muted, borderColor: COLORS.border }}>
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xl font-extrabold" style={{ color: COLORS.fg }}>{memberSince}</div>
            <div className="text-[10px] font-medium" style={{ color: COLORS.fg3 }}>Member since</div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition-all hover:bg-red-50"
        style={{ color: '#cc0000', borderColor: COLORS.border, background: COLORS.card }}
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  )
}

/* ---------- Sub-components ---------- */

function DetailRow({ icon, label, value, readOnly }: {
  icon: React.ReactNode; label: string; value: string; readOnly?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0" style={{ color: COLORS.fg3 }}>{icon}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.fg4 }}>
          {label} {readOnly && <span className="normal-case tracking-normal text-[9px]">(cannot change)</span>}
        </div>
        <div className="text-sm font-medium" style={{ color: COLORS.fg }}>{value}</div>
      </div>
    </div>
  )
}

function EditableField({ icon, label, value, onChange, placeholder, type = 'text' }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-2.5 shrink-0" style={{ color: COLORS.fg3 }}>{icon}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.fg4 }}>{label}</div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:border-teal-500"
          style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.fg }}
        />
      </div>
    </div>
  )
}
