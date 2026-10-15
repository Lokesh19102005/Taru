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
  CalendarClock,
} from "lucide-react";
import COLORS from "../../lib/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCheckinHistory } from "../../api/checkin";
import { getMyAppointments } from "../../api/appointment";
import WeeklyMoodChart from "./WeeklyMoodChart";
import type { Appointment } from "../../types";

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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D9488, #059669)" }}
      >
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
          <div className="w-48 h-48 rounded-full border-[40px] border-white absolute -top-10 -right-10" />
          <div className="w-28 h-28 rounded-full border-[25px] border-white absolute bottom-2 right-20" />
        </div>
        <div className="relative">
          <p className="text-white/50 text-xs mb-0.5">{getGreeting()},</p>
          <h2 className="text-2xl font-extrabold text-white mb-1">
            {user?.username || "there"} ✨
          </h2>
          <p className="text-white/60 text-xs">
            {user?.checkinStreak && user.checkinStreak > 0
              ? `You've checked in ${user.checkinStreak} day${user.checkinStreak !== 1 ? "s" : ""} in a row. That's something to be proud of.`
              : `Start your check-in journey today!`}
          </p>
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => navigate("/dashboard/check")}
              className="bg-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
              style={{ color: COLORS.primary }}
            >
              <ClipboardList size={12} /> Today's check-in
            </button>
            <button
              onClick={() => navigate("/dashboard/mood")}
              className="bg-white/15 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5"
            >
              <BarChart2 size={12} /> View mood
            </button>
          </div>
        </div>
      </div>

      {/* Featured chatbot */}
      <button
        type="button"
        onClick={() => navigate("/dashboard/chatbot")}
        className="group w-full rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: COLORS.card,
          borderColor: COLORS.border2,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: COLORS.gradient }}
            >
              <Sparkles size={22} color="#fff" />
            </div>
            <div className="min-w-0">
              <div
                className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: COLORS.primary }}
              >
                Featured for you
              </div>
              <h3
                className="text-base font-extrabold"
                style={{ color: COLORS.fg }}
              >
                Talk to Taru AI
              </h3>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: COLORS.fg2 }}
              >
                Share what is on your mind and take a moment to reflect.
              </p>
            </div>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-1"
            style={{ background: COLORS.muted, color: COLORS.primary }}
          >
            <ChevronRight size={18} />
          </div>
        </div>
      </button>

      {/* Quick access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/dashboard/${item.id}`)}
            className="rounded-2xl p-4 border transition-all hover:border-teal-400 hover:shadow-sm text-left group card-hover"
            style={{ background: COLORS.card, borderColor: COLORS.border }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-colors group-hover:bg-teal-600 group-hover:text-white"
              style={{ background: COLORS.muted, color: COLORS.fg }}
            >
              {item.icon}
            </div>
            <div
              className="text-xs font-bold leading-snug"
              style={{ color: COLORS.fg }}
            >
              {item.label}
            </div>
          </button>
        ))}
      </div>

      {/* Mood chart */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <div className="flex items-center justify-between mb-0">
          <div />
          <button
            onClick={() => navigate("/dashboard/mood")}
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: COLORS.fg }}
          >
            Full history <ChevronRight size={11} />
          </button>
        </div>
        <WeeklyMoodChart
          checkins={checkins}
          title="Mood this week"
          maxBarHeight={52}
        />
      </div>

      {/* Activity + Upcoming */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* ── Recent Activity (dynamic — last 4 check-ins) ── */}
        <div
          className="rounded-2xl p-5 border"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>
            Recent activity
          </h3>

          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ background: COLORS.muted }}
              >
                <BarChart2 size={16} style={{ color: COLORS.fg3 }} />
              </div>
              <p className="text-xs font-medium" style={{ color: COLORS.fg3 }}>
                No activity yet
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: COLORS.fg3 }}>
                Complete your first check-in to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: COLORS.muted, color: COLORS.fg }}
                  >
                    {a.icon}
                  </div>
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: COLORS.fg }}
                    >
                      {a.text}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.fg3 }}>
                      {a.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Upcoming (dynamic — confirmed/requested appointments) ── */}
        <div
          className="rounded-2xl p-5 border"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: COLORS.fg }}>
            Upcoming
          </h3>

          {upcomingAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ background: COLORS.muted }}
              >
                <CalendarClock size={16} style={{ color: COLORS.fg3 }} />
              </div>
              <p className="text-xs font-medium" style={{ color: COLORS.fg3 }}>
                No upcoming sessions
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: COLORS.fg3 }}>
                Book a session with a psychiatrist
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppts.map((appt) => {
                const doc = appt.psychiatristId as
                  | { _id: string; name: string }
                  | string
                  | null;
                const docName =
                  typeof doc === "object" && doc !== null ? doc.name : "Psychiatrist";
                return (
                  <div
                    key={appt._id}
                    className="rounded-xl p-3 border"
                    style={{
                      background: COLORS.muted,
                      borderColor: COLORS.border,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope size={12} style={{ color: COLORS.primary }} />
                      <span
                        className="text-xs font-bold"
                        style={{ color: COLORS.fg }}
                      >
                        Psychiatrist Session
                      </span>
                      {appt.status === "requested" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ml-auto">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.fg2 }}>
                      {docName}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.fg2 }}>
                      {formatAppointmentDate(appt.date, appt.startTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate("/dashboard/psychiatrist")}
            className="text-xs font-medium hover:underline flex items-center gap-1 mt-3"
            style={{ color: COLORS.fg }}
          >
            Book another session <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
