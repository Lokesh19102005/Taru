import { useState } from 'react'
import { useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom'
import { Heart, LogOut, Building2, Activity, Users, Menu, BarChart2, Settings } from 'lucide-react'
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext'
import { COLORS } from '../lib/theme'

const sidebarItems = [
  { id: 'overview', icon: <Activity size={16} />, label: 'Overview' },
  { id: 'students', icon: <Users size={16} />, label: 'Students' },
]

export default function InstitutionDashboardPage() {
  const { institution, logout } = useInstitutionAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/institution/login')
  }

  if (!institution) return null

  const isOverview = location.pathname === '/institution/dashboard' || location.pathname === '/institution/dashboard/overview'

  return (
    <div className="h-screen flex flex-col animate-fade-in" style={{ background: COLORS.muted }}>
      {/* Top bar */}
      <header
        className="glass sticky top-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between border-b"
        style={{ borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <button className="md:hidden hover:text-teal-600 transition-colors" style={{ color: COLORS.fg2 }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
              <Heart size={13} className="text-white" fill="white" />
            </div>
            <span className="font-extrabold text-[0.9rem] tracking-tight" style={{ color: COLORS.fg }}>taru campus</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: COLORS.muted }}>
            <Building2 size={13} style={{ color: COLORS.fg2 }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.fg }}>{institution.collegeName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-red-50 transition-colors"
            style={{ borderColor: COLORS.border, color: '#cc0000' }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside
          className={`glass fixed md:static top-14 bottom-0 left-0 z-40 w-56 flex flex-col border-r transition-transform duration-200 overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          style={{ borderColor: COLORS.border }}
        >
          <nav className="flex-1 p-3 space-y-0.5">
            <NavLink
              to="/institution/dashboard"
              end
              onClick={() => setSidebarOpen(false)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-semibold hover:bg-teal-50"
              style={{ background: isOverview ? COLORS.primary : 'transparent', color: isOverview ? '#fff' : COLORS.fg2 }}
            >
              <BarChart2 size={16} /> Dashboard
            </NavLink>

            <p className="text-[9px] font-bold uppercase tracking-widest px-3 pt-4 pb-1" style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg4 }}>Manage</p>

            {sidebarItems.map(item => {
              const path = `/institution/dashboard/${item.id}`
              const isActive = location.pathname === path
              return (
                <NavLink
                  key={item.id}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-semibold hover:bg-teal-50"
                  style={{ background: isActive ? COLORS.primary : 'transparent', color: isActive ? '#fff' : COLORS.fg2 }}
                >
                  {item.icon}
                  <span className="leading-tight">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-3 border-t" style={{ borderColor: COLORS.border }}>
            <div className="rounded-xl p-3 border mb-3 card-hover" style={{ background: COLORS.muted, borderColor: COLORS.border }}>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={12} style={{ color: COLORS.fg }} />
                <span className="text-xs font-bold" style={{ color: COLORS.fg }}>{institution.collegeName}</span>
              </div>
              <p className="text-[10px]" style={{ color: COLORS.fg3 }}>{institution.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors hover:bg-red-50"
              style={{ color: '#cc0000' }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative z-0">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
