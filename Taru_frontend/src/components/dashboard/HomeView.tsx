import { useNavigate } from 'react-router-dom'
import { ClipboardList, MessageCircle, Gamepad2, Stethoscope, BarChart2, ChevronRight } from 'lucide-react'
import COLORS from '../../lib/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useCheckinHistory } from '../../api/checkin'
import WeeklyMoodChart from './WeeklyMoodChart'

const navItems = [
  { id: 'check', icon: <ClipboardList size={17} />, label: 'Take a Check' },
  { id: 'talk', icon: <MessageCircle size={17} />, label: 'Talk to Someone' },
  { id: 'games', icon: <Gamepad2 size={17} />, label: 'Play Games' },
  { id: 'psychiatrist', icon: <Stethoscope size={17} />, label: 'Talk to a Psychiatrist' },
  { id: 'mood', icon: <BarChart2 size={17} />, label: 'Track Your Mood' },
]

export default function HomeView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: historyRes } = useCheckinHistory()
  const checkins = historyRes?.data || []

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}>
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
          <div className="w-48 h-48 rounded-full border-[40px] border-white absolute -top-10 -right-10" />
          <div className="w-28 h-28 rounded-full border-[25px] border-white absolute bottom-2 right-20" />
        </div>
        <div className="relative">
          <p className="text-white/50 text-xs mb-0.5">Good morning,</p>
          <h2 className="text-2xl font-extrabold text-white mb-1">{user?.username || 'there'} ✨</h2>
          <p className="text-white/60 text-xs">
            {user?.checkinStreak && user.checkinStreak > 0
              ? `You've checked in ${user.checkinStreak} day${user.checkinStreak !== 1 ? 's' : ''} in a row. That's something to be proud of.`
              : `Start your check-in journey today!`}
          </p>
          <div className="flex gap-2.5 mt-4">
            <button onClick={() => navigate('/dashboard/check')}
              className="bg-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
              style={{ color: COLORS.primary }}>
              <ClipboardList size={12} /> Today's check-in
            </button>
            <button onClick={() => navigate('/dashboard/mood')}
              className="bg-white/15 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <BarChart2 size={12} /> View mood
            </button>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {navItems.slice(0, 4).map(item => (
          <button key={item.id} onClick={() => navigate(`/dashboard/${item.id}`)}
            className="rounded-2xl p-4 border transition-all hover:border-teal-400 hover:shadow-sm text-left group card-hover"
            style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-colors group-hover:bg-teal-600 group-hover:text-white"
              style={{ background: COLORS.muted, color: COLORS.fg }}>
              {item.icon}
            </div>
            <div className="text-xs font-bold leading-snug" style={{ color: COLORS.fg }}>{item.label}</div>
          </button>
        ))}
      </div>

      {/* Mood chart */}
      <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-0">
          <div /> {/* WeeklyMoodChart renders its own title */}
          <button onClick={() => navigate('/dashboard/mood')} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: COLORS.fg }}>
            Full history <ChevronRight size={11} />
          </button>
        </div>
        <WeeklyMoodChart checkins={checkins} title="Mood this week" maxBarHeight={52} />
      </div>

      {/* Activity + upcoming */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>Recent activity</h3>
          <div className="space-y-3">
            {[
              { icon: <BarChart2 size={12} />, text: 'Logged mood', time: 'Today, 9:14am' },
              { icon: <ClipboardList size={12} />, text: 'Taru check-in complete', time: 'Yesterday' },
              { icon: <Gamepad2 size={12} />, text: 'Played breathing game', time: 'Yesterday' },
              { icon: <MessageCircle size={12} />, text: 'Peer chat session', time: 'Jul 18' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: COLORS.muted, color: COLORS.fg }}>{a.icon}</div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: COLORS.fg }}>{a.text}</div>
                  <div className="text-[10px]" style={{ color: COLORS.fg3 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>Upcoming</h3>
          <div
            className="rounded-xl p-3 border mb-3"
            style={{ background: COLORS.muted, borderColor: COLORS.border }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={12} style={{ color: COLORS.fg }} />
              <span className="text-xs font-bold" style={{ color: COLORS.fg }}>Psychiatrist Session</span>
            </div>
            <div className="text-xs" style={{ color: COLORS.fg2 }}>Dr. Ananya Singh</div>
            <div className="text-xs" style={{ color: COLORS.fg2 }}>Wed, Jul 23 · 11:00am</div>
          </div>
          <button onClick={() => navigate('/dashboard/psychiatrist')} className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: COLORS.fg }}>
            Book another session <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
