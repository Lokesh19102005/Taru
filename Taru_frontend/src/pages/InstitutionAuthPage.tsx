import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Lock, Users, BarChart3, LineChart } from 'lucide-react';
import { COLORS as C } from '../lib/institutionTheme';
import '../institution.css';
import type { AuthTab } from '../types';
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext';

export default function InstitutionAuthPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/');

  const [tab, setTab] = useState<AuthTab>('login');
  const [form, setForm] = useState({
    collegeName: '',
    contactEmail: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, institution } = useInstitutionAuth();

  useEffect(() => {
    if (institution) {
      navigate('/institution/dashboard');
    }
  }, [institution, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.collegeName, form.password);
      } else {
        await register({ 
          collegeName: form.collegeName, 
          contactEmail: form.contactEmail, 
          password: form.password 
        });
      }
      navigate('/institution/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inst-root inst-panel min-h-screen flex" style={{ background: C.bg }}>
      {/* Left panel */}
      <div className="relative overflow-hidden hidden lg:flex flex-col justify-between w-[44%] p-12" style={{ background: 'linear-gradient(160deg, #2A211C, #1F1A17)' }}>
        {/* soft gradient glows */}
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, #F4C3A1, transparent 70%)' }} />
        <div className="pointer-events-none absolute top-1/3 -right-32 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, #D98E68, transparent 70%)' }} />
        <div className="pointer-events-none absolute -top-24 left-1/3 w-[18rem] h-[18rem] rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, #B8704F, transparent 70%)' }} />
        <div className="relative flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <img src="/favicon.png" alt="" className="w-9 h-9 rounded-xl" style={{ filter: 'invert(1)' }} />
          <span className="font-display uppercase tracking-[0.25em] text-xl text-white">taru</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Institutional portal for<br />
            <span style={{ background: 'linear-gradient(135deg, #F4C3A1, #D98E68)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>campus wellbeing</span>
          </h2>
          <p className="text-white/65 text-sm leading-relaxed max-w-xs">Monitor your campus mental health trends and support student wellbeing through data-driven insights.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3">
          {[
            { icon: <BarChart3 size={13} />, text: 'Campus Analytics' },
            { icon: <Users size={13} />, text: 'Student Wellbeing' },
            { icon: <LineChart size={13} />, text: 'Data Insights' },
            { icon: <Lock size={13} />, text: 'Secure Access' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2.5 text-white/80 text-xs font-semibold">
              {b.icon}<span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        className="relative flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto animate-fade-in"
        style={{
          background:
            'radial-gradient(700px 520px at 100% 100%, rgba(140,203,214,0.75), transparent 65%), radial-gradient(700px 520px at 0% 85%, rgba(169,211,242,0.6), transparent 65%), radial-gradient(600px 400px at 70% 0%, rgba(255,255,255,0.9), transparent 65%), #EEF4F4',
        }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="" className="w-9 h-9 rounded-xl" />
              <span className="font-display uppercase tracking-[0.25em] text-xl" style={{ color: C.fg }}>taru</span>
            </div>
            <button onClick={onBack} style={{ color: C.fg3 }}><X size={18} /></button>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: C.fg }}>
            {tab === 'login' ? 'Institution Login' : 'Institution Registration'}
          </h1>
          <p className="text-sm mb-7" style={{ color: C.fg2 }}>
            {tab === 'login' ? 'Sign in to access your campus dashboard.' : 'Register your institution on our platform.'}
          </p>

          <div className="flex rounded-full p-1 mb-6 bg-white shadow-sm">
            {(['login', 'register'] as AuthTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-full text-sm font-bold transition-all"
                style={{
                  background: tab === t ? C.primary : 'transparent',
                  color: tab === t ? '#fff' : C.fg3,
                }}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-500 text-xs font-semibold bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College Name</label>
              <input type="text" placeholder="e.g. IIIT Allahabad" value={form.collegeName} onChange={e => setForm({ ...form, collegeName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                style={{ background: C.card, borderColor: C.border, color: C.fg }} required />
            </div>
            
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Contact Email</label>
                <input type="email" placeholder="admin@college.edu" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} required />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                style={{ background: C.card, borderColor: C.border, color: C.fg }} required />
            </div>

            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-full transition-all hover:opacity-85 text-sm mt-2 disabled:opacity-50"
              style={{ background: C.primary, color: '#fff' }}>
              {loading ? (tab === 'login' ? 'Signing in...' : 'Registering...') : (tab === 'login' ? 'Sign In' : 'Register')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs font-medium hover:underline" style={{ color: C.fg3 }}>
              ← Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
