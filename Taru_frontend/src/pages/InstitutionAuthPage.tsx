import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, X, Lock, Users, BarChart3, LineChart } from 'lucide-react';
import { COLORS as C } from '../lib/theme';
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
    <div className="min-h-screen flex" style={{ background: C.bg }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] p-12 border-r" style={{ background: 'linear-gradient(135deg, #0D9488, #059669)', borderColor: C.border }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Heart size={13} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-white">taru</span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Institutional portal for<br />
            <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' }}>campus wellbeing</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">Monitor your campus mental health trends and support student wellbeing through data-driven insights.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BarChart3 size={13} />, text: 'Campus Analytics' },
            { icon: <Users size={13} />, text: 'Student Wellbeing' },
            { icon: <LineChart size={13} />, text: 'Data Insights' },
            { icon: <Lock size={13} />, text: 'Secure Access' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 text-white/75 text-xs">
              {b.icon}<span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto animate-fade-in">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.primary }}>
                <Heart size={13} className="text-white" fill="white" />
              </div>
              <span className="font-bold" style={{ color: C.fg }}>taru</span>
            </div>
            <button onClick={onBack} style={{ color: C.fg3 }}><X size={18} /></button>
          </div>

          <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.fg }}>
            {tab === 'login' ? 'Institution Login' : 'Institution Registration'}
          </h1>
          <p className="text-sm mb-7" style={{ color: C.fg2 }}>
            {tab === 'login' ? 'Sign in to access your campus dashboard.' : 'Register your institution on our platform.'}
          </p>

          <div className="flex rounded-xl p-1 mb-6" style={{ background: C.muted }}>
            {(['login', 'register'] as AuthTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-teal-50"
                style={{
                  background: tab === t ? C.card : 'transparent',
                  color: tab === t ? C.fg : C.fg3,
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
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

            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm mt-2 disabled:opacity-50"
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
