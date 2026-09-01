import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Lock, GraduationCap, Brain, Stethoscope, ArrowLeft, ArrowRight } from 'lucide-react';
import { COLORS as C } from '../lib/theme';
import type { AuthTab } from '../types';
import { useAuth } from '../contexts/AuthContext';

const BATCH_OPTIONS = ['2022', '2023', '2024', '2025', '2026', '2027', '2028'];
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function AuthPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/');

  const [tab, setTab] = useState<AuthTab>('login');
  const [regStep, setRegStep] = useState(1); // 1 = email/college/pass, 2 = batch/age/gender
  const [form, setForm] = useState({
    email: '', password: '', college: '',
    batch: '', age: '', gender: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.college) {
      setError('Please fill all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setRegStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          email: form.email,
          password: form.password,
          college: form.college,
          batch: form.batch || undefined,
          age: form.age ? parseInt(form.age) : undefined,
          gender: form.gender || undefined,
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setRegStep(1);
    setError('');
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
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

          {/* Title */}
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.fg }}>
            {tab === 'login'
              ? 'Welcome back'
              : regStep === 1
                ? 'Create your account'
                : 'Tell us about yourself'}
          </h1>
          <p className="text-sm mb-7" style={{ color: C.fg2 }}>
            {tab === 'login'
              ? 'Sign in to continue your wellness journey.'
              : regStep === 1
                ? 'Join thousands of students taking care of themselves.'
                : 'This helps us personalize your experience.'}
          </p>

          {/* Tab switcher (only on step 1) */}
          {(tab === 'login' || regStep === 1) && (
            <div className="flex rounded-xl p-1 mb-6" style={{ background: C.muted }}>
              {(['login', 'register'] as AuthTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
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
          )}

          {/* Step indicator for register step 2 */}
          {tab === 'register' && regStep === 2 && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-1.5">
                <div className="w-8 h-1.5 rounded-full" style={{ background: C.primary }} />
                <div className="w-8 h-1.5 rounded-full" style={{ background: C.primary }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: C.fg3 }}>Step 2 of 2</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-red-500 text-xs font-semibold bg-red-50 p-2 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College Email</label>
                <input type="email" placeholder="you@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Password</label>
                <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
              <div className="text-right">
                <a href="#" className="text-xs font-medium hover:underline" style={{ color: C.fg }}>Forgot password?</a>
              </div>
              <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm mt-1 disabled:opacity-50"
                style={{ background: C.primary, color: '#fff' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* REGISTER STEP 1 */}
          {tab === 'register' && regStep === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              {error && (
                <div className="text-red-500 text-xs font-semibold bg-red-50 p-2 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College Email</label>
                <input type="email" placeholder="you@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>College / University</label>
                <input type="text" placeholder="Delhi University" value={form.college} onChange={e => setForm({ ...form, college: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Password</label>
                <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }} />
              </div>
              <button type="submit" className="w-full font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm mt-1 flex items-center justify-center gap-2"
                style={{ background: C.primary, color: '#fff' }}>
                Next <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* REGISTER STEP 2 */}
          {tab === 'register' && regStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-red-500 text-xs font-semibold bg-red-50 p-2 rounded-lg">{error}</div>
              )}

              {/* Batch */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Batch / Year of Admission</label>
                <select
                  value={form.batch}
                  onChange={e => setForm({ ...form, batch: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 appearance-none hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: form.batch ? C.fg : C.fg3 }}
                >
                  <option value="" disabled>Select your batch</option>
                  {BATCH_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.fg }}>Age</label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  min={14}
                  max={60}
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-teal-500 hover:bg-teal-50"
                  style={{ background: C.card, borderColor: C.border, color: C.fg }}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: C.fg }}>Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className="py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-teal-50"
                      style={{
                        background: form.gender === g ? C.primary : C.card,
                        color: form.gender === g ? '#fff' : C.fg,
                        borderColor: form.gender === g ? C.primary : C.border,
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setRegStep(1)}
                  className="flex-1 font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm flex items-center justify-center gap-2 border hover:bg-teal-50"
                  style={{ background: C.card, color: C.fg, borderColor: C.border }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] font-bold py-3 rounded-xl transition-all hover:opacity-80 text-sm disabled:opacity-50"
                  style={{ background: C.primary, color: '#fff' }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>

              <p className="text-center text-[10px]" style={{ color: C.fg4 }}>
                These fields are optional. You can skip and fill them later.
              </p>
            </form>
          )}

          {/* Bottom link */}
          {(tab === 'login' || regStep === 1) && (
            <p className="text-center text-xs mt-5" style={{ color: C.fg3 }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchTab(tab === 'login' ? 'register' : 'login')} className="font-semibold hover:underline" style={{ color: C.fg }}>
                {tab === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
