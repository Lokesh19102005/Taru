import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  MessageCircle,
  Stethoscope,
  BarChart2,
  Gamepad2,
  Shield,
  Heart,
  X,
  Menu,
  Sparkles,
  ArrowRight,
  Frown,
  Meh,
  Smile,
  Star,
  CheckCircle,
  Users,
  Lock,
  GraduationCap,
  Brain
} from 'lucide-react';
import { COLORS } from '../lib/theme';

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const features = [
    { icon: <ClipboardList size={20} />, title: 'Mental Health Check-ins', desc: 'Quick, science-backed assessments to understand how you are doing today.' },
    { icon: <MessageCircle size={20} />, title: 'Peer Support Chat', desc: 'Connect with fellow students who\'ve been through similar experiences.' },
    { icon: <Stethoscope size={20} />, title: 'Talk to a Psychiatrist', desc: 'Book confidential sessions with certified external professionals online.' },
    { icon: <BarChart2 size={20} />, title: 'Mood Tracking', desc: 'Visualize your emotional patterns over time and discover what helps.' },
    { icon: <Gamepad2 size={20} />, title: 'Stress Relief Games', desc: 'Evidence-based interactive tools designed to ground and calm your mind.' },
    { icon: <Shield size={20} />, title: 'Private & Secure', desc: 'Your data stays yours. We never share personal information with anyone.' },
  ];

  const testimonials = [
    { name: 'Priya M.', year: 'Junior, Psychology', text: 'Taru helped me realize I wasn\'t alone during finals week. The mood tracker is the first thing I open every morning.' },
    { name: 'Arjun K.', year: 'Sophomore, Engineering', text: 'I booked a psychiatrist appointment in under 2 minutes. Way less scary than I thought it would be.' },
    { name: 'Sofia R.', year: 'Senior, Literature', text: 'The breathing games actually work. I use them before every presentation and my anxiety is so much more manageable now.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ background: 'rgba(249,249,249,0.92)', borderColor: COLORS.border }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
              <Heart size={13} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: COLORS.fg }}>taru</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: COLORS.fg2 }}>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#why" className="hover:text-black transition-colors">Why us</a>
            <a href="#stories" className="hover:text-black transition-colors">Stories</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/check')} className="text-sm font-semibold px-4 py-2 rounded-lg border transition-all hover:bg-black hover:text-white" style={{ borderColor: COLORS.border, color: COLORS.fg }}>
              Take a Check
            </button>
            <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80" style={{ background: COLORS.primary, color: '#fff' }}>
              Sign In
            </button>
          </div>
          <button className="md:hidden" style={{ color: COLORS.fg }} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3 text-sm font-medium border-t" style={{ borderColor: COLORS.border, color: COLORS.fg2 }}>
            <a href="#features">Features</a>
            <a href="#why">Why us</a>
            <a href="#stories">Stories</a>
            <button onClick={() => navigate('/check')} className="text-left font-semibold" style={{ color: COLORS.fg }}>Take a Check →</button>
            <button onClick={() => navigate('/auth')} className="text-left font-semibold" style={{ color: COLORS.fg }}>Sign In →</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6 tracking-widest uppercase border"
            style={{ borderColor: COLORS.border, color: COLORS.fg2, background: COLORS.muted }}
          >
            <Sparkles size={11} />
            Free for all students
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] mb-5" style={{ color: COLORS.fg }}>
            Your mental<br />
            <span style={{ borderBottom: `3px solid ${COLORS.fg}` }}>wellbeing</span><br />
            matters here.
          </h1>
          <p className="text-lg leading-relaxed mb-8 max-w-md" style={{ color: COLORS.fg2 }}>
            Taru is a safe space built for college students — offering check-ins, peer chat, mood tracking, and professional support, all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="group flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-xl transition-all hover:opacity-80"
              style={{ background: COLORS.primary, color: '#fff' }}
            >
              Get Started Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/check')}
              className="flex items-center justify-center gap-2 border font-semibold px-7 py-3.5 rounded-xl transition-all hover:bg-black hover:text-white text-sm"
              style={{ borderColor: COLORS.fg, color: COLORS.fg, background: 'transparent' }}
            >
              <ClipboardList size={15} /> Take a Check (no login)
            </button>
          </div>
          <div className="flex items-center gap-6 mt-8 flex-wrap">
            {[
              { icon: <Lock size={16} />, label: 'Confidential' },
              { icon: <GraduationCap size={16} />, label: 'Student First' },
              { icon: <Brain size={16} />, label: 'Evidence Based' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-sm font-bold" style={{ color: COLORS.fg }}>
                {s.icon}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Hero card */}
        <div className="hidden md:block relative">
          <div className="rounded-3xl p-6 border shadow-lg" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-bold" style={{ color: COLORS.fg }}>Today's check-in</span>
              <span className="text-xs" style={{ color: COLORS.fg3 }}>Mon, Jul 21</span>
            </div>
            <p className="text-sm mb-4" style={{ color: COLORS.fg2 }}>How are you feeling right now?</p>
            <div className="grid grid-cols-5 gap-2 mb-5">
              {[
                { icon: <Frown size={16} />, label: 'Rough' },
                { icon: <Meh size={16} />, label: 'Meh' },
                { icon: <Smile size={16} />, label: 'Okay' },
                { icon: <Smile size={16} />, label: 'Good' },
                { icon: <Star size={16} />, label: 'Great' },
              ].map((m, i) => (
                <button
                  key={m.label}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all text-xs"
                  style={{
                    borderColor: i === 2 ? COLORS.primary : COLORS.border,
                    background: i === 2 ? COLORS.muted : COLORS.bg,
                    color: COLORS.fg,
                  }}
                >
                  {m.icon}
                  <span className="text-[9px]" style={{ color: COLORS.fg3 }}>{m.label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
              {[{ label: 'Sleep quality', val: 72 }, { label: 'Stress level', val: 45 }, { label: 'Energy', val: 61 }].map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs mb-1" style={{ color: COLORS.fg3 }}>
                    <span>{bar.label}</span><span>{bar.val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.muted }}>
                    <div className="h-full rounded-full" style={{ width: `${bar.val}%`, background: COLORS.primary }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-2xl px-4 py-3 border shadow-md flex items-center gap-2.5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <CheckCircle size={15} style={{ color: COLORS.fg }} />
            <div>
              <div className="text-xs font-bold" style={{ color: COLORS.fg }}>Streak: 7 days</div>
              <div className="text-[10px]" style={{ color: COLORS.fg3 }}>Keep it up!</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t" style={{ borderColor: COLORS.border }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-3" style={{ color: COLORS.fg }}>Everything you need to thrive</h2>
            <p className="max-w-md mx-auto" style={{ color: COLORS.fg2 }}>Tools built with students, for students — grounded in evidence and designed to actually help.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="rounded-2xl p-6 border transition-all hover:shadow-md group" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-black group-hover:text-white" style={{ background: COLORS.muted, color: COLORS.fg }}>
                  {f.icon}
                </div>
                <h3 className="font-bold mb-1.5 text-sm" style={{ color: COLORS.fg }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: COLORS.fg2 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why — updated per user request */}
      <section id="why" className="py-20 border-t" style={{ borderColor: COLORS.border }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-extrabold mb-5 leading-tight" style={{ color: COLORS.fg }}>
              Built for the<br />
              <span style={{ textDecoration: 'underline', textDecorationThickness: '3px' }}>college reality</span>
            </h2>
            <p className="leading-relaxed mb-6 text-sm" style={{ color: COLORS.fg2 }}>
              1 in 3 college students experience significant anxiety or depression. Most never seek help. Taru lowers the barrier — no appointment needed, no stigma, no waiting list.
            </p>
            <div className="space-y-3">
              {[
                'Available 24/7, between lectures and at 3am',
                'Anonymous peer chat with fellow college students who get it',
                'Clinically validated mental health assessments',
                'Direct booking with certified external psychiatrists',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle size={15} style={{ color: COLORS.fg, marginTop: 2 }} className="shrink-0" />
                  <span className="text-sm" style={{ color: COLORS.fg }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Heart size={22} />, stat: '87%', sub: 'feel less alone after peer chat' },
              { icon: <BarChart2 size={22} />, stat: '3 weeks', sub: 'avg. to notice mood patterns' },
              { icon: <Users size={22} />, stat: '240+', sub: 'fellow students on the platform' },
              { icon: <Stethoscope size={22} />, stat: '<48h', sub: 'avg. external psychiatrist booking' },
            ].map(card => (
              <div key={card.stat} className="rounded-2xl p-5 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: COLORS.muted, color: COLORS.fg }}>
                  {card.icon}
                </div>
                <div className="text-2xl font-extrabold mb-1" style={{ color: COLORS.fg }}>{card.stat}</div>
                <div className="text-xs leading-snug" style={{ color: COLORS.fg3 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="stories" className="py-20 border-t" style={{ background: COLORS.primary, borderColor: COLORS.primary }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-white text-center mb-12">Student stories</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-2xl p-6 border border-white/15" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-white/80 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-white/50 text-xs">{t.year}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-extrabold mb-4" style={{ color: COLORS.fg }}>Ready to feel better?</h2>
        <p className="mb-8 max-w-sm mx-auto text-sm" style={{ color: COLORS.fg2 }}>Join 12,000+ students already taking care of their mental health.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/auth')}
            className="group inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl transition-all hover:opacity-80"
            style={{ background: COLORS.primary, color: '#fff' }}
          >
            Get Started — It's Free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/check')}
            className="inline-flex items-center gap-2 border font-semibold px-8 py-4 rounded-xl transition-all hover:bg-black hover:text-white text-sm"
            style={{ borderColor: COLORS.fg, color: COLORS.fg }}
          >
            <ClipboardList size={15} /> Try a check first
          </button>
        </div>
      </section>

      <footer className="border-t py-7 px-6" style={{ borderColor: COLORS.border }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: COLORS.fg3 }}>
          <div className="flex items-center gap-2">
            <Heart size={11} style={{ color: COLORS.fg }} fill={COLORS.fg} />
            <span>taru · cogniease techno labs pvt. ltd. · made with care for students</span>
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#" className="hover:text-black transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
