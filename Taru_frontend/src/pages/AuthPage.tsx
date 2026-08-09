import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Lock, GraduationCap, Brain, Stethoscope } from 'lucide-react';
import { COLORS as C } from '../lib/theme';
import type { AuthTab } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/');

  const [tab, setTab] = useState<AuthTab>('login');
  const [form, setForm] = useState({ email: '', password: '', college: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ email: form.email, password: form.password, college: form.college });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: C.bg }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] p-12 border-r" style={{ background: C.primary, borderColor: '#000' }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Heart size={13} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-white">taru</span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your journey to<br />
            <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' }}>better wellbeing</span><br />
            starts today.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">Free, confidential, and designed for students just like you.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Lock size={13} />, text: 'Confidential' },
            { icon: <GraduationCap size={13} />, text: 'Student First' },
            { icon: <Brain size={13} />, text: 'Evidence Based' },
            { icon: <Stethoscope size={13} />, text: 'Professional Help' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 text-white/75 text-xs">
              {b.icon}<span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
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
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm mb-7" style={{ color: C.fg2 }}>
            {tab === 'login' ? 'Sign in to continue your wellness journey.' : 'Join thousands of students taking care of themselves.'}
          </p>

          <div className="flex rounded-xl p-1 mb-6" style={{ background: C.muted }}>
            {(['login', 'register'] as AuthTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
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
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College Email</label>
              <input type="email" placeholder="you@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-black"
                style={{ background: C.card, borderColor: C.border, color: C.fg }} />
            </div>
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College / University</label>
                <input type="text" placeholder="Delhi University" value={form.college} onChange={e => setForm({ ...form, college: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-black"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-black"
                style={{ background: C.card, borderColor: C.border, color: C.fg }} />
            </div>
            {tab === 'login' && (
              <div className="text-right">
                <a href="#" className="text-xs font-medium hover:underline" style={{ color: C.fg }}>Forgot password?</a>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm mt-1 disabled:opacity-50"
              style={{ background: C.primary, color: '#fff' }}>
              {loading ? (tab === 'login' ? 'Signing in...' : 'Creating account...') : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: C.fg3 }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setTab(tab === 'login' ? 'register' : 'login')} className="font-semibold hover:underline" style={{ color: C.fg }}>
              {tab === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
