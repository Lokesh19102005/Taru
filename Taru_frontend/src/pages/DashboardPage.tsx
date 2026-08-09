import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom'
import { Heart, Menu, Bell, Sparkles, LogOut, ClipboardList, MessageCircle, Gamepad2, Stethoscope, BarChart2, Mail, GraduationCap, User, Calendar } from 'lucide-react'
import COLORS from '../lib/theme'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { id: 'check', icon: <ClipboardList size={17} />, label: 'Take a Check' },
  { id: 'talk', icon: <MessageCircle size={17} />, label: 'Talk to Someone' },
  { id: 'games', icon: <Gamepad2 size={17} />, label: 'Play Games' },
  { id: 'psychiatrist', icon: <Stethoscope size={17} />, label: 'Talk to a Psychiatrist' },
  { id: 'mood', icon: <BarChart2 size={17} />, label: 'Track Your Mood' },
]

function UserDropdown({ onLogout, onClose, user }: { onLogout: () => void; onClose: () => void; user: any }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-xl z-50 overflow-hidden"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: COLORS.border, background: COLORS.muted }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-lg" style={{ background: COLORS.primary, color: '#fff' }}>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div>
            <div className="font-bold text-sm" style={{ color: COLORS.fg }}>{user?.username || ''}</div>
            <div className="text-xs" style={{ color: COLORS.fg3 }}>{user?.year && user?.degree ? `${user.year} · ${user.degree}` : user?.year || user?.degree || 'Student'}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-3 border-b" style={{ borderColor: COLORS.border }}>
        {[
          { icon: <Mail size={13} />, label: 'Email', val: user?.email || '' },
          { icon: <GraduationCap size={13} />, label: 'College', val: user?.college || '' },
          { icon: <User size={13} />, label: 'Year', val: user?.year && user?.degree ? `${user.year} · ${user.degree}` : user?.year || user?.degree || '—' },
          { icon: <Calendar size={13} />, label: 'Member since', val: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
        ].map(row => (
          <div key={row.label} className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0" style={{ color: COLORS.fg3 }}>{row.icon}</div>
            <div>
              <div className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg4 }}>{row.label}</div>
              <div className="text-xs font-medium" style={{ color: COLORS.fg }}>{row.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Streak */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: COLORS.border }}>
        <span className="text-xs font-semibold" style={{ color: COLORS.fg }}>Check-in streak</span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: COLORS.muted, color: COLORS.fg }}>🔥 {user?.checkinStreak || 0} days</span>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-red-50"
        style={{ color: '#cc0000' }}
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/')
  }

  // To match active state check
  const isOverview = location.pathname === '/dashboard' || location.pathname === '/dashboard/home'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.muted }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between border-b"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <button className="md:hidden" style={{ color: COLORS.fg2 }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
              <Heart size={13} className="text-white" fill="white" />
            </div>
            <span className="font-extrabold text-[0.9rem] tracking-tight" style={{ color: COLORS.fg }}>taru</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: COLORS.fg2 }}>
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: COLORS.primary }} />
          </button>
          <div className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 pl-1 py-1 pr-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm" style={{ background: COLORS.primary, color: '#fff' }}>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold leading-tight" style={{ color: COLORS.fg }}>{user?.username || ''}</div>
                <div className="text-[10px]" style={{ color: COLORS.fg3 }}>
                  {user?.year && user?.degree ? `${user.year} · ${user.degree}` : user?.year || user?.degree || 'Student'}
                </div>
              </div>
            </button>
            {userOpen && <UserDropdown onLogout={onLogout} onClose={() => setUserOpen(false)} user={user} />}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside
          className={`fixed md:static top-14 bottom-0 left-0 z-40 w-60 flex flex-col border-r transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <nav className="flex-1 p-3 space-y-0.5">
            <NavLink
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all font-semibold"
              style={{ background: isOverview ? COLORS.primary : 'transparent', color: isOverview ? '#fff' : COLORS.fg2 }}
            >
              <Sparkles size={16} /> Overview
            </NavLink>

            <p className="text-[9px] font-bold uppercase tracking-widest px-3 pt-3 pb-1" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg4 }}>Tools</p>

            {navItems.map(item => {
              const isActive = location.pathname === `/dashboard/${item.id}`
              return (
                <NavLink
                  key={item.id}
                  to={`/dashboard/${item.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all font-semibold"
                  style={{ background: isActive ? COLORS.primary : 'transparent', color: isActive ? '#fff' : COLORS.fg2 }}
                >
                  {item.icon}
                  <span className="leading-tight">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="p-3 border-t" style={{ borderColor: COLORS.border }}>
            <div className="rounded-xl p-3 mb-3 border" style={{ background: COLORS.muted, borderColor: COLORS.border }}>
              <p className="text-xs font-bold mb-0.5" style={{ color: COLORS.fg }}>Crisis line</p>
              <p className="text-[10px]" style={{ color: COLORS.fg3 }}>iCall: 9152987821</p>
              <p className="text-[10px]" style={{ color: COLORS.fg3 }}>Vandrevala: 1860-2662-345</p>
            </div>
            <button onClick={onLogout}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors hover:bg-red-50"
              style={{ color: '#cc0000' }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto relative z-0">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
