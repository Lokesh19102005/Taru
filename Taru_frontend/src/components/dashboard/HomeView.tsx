import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  MessageCircle,
  Gamepad2,
  Stethoscope,
  BarChart2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import COLORS from "../../lib/studentTheme";
import { useAuth } from "../../contexts/AuthContext";
import { useCheckinHistory } from "../../api/checkin";
import { getMyAppointments } from "../../api/appointment";
import WeeklyMoodChart from "./WeeklyMoodChart";
import type { Appointment } from "../../types";

const toolDescriptions: Record<string, string> = {
  check: "A short guided check-in to understand how you feel today.",
  talk: "Chat with a trained listener or a peer, anonymously.",
  games: "Calming, playful games to play solo or with friends.",
  psychiatrist: "Book a confidential session with a verified psychiatrist.",
  mood: "See your mood patterns and progress over time.",
};

const toolTints: Record<string, { bg: string; border: string; icon: string }> = {
  check: { bg: "rgba(246,200,168,0.13)", border: "rgba(232,160,120,0.22)", icon: "rgba(246,200,168,0.45)" },
  talk: { bg: "rgba(232,211,181,0.15)", border: "rgba(205,175,130,0.22)", icon: "rgba(232,211,181,0.55)" },
  games: { bg: "rgba(170,195,210,0.13)", border: "rgba(140,170,190,0.22)", icon: "rgba(170,195,210,0.45)" },
  psychiatrist: { bg: "rgba(237,170,160,0.12)", border: "rgba(215,140,130,0.22)", icon: "rgba(237,170,160,0.42)" },
  mood: { bg: "rgba(205,195,150,0.13)", border: "rgba(180,165,120,0.22)", icon: "rgba(215,200,160,0.5)" },
};

const toolSpans: Record<string, string> = {
  check: "sm:col-span-2",
  talk: "sm:col-span-2",
  games: "sm:col-span-2",
  psychiatrist: "sm:col-span-3",
  mood: "sm:col-span-3",
};

const navItems = [
  { id: "check", icon: <ClipboardList size={17} />, label: "Take a Check" },
  { id: "talk", icon: <MessageCircle size={17} />, label: "Talk to Someone" },
  { id: "games", icon: <Gamepad2 size={17} />, label: "Play Games" },
  {
    id: "psychiatrist",
    icon: <Stethoscope size={17} />,
    label: "Talk to a Psychiatrist",
  },
  { id: "mood", icon: <BarChart2 size={17} />, label: "Track Your Mood" },
];

/* ── Time Helpers ── */
function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (date >= todayStart) {
    return (
      "Today, " +
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    );
  } else if (date >= yesterdayStart) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

function formatAppointmentDate(dateStr: string, startTime: string): string {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString([], { weekday: "short" });
  const month = date.toLocaleDateString([], { month: "short" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day} · ${startTime}`;
}

export default function HomeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: historyRes } = useCheckinHistory();
  const checkins = historyRes?.data || [];

  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    getMyAppointments()
      .then((res) => {
        if (res.success) {
          const now = new Date();
          const todayMidnight = new Date(now.toDateString());
          // Show confirmed OR pending (requested) appointments from today onwards, max 2
          const future = res.data
            .filter(
              (a) =>
                (a.status === "confirmed" || a.status === "requested") &&
                new Date(a.date) >= todayMidnight
            )
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .slice(0, 2);
          setUpcomingAppts(future);
        }
      })
      .catch(() => {});
  }, []);

  // Build recent activity: last 4 check-ins from history
  const recentActivities = checkins.slice(0, 4).map((c) => ({
    icon: <BarChart2 size={12} />,
    text: `Mood check-in · ${c.mood.label}`,
    time: formatActivityTime(c.createdAt),
  }));

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  const streak = user?.checkinStreak ?? 0;
  const stats = [
    { value: streak, label: "Day check-in streak" },
    { value: checkins.length, label: "Total check-ins" },
    { value: upcomingAppts.length, label: "Upcoming sessions" },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="grid md:grid-cols-[1.15fr_1fr] gap-10 items-center pt-6 pb-12">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] mb-5" style={{ color: COLORS.primary }}>
            {getGreeting()}
          </p>
          <h1 className="text-5xl md:text-6xl leading-[1.05] mb-5" style={{ color: COLORS.fg }}>
            Hello, {user?.username || "there"}.<br />
            <span style={{ color: COLORS.accent }}>How are you feeling?</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-md mb-8" style={{ color: COLORS.fg2 }}>
            {streak > 0
              ? `You've checked in ${streak} day${streak !== 1 ? "s" : ""} in a row. That's something to be proud of.`
              : "Start your check-in journey today!"}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/dashboard/check")}
              className="flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full text-white transition-all hover:-translate-y-0.5"
              style={{ background: COLORS.gradient, boxShadow: "0 12px 24px -12px rgba(31,26,23,0.8)" }}
            >
              <ClipboardList size={14} /> Today's check-in
            </button>
            <button
              onClick={() => navigate("/dashboard/mood")}
              className="flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full border bg-white/70 hover:bg-white transition-colors"
              style={{ borderColor: COLORS.border2, color: COLORS.fg }}
            >
              <BarChart2 size={14} /> View mood
            </button>
          </div>
        </div>
        <div className="relative hidden md:block">
          <div className="rounded-[2rem] overflow-hidden h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=70"
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div
            className="absolute -bottom-5 -left-6 rounded-2xl px-5 py-3.5 bg-white/90 backdrop-blur border"
            style={{ borderColor: COLORS.border, boxShadow: "0 20px 40px -20px rgba(58,47,40,0.45)" }}
          >
            <div className="font-display text-3xl leading-none" style={{ color: COLORS.primary }}>{streak}</div>
            <div className="text-[11px] mt-1" style={{ color: COLORS.fg3 }}>day streak</div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 border-y py-8 mb-12" style={{ borderColor: COLORS.border }}>
        {stats.map((st, i) => (
          <div key={st.label} className={`px-4 md:px-8 ${i > 0 ? "border-l" : ""}`} style={{ borderColor: COLORS.border }}>
            <div className="font-display text-5xl md:text-6xl leading-none" style={{ color: COLORS.fg }}>
              {st.value}
            </div>
            <div className="w-10 h-[2px] mt-3 mb-2" style={{ background: COLORS.primary }} />
            <div className="text-[11px] md:text-xs" style={{ color: COLORS.fg2 }}>{st.label}</div>
          </div>
        ))}
      </section>

      {/* Featured chatbot */}
      <button
        type="button"
        onClick={() => navigate("/dashboard/chatbot")}
        className="group relative w-full overflow-hidden rounded-[2rem] p-8 md:p-10 text-left mb-14 transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(120deg, #FCE3D2 0%, #F7E8D6 55%, #EEDFC9 100%)" }}
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/40 blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] mb-3" style={{ color: COLORS.primaryDark }}>
              <Sparkles size={13} /> Featured for you
            </div>
            <h3 className="text-3xl md:text-4xl mb-2" style={{ color: COLORS.fg }}>Talk to Taru AI</h3>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.fg2 }}>
              Share what is on your mind and take a moment to reflect.
            </p>
          </div>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-1"
            style={{ background: COLORS.primary }}
          >
            <ChevronRight size={20} />
          </div>
        </div>
      </button>

      {/* Tools */}
      <section className="mb-14">
        <h2 className="text-3xl md:text-4xl text-center mb-8" style={{ color: COLORS.fg }}>
          Everything you need, in one place
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/dashboard/${item.id}`)}
              className={`group rounded-3xl border backdrop-blur-sm p-6 text-left min-h-[170px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(58,47,40,0.35)] ${toolSpans[item.id]}`}
              style={{ background: toolTints[item.id].bg, borderColor: toolTints[item.id].border }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-colors group-hover:bg-[#1F1A17] group-hover:text-white"
                  style={{ background: toolTints[item.id].icon, color: COLORS.fg }}
                >
                  {item.icon}
                </span>
                <ArrowUpRight
                  size={18}
                  className="transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  style={{ color: COLORS.fg3 }}
                />
              </div>
              <div>
                <h3 className="text-2xl leading-tight mb-1" style={{ color: COLORS.fg }}>
                  {item.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.fg2 }}>
                  {toolDescriptions[item.id]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Mood chart */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-3xl" style={{ color: COLORS.fg }}>Mood this week</h2>
          <button
            onClick={() => navigate("/dashboard/mood")}
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: COLORS.primary }}
          >
            Full history <ChevronRight size={12} />
          </button>
        </div>
        <div className="rounded-3xl border bg-white/80 p-6" style={{ borderColor: COLORS.border }}>
          <WeeklyMoodChart checkins={checkins} title="" maxBarHeight={64} />
        </div>
      </section>

      {/* Activity + Upcoming */}
      <section className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl mb-4" style={{ color: COLORS.fg }}>Recent activity</h2>
          {recentActivities.length === 0 ? (
            <div className="border-t py-8" style={{ borderColor: COLORS.border }}>
              <p className="text-sm font-medium" style={{ color: COLORS.fg2 }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: COLORS.fg3 }}>Complete your first check-in to see it here</p>
            </div>
          ) : (
            <div className="border-b" style={{ borderColor: COLORS.border }}>
              {recentActivities.map((a, i) => (
                <div key={i} className="hairline-row flex items-center gap-3 py-4">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.muted, color: COLORS.primary }}>
                    {a.icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: COLORS.fg }}>{a.text}</div>
                    <div className="text-xs" style={{ color: COLORS.fg3 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl mb-4" style={{ color: COLORS.fg }}>Upcoming</h2>
          {upcomingAppts.length === 0 ? (
            <div className="border-t py-8" style={{ borderColor: COLORS.border }}>
              <p className="text-sm font-medium" style={{ color: COLORS.fg2 }}>No upcoming sessions</p>
              <p className="text-xs mt-1" style={{ color: COLORS.fg3 }}>Book a session with a psychiatrist</p>
            </div>
          ) : (
            <div className="border-b" style={{ borderColor: COLORS.border }}>
              {upcomingAppts.map((appt) => {
                const doc = appt.psychiatristId as { _id: string; name: string } | string | null;
                const docName = typeof doc === "object" && doc !== null ? doc.name : "Psychiatrist";
                return (
                  <div key={appt._id} className="hairline-row py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope size={13} style={{ color: COLORS.primary }} />
                      <span className="text-sm font-medium" style={{ color: COLORS.fg }}>Psychiatrist Session</span>
                      {appt.status === "requested" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-auto">Pending</span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.fg2 }}>{docName}</div>
                    <div className="text-xs" style={{ color: COLORS.fg3 }}>{formatAppointmentDate(appt.date, appt.startTime)}</div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate("/dashboard/psychiatrist")}
            className="text-xs font-medium hover:underline flex items-center gap-1 mt-4"
            style={{ color: COLORS.primary }}
          >
            Book another session <ChevronRight size={12} />
          </button>
        </div>
      </section>
    </div>
  );
}
