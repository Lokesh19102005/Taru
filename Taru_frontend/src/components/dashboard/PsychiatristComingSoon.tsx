import { Stethoscope, CheckCircle, Bell } from "lucide-react";
import COLORS from "../../lib/studentTheme";

export default function PsychiatristComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-4 animate-fade-in">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #1F1A17, #3A2F28)" }}
          >
            <Stethoscope size={38} className="text-white" />
          </div>
        </div>

        {/* Labels */}
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: COLORS.fg3 }}>
          Psychiatrist sessions
        </p>
        <h1
          className="text-4xl font-extrabold mb-8 leading-tight"
          style={{ background: "linear-gradient(135deg, #1F1A17, #3A2F28)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Coming Soon
        </h1>

        {/* What to expect */}
        <div
          className="rounded-2xl border p-5 text-left space-y-3 mb-4"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: COLORS.fg3 }}>
            What to expect
          </p>
          {[
            "Private, one-on-one video sessions",
            "Certified & independent professionals",
            "Flexible scheduling around your timetable",
            "Completely confidential — not shared with your college",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
              <span className="text-sm" style={{ color: COLORS.fg2 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Notify strip */}
        <div
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{ background: COLORS.muted, borderColor: COLORS.border }}
        >
          <Bell size={16} className="shrink-0" style={{ color: COLORS.primary }} />
          <p className="text-xs text-left" style={{ color: COLORS.fg2 }}>
            We'll notify you as soon as sessions go live for your college.
          </p>
        </div>

      </div>
    </div>
  );
}
