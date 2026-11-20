import { useState } from 'react';
import { Heart, LogOut, User, Calendar, ClipboardList } from 'lucide-react';
import { usePsychiatristAuth } from '../contexts/PsychiatristAuthContext';
import { COLORS } from '../lib/theme';
import { useNavigate } from 'react-router-dom';
import PsychiatristProfileView from '../components/psychiatrist/PsychiatristProfileView';
import ManageAvailabilityView from '../components/psychiatrist/ManageAvailabilityView';
import PsychiatristAppointmentsView from '../components/psychiatrist/PsychiatristAppointmentsView';

type Tab = 'profile' | 'availability' | 'appointments';

export default function PsychiatristDashboardPage() {
  const { psychiatrist, logout } = usePsychiatristAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const handleLogout = () => {
    logout();
    navigate('/psychiatrist/signin');
  };

  if (!psychiatrist) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'availability', label: 'Manage Availability', icon: Calendar },
    { id: 'appointments', label: 'Appointments', icon: ClipboardList },
  ] as const;

  return (
    <div className="min-h-dvh" style={{ background: COLORS.bg }}>
      <header className="glass px-4 sm:px-6 py-3 border-b flex justify-between items-center gap-3 sticky top-0 z-10" style={{ borderColor: COLORS.border }}>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
            <Heart size={14} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-lg" style={{ color: COLORS.fg }}>taru pro</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <span className="hidden sm:block truncate text-sm font-semibold" style={{ color: COLORS.fg }}>{psychiatrist.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 shrink-0 min-h-11 text-xs font-bold px-3 rounded-lg border hover:bg-teal-50 transition-colors"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-5 md:py-10 px-4 sm:px-6 flex flex-col md:flex-row gap-5 md:gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav aria-label="Clinician dashboard" className="grid grid-cols-3 gap-1 md:flex md:flex-col md:gap-2 md:sticky md:top-24">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 px-2 md:px-4 py-3 rounded-xl text-center text-xs md:text-sm font-bold transition-all duration-200 md:text-left hover:bg-teal-50"
                style={{
                  background: activeTab === tab.id ? COLORS.primary : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : COLORS.fg2,
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        
        <section className="flex-1 min-w-0">
          {activeTab === 'profile' && <PsychiatristProfileView psychiatrist={psychiatrist} />}
          {activeTab === 'availability' && <ManageAvailabilityView />}
          {activeTab === 'appointments' && <PsychiatristAppointmentsView />}
        </section>
      </main>
    </div>
  );
}
