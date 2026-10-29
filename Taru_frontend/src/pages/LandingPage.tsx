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
import { COLORS } from '../lib/studentTheme';
import TaruLogo from '../components/TaruLogo';

function Spark({ className = '', color = '#E8B4A8', size = 40 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg className={`pointer-events-none absolute ${className}`} width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z" />
    </svg>
  );
}

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
    { name: 'u/SleepyPanda42', year: 'Junior, Psychology', text: 'Taru helped me realize I wasn\'t alone during finals week. Tracking my mood really helped me a lot.' },
    { name: 'u/CosmicMango99', year: 'Sophomore, Engineering', text: 'I booked a psychiatrist appointment in under 2 minutes. Way less scary than I thought it would be.' },
    { name: 'u/CalmLlama07', year: 'Senior, Literature', text: 'The breathing games actually work. I use them before every presentation and my anxiety is so much more manageable now.' },
  ];

  return (
    <div className="student-app min-h-screen relative">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/60">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TaruLogo size={34} />
            <span className="font-display text-xl tracking-[0.2em] uppercase" style={{ color: COLORS.fg }}>taru</span>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-full border bg-white/80 px-5 py-1.5 text-xs font-medium" style={{ borderColor: COLORS.border2, color: COLORS.fg }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> We are here for you, 24/7
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: COLORS.fg2 }}>
            <a href="#features" className="hover:text-[#3A2F28] transition-colors">Features</a>
            <a href="#why" className="hover:text-[#3A2F28] transition-colors">Why us</a>
            <a href="#stories" className="hover:text-[#3A2F28] transition-colors">Stories</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/auth', { state: { tab: 'register' } })} className="text-sm font-medium px-5 py-2 rounded-full border bg-white/70 transition-colors hover:bg-white" style={{ borderColor: COLORS.border2, color: COLORS.fg }}>
              Register
            </button>
            <button onClick={() => navigate('/auth')} className="text-sm font-medium px-5 py-2 rounded-full text-white transition-all hover:opacity-90" style={{ background: COLORS.gradient }}>
              Sign In
            </button>
          </div>
          <button className="md:hidden" style={{ color: COLORS.fg }} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3 text-sm font-medium bg-white/90" style={{ color: COLORS.fg2 }}>
            <a href="#features" className="hover:text-[#3A2F28] pt-3">Features</a>
            <a href="#why" className="hover:text-[#3A2F28]">Why us</a>
            <a href="#stories" className="hover:text-[#3A2F28]">Stories</a>
            <button onClick={() => navigate('/auth', { state: { tab: 'register' } })} className="text-left font-semibold hover:text-[#3A2F28]" style={{ color: COLORS.fg }}>Register →</button>
            <button onClick={() => navigate('/auth')} className="text-left font-semibold hover:text-[#3A2F28]" style={{ color: COLORS.fg }}>Sign In →</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-10 pb-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center animate-fade-in">
        <Spark className="top-4 right-[42%] hidden md:block" size={46} />
        <Spark className="bottom-28 left-[44%] hidden md:block" size={34} color="#B9C6CE" />
        <Spark className="top-32 right-2 hidden md:block" size={22} />
        <div>
          <h1 className="text-5xl md:text-7xl leading-[1.02] mb-6" style={{ color: COLORS.fg }}>
            Compassionate support for every <span style={{ color: COLORS.accent }}>student mind.</span>
          </h1>
          <p className="text-sm md:text-base leading-relaxed mb-9 max-w-md" style={{ color: COLORS.fg2 }}>
            Taru is a safe space built for college students. It brings together check-ins, peer chat, mood tracking, and professional support, all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="group flex items-center justify-center gap-2 font-medium px-8 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
              style={{ background: COLORS.gradient, boxShadow: '0 14px 28px -14px rgba(31,26,23,0.9)' }}
            >
              Get Started Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth', { state: { tab: 'register' } })}
              className="flex items-center justify-center gap-2 border font-medium px-8 py-3.5 rounded-full transition-colors hover:bg-white text-sm bg-white/60"
              style={{ borderColor: COLORS.border2, color: COLORS.fg }}
            >
              Register
            </button>
          </div>
          <div className="flex items-center gap-6 mt-10 flex-wrap">
            {[
              { icon: <Lock size={15} />, label: 'Confidential' },
              { icon: <GraduationCap size={15} />, label: 'Student First' },
              { icon: <Brain size={15} />, label: 'Evidence Based' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs font-medium" style={{ color: COLORS.fg2 }}>
                <span style={{ color: COLORS.primary }}>{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Hero photo + floating check-in card */}
        <div className="relative">
          <div className="rounded-t-[12rem] rounded-b-[2rem] overflow-hidden h-[460px] md:h-[540px]">
            <img
              src="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1000&q=75"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:block absolute -bottom-8 -left-12 w-72 rounded-3xl p-5 bg-white/90 backdrop-blur border" style={{ borderColor: COLORS.border, boxShadow: '0 30px 50px -25px rgba(58,47,40,0.5)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: COLORS.fg }}>Today's check-in</span>
              <span className="text-[11px]" style={{ color: COLORS.fg3 }}>Mon, Jul 21</span>
            </div>
            <p className="text-xs mb-3" style={{ color: COLORS.fg2 }}>How are you feeling right now?</p>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {[
                { icon: <Frown size={15} />, label: 'Rough' },
                { icon: <Meh size={15} />, label: 'Meh' },
                { icon: <Smile size={15} />, label: 'Okay' },
                { icon: <Smile size={15} />, label: 'Good' },
                { icon: <Star size={15} />, label: 'Great' },
              ].map((m, i) => (
                <div
                  key={m.label}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl border"
                  style={{
                    borderColor: i === 2 ? COLORS.primary : COLORS.border,
                    background: i === 2 ? COLORS.muted : '#fff',
                    color: i === 2 ? COLORS.primary : COLORS.fg2,
                  }}
                >
                  {m.icon}
                  <span className="text-[9px]" style={{ color: COLORS.fg3 }}>{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.fg2 }}>
              <CheckCircle size={14} style={{ color: COLORS.primary }} /> Streak: 7 days. Keep it up!
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-3 border-y py-10" style={{ borderColor: COLORS.border }}>
          {[
            { v: '6', l: 'Wellbeing tools in one app' },
            { v: '24/7', l: 'Taru AI assistant, always on' },
            { v: '5', l: 'Multiplayer stress-relief games' },
          ].map((st, i) => (
            <div key={st.l} className={`px-4 md:px-10 ${i > 0 ? 'border-l' : ''}`} style={{ borderColor: COLORS.border }}>
              <div className="font-display text-4xl md:text-6xl leading-none" style={{ color: COLORS.fg }}>{st.v}</div>
              <div className="w-10 h-[2px] mt-3 mb-2" style={{ background: COLORS.primary }} />
              <div className="text-[11px] md:text-sm" style={{ color: COLORS.fg2 }}>{st.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="pb-24 animate-fade-in">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl mb-4" style={{ color: COLORS.fg }}>Comprehensive wellbeing tools</h2>
            <p className="max-w-md mx-auto text-sm" style={{ color: COLORS.fg2 }}>Built with students, for students. Grounded in evidence and designed to actually help.</p>
          </div>
          <div className="border-b" style={{ borderColor: COLORS.border }}>
            {features.map(f => (
              <div key={f.title} className="hairline-row group flex items-center gap-5 py-6 px-2">
                <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#1F1A17] group-hover:text-white" style={{ background: COLORS.muted, color: COLORS.primary }}>
                  {f.icon}
                </span>
                <h3 className="font-display text-2xl md:text-3xl md:w-80 shrink-0" style={{ color: COLORS.fg }}>{f.title}</h3>
                <p className="hidden md:block text-sm leading-relaxed" style={{ color: COLORS.fg3 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="pb-24 animate-fade-in">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <div className="rounded-[2rem] overflow-hidden h-[420px] md:h-[520px] order-2 md:order-1">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=75"
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl leading-tight mb-5" style={{ color: COLORS.fg }}>
              Built for the <span style={{ color: COLORS.accent }}>college reality</span>
            </h2>
            <p className="leading-relaxed mb-7 text-sm" style={{ color: COLORS.fg2 }}>
              Many college students struggle quietly and never reach out for help. Taru lowers the barrier so you can get support without appointments, stigma, or waiting lists.
            </p>
            <div className="mb-8 border-t" style={{ borderColor: COLORS.border }}>
              {[
                'Available 24/7, between lectures and at 3am',
                'Anonymous peer chat with fellow college students who get it',
                'Clinically validated mental health assessments',
                'Direct booking with certified external psychiatrists',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 py-3.5 border-b" style={{ borderColor: COLORS.border }}>
                  <CheckCircle size={16} style={{ color: COLORS.primary, marginTop: 2 }} className="shrink-0" />
                  <span className="text-sm" style={{ color: COLORS.fg }}>{item}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: <Heart size={16} />, stat: '24/7', sub: 'Taru AI assistant to talk to' },
                { icon: <BarChart2 size={16} />, stat: '5', sub: 'games to play solo or with friends' },
                { icon: <Users size={16} />, stat: '2', sub: 'crisis helplines, one tap away' },
                { icon: <Stethoscope size={16} />, stat: '1', sub: 'place for check-ins, chat and mood' },
              ].map(card => (
                <div key={card.stat}>
                  <div className="font-display text-4xl leading-none" style={{ color: COLORS.fg }}>{card.stat}</div>
                  <div className="w-8 h-[2px] mt-2 mb-1.5" style={{ background: COLORS.primary }} />
                  <div className="text-xs leading-snug" style={{ color: COLORS.fg3 }}>{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="stories" className="pb-24 animate-fade-in">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl text-center mb-12" style={{ color: COLORS.fg }}>Student stories</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-3xl p-8 border bg-white/80 card-hover" style={{ borderColor: COLORS.border }}>
                <div className="font-display text-5xl leading-none mb-3" style={{ color: COLORS.accent }}>"</div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: COLORS.fg2 }}>{t.text}</p>
                <div className="text-sm font-medium" style={{ color: COLORS.fg }}>{t.name}</div>
                <div className="text-xs" style={{ color: COLORS.fg3 }}>{t.year}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24 animate-fade-in">
        <div className="rounded-[2rem] px-6 py-20 text-center" style={{ background: 'linear-gradient(120deg, #FCE3D2 0%, #F7E8D6 55%, #EEDFC9 100%)' }}>
          <h2 className="text-4xl md:text-6xl mb-4" style={{ color: COLORS.fg }}>Ready to feel better?</h2>
          <p className="mb-9 max-w-sm mx-auto text-sm" style={{ color: COLORS.fg2 }}>Take the first step. It only takes a minute to get started.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="group inline-flex items-center justify-center gap-2 font-medium px-8 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
              style={{ background: COLORS.gradient, boxShadow: '0 14px 28px -14px rgba(31,26,23,0.9)' }}
            >
              Get Started, It's Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth', { state: { tab: 'register' } })}
              className="inline-flex items-center justify-center gap-2 border font-medium px-8 py-3.5 rounded-full transition-colors hover:bg-white text-sm bg-white/60"
              style={{ borderColor: COLORS.border2, color: COLORS.fg }}
            >
              Register
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t py-7 px-6" style={{ borderColor: COLORS.border }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: COLORS.fg3 }}>
          <div className="flex items-center gap-2">
            <TaruLogo size={16} />
            <span>taru · cogniease techno labs pvt. ltd. · made with care for students</span>
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#" className="hover:text-[#3A2F28] transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
