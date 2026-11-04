import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, SCORE_GRADIENT_STOPS } from "../../lib/institutionTheme";
import { useInstitutionAuth } from "../../contexts/InstitutionAuthContext";
import { TOTAL_SCORE_MAX, getScoreColor, getScoreLabel } from "../../lib/moodScale";
import { findTree } from "../../lib/checkinTree";
import { fetchAnalytics, type OverviewPeriod } from "../../api/institution";
import { InstitutionCohortFilters } from "@/types";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Overview shows today's numbers for the whole campus (no cohort filters)
const ALL_STUDENTS: InstitutionCohortFilters = {
  batch: "",
  gender: "",
  ageRange: "",
};

interface AnalyticsData {
  totalStudents: number;
  // Students with at least one check-in in the period (each counted once)
  studentsCheckedIn: number;
  // Total check-ins in the period (one student can have several)
  checkinCount: number;
  averages: {
    // null when no check-in in the period answered that question
    mood: number | null;
    energy: number | null;
    stress: number | null;
    motivation: number | null;
    totalScore: number | null;
  };
  // Top 5 issue categories in the period; "others" = students' own words
  topCategories: {
    category: string;
    count: number;
    rootCauses: {
      rootCause: string | null; // null = skipped; free text if "Others"
      count: number;
      issues: { issue: string | null; count: number }[];
    }[];
  }[];
}

// One row of the drill-down: a root cause, or a specific issue under it
interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  issues: BreakdownRow[]; // empty for specific issues
}

// All scores: lower is better (ratings 0–4, total 0–16)
const getColor = (value: number, max: number) => {
  if (max === TOTAL_SCORE_MAX) {
    if (value >= 12) return COLORS.bad;
    if (value >= 8) return COLORS.warn;
    return COLORS.good;
  }
  if (value >= 3) return COLORS.bad;
  if (value >= 2) return COLORS.warn;
  return COLORS.good;
};

const getMoodEmoji = (score: number) => {
  if (score >= 4) return "😢";
  if (score >= 3) return "😟";
  if (score >= 2) return "😐";
  if (score >= 1) return "😊";
  return "😄";
};

// Categorical slots 1–5 (light), assigned in rank order; the free-text
// "others" group is neutral gray. Slices are separated by a surface-colored gap.
const REASON_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const OTHERS_COLOR = "#94A3B8";

function reasonColor(category: string, index: number) {
  return category === "others" ? OTHERS_COLOR : REASON_COLORS[index];
}

function categoryDisplay(category: string) {
  if (category === "others") {
    return { emoji: "✏️", label: "Others (in their own words)" };
  }
  const tree = findTree(category);
  return { emoji: tree?.emoji ?? "•", label: tree?.label ?? category };
}

const NONE_KEY = "__none";
const OTHERS_KEY = "__others";

// Counts per answer; free-text "Others" answers collapse into one row and
// skipped answers into "Not specified".
function groupAnswers<T>(
  items: T[],
  getAnswer: (item: T) => string | null,
  getCount: (item: T) => number,
  known: Set<string>,
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();
  for (const item of items) {
    const answer = getAnswer(item);
    const key =
      answer === null ? NONE_KEY : known.has(answer) ? answer : OTHERS_KEY;
    const label =
      key === NONE_KEY
        ? "Not specified"
        : key === OTHERS_KEY
          ? "Others (in their own words)"
          : answer!;
    const row = rows.get(key) ?? { key, label, count: 0, issues: [] };
    row.count += getCount(item);
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) =>
      Number(a.key === NONE_KEY) - Number(b.key === NONE_KEY) ||
      b.count - a.count,
  );
}

function buildBreakdown(
  category: string,
  rootCauses: AnalyticsData["topCategories"][number]["rootCauses"],
): BreakdownRow[] {
  const tree = findTree(category);
  const knownRoots = new Set(tree?.rootCauses.map((r) => r.label));

  const rows = groupAnswers(
    rootCauses,
    (r) => r.rootCause,
    (r) => r.count,
    knownRoots,
  );

  for (const row of rows) {
    const stored = rootCauses.find((r) => r.rootCause === row.key);
    if (!stored) continue;
    const knownIssues = new Set(
      tree?.rootCauses.find((r) => r.label === row.key)?.issues,
    );
    const issues = groupAnswers(
      stored.issues,
      (i) => i.issue,
      (i) => i.count,
      knownIssues,
    );
    // Nothing to drill into if nobody picked a specific issue
    row.issues = issues.every((i) => i.key === NONE_KEY) ? [] : issues;
  }
  return rows;
}

function HeadlineStat({
  label,
  value,
  chip,
}: {
  label: string;
  value: number | string;
  chip: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold" style={{ color: COLORS.fg3 }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="font-display text-3xl leading-none tabular-nums"
          style={{ color: COLORS.fg }}
        >
          {value}
        </span>
        <span className="inst-chip" style={{ color: COLORS.fg }}>
          {chip}
        </span>
      </div>
    </div>
  );
}

// Open-bottom gauge (270°) filled with a green → orange → red gradient
const GAUGE = { cx: 120, cy: 120, r: 92 };
const gaugePoint = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [GAUGE.cx + GAUGE.r * Math.cos(rad), GAUGE.cy + GAUGE.r * Math.sin(rad)];
};
const [GAUGE_X1, GAUGE_Y1] = gaugePoint(135);
const [GAUGE_X2, GAUGE_Y2] = gaugePoint(45);
const GAUGE_PATH = `M ${GAUGE_X1} ${GAUGE_Y1} A ${GAUGE.r} ${GAUGE.r} 0 1 1 ${GAUGE_X2} ${GAUGE_Y2}`;

function WellbeingGauge({ score, max }: { score: number | null; max: number }) {
  const fraction = score === null ? 0 : Math.min(Math.max(score / max, 0), 1);

  return (
    <div className="relative w-[240px] h-[205px] shrink-0">
      <svg viewBox="0 0 240 205" className="w-full h-full" role="img" aria-label={`Total score ${score ?? "unknown"} out of ${max}`}>
        <defs>
          <linearGradient
            id="gaugeGradient"
            gradientUnits="userSpaceOnUse"
            x1="40"
            y1="0"
            x2="200"
            y2="0"
          >
            {SCORE_GRADIENT_STOPS.map((color, i) => (
              <stop
                key={color}
                offset={`${(i / (SCORE_GRADIENT_STOPS.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        </defs>
        <path
          d={GAUGE_PATH}
          fill="none"
          stroke={COLORS.muted}
          strokeWidth={16}
          strokeLinecap="round"
        />
        {fraction > 0 && (
          <path
            d={GAUGE_PATH}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${fraction * 100} 100`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 top-[78px] flex flex-col items-center text-center pointer-events-none">
        <span
          className="font-display text-6xl leading-none tabular-nums"
          style={{ color: COLORS.fg }}
        >
          {score ?? "—"}
        </span>
        <span className="mt-1 text-xs font-bold" style={{ color: COLORS.fg3 }}>
          Total score / {max}
        </span>
        {score !== null && (
          <span
            className="mt-2 inst-chip"
            style={{ color: getScoreColor(score) }}
          >
            {getScoreLabel(score)}
          </span>
        )}
      </div>
    </div>
  );
}

const PERIODS: {
  key: OverviewPeriod;
  label: string; // segmented control
  chip: string; // small chip on cards
  over: string; // "wellbeing ___"
}[] = [
  { key: "today", label: "Today", chip: "today", over: "today" },
  { key: "week", label: "7 days", chip: "7 days", over: "over the past 7 days" },
  { key: "month", label: "1 month", chip: "1 month", over: "over the past month" },
  { key: "quarter", label: "3 months", chip: "3 months", over: "over the past 3 months" },
];

export default function InstitutionOverviewView() {
  const { institution } = useInstitutionAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<OverviewPeriod>("today");
  // Drill-down: open reason (3A) and, inside it, open root cause (3B)
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openRoot, setOpenRoot] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setOpenRoot(null);
    setOpenCategory((current) => (current === category ? null : category));
  };
  const toggleRoot = (key: string) =>
    setOpenRoot((current) => (current === key ? null : key));

  const changePeriod = (next: OverviewPeriod) => {
    setOpenCategory(null);
    setOpenRoot(null);
    setPeriod(next);
  };

  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);
    fetchAnalytics(ALL_STUDENTS, period)
      .then((res) => {
        if (!cancelled && res.success) setAnalytics(res.data);
      })
      .catch(console.error)
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });
    // Ignore a slow response if the period changed again meanwhile
    return () => {
      cancelled = true;
    };
  }, [period]);

  const current = PERIODS.find((item) => item.key === period) ?? PERIODS[0];
  // Today there is one check-in per student, so "students"; longer periods count check-ins
  const unit = period === "today" ? "student" : "check-in";

  const metrics = analytics
    ? [
        { label: "Mood", value: analytics.averages.mood, max: 4 },
        { label: "Energy", value: analytics.averages.energy, max: 4 },
        { label: "Stress", value: analytics.averages.stress, max: 4 },
        { label: "Motivation", value: analytics.averages.motivation, max: 4 },
        {
          label: "Total Score",
          value: analytics.averages.totalScore,
          max: TOTAL_SCORE_MAX,
        },
      ]
    : [];

  const reasons = (analytics?.topCategories ?? []).map(
    ({ category, count, rootCauses }, index) => ({
      category,
      count,
      breakdown: buildBreakdown(category, rootCauses),
      ...categoryDisplay(category),
      color: reasonColor(category, index),
      percent: Math.round(
        (count / Math.max(analytics?.checkinCount ?? 1, 1)) * 100,
      ),
    }),
  );
  const participation = analytics?.totalStudents
    ? Math.round((analytics.studentsCheckedIn / analytics.totalStudents) * 100)
    : 0;
  const reasonTotal = reasons.reduce((sum, reason) => sum + reason.count, 0);

  if (loading) {
    return (
      <div
        className="text-center py-16 text-sm animate-pulse-gentle"
        style={{ color: COLORS.fg3 }}
      >
        Loading campus data...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pt-2">
      {/* Welcome header + headline numbers */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1
            className="text-5xl leading-tight"
            style={{ color: COLORS.fg }}
          >
            Welcome back!
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: COLORS.fg2 }}>
            {institution?.collegeName ?? "Your campus"} · wellbeing {current.over}
          </p>

          {/* Period switch */}
          <div
            role="group"
            aria-label="Time period"
            className="mt-4 inline-flex rounded-full border bg-white p-1 shadow-sm"
            style={{ borderColor: COLORS.border }}
          >
            {PERIODS.map((item) => {
              const active = item.key === period;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changePeriod(item.key)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                  style={{
                    background: active ? COLORS.primary : "transparent",
                    color: active ? "#fff" : COLORS.fg2,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-7 sm:gap-10">
          <HeadlineStat
            label="Students"
            value={analytics?.totalStudents ?? 0}
            chip="enrolled"
          />
          <HeadlineStat
            label="Checked in"
            value={analytics?.studentsCheckedIn ?? 0}
            chip={`${participation}%`}
          />
          <HeadlineStat
            label="Avg score"
            value={analytics?.averages.totalScore ?? "—"}
            chip={`/${TOTAL_SCORE_MAX}`}
          />
        </div>
      </div>

      <div
        className={`space-y-6 transition-opacity duration-200 ${refreshing ? "opacity-50" : ""}`}
      >
      {analytics && analytics.studentsCheckedIn > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Gauge card */}
          <div className="inst-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl" style={{ color: COLORS.fg }}>
                {period === "today" ? "Today's wellbeing" : "Average wellbeing"}
              </h3>
              <span className="inst-chip" style={{ color: COLORS.fg2 }}>
                lower is better
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <WellbeingGauge
                score={analytics.averages.totalScore}
                max={TOTAL_SCORE_MAX}
              />

              <ul className="flex-1 w-full space-y-4">
                {metrics
                  .filter((m) => m.label !== "Total Score")
                  .map((m) => (
                    <li key={m.label} className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background:
                            m.value === null ? COLORS.fg4 : getColor(m.value, m.max),
                        }}
                      />
                      <span
                        className="text-sm font-extrabold"
                        style={{ color: COLORS.fg }}
                      >
                        {m.label}
                      </span>
                      <span
                        className="flex-1 border-b border-dotted translate-y-1"
                        style={{ borderColor: COLORS.fg3 }}
                      />
                      <span
                        className="text-sm font-extrabold tabular-nums"
                        style={{
                          color:
                            m.value === null ? COLORS.fg3 : getColor(m.value, m.max),
                        }}
                      >
                        {m.label === "Mood" && m.value !== null && (
                          <span className="mr-1.5">
                            {getMoodEmoji(Math.round(m.value))}
                          </span>
                        )}
                        {m.value ?? "—"}
                        <span
                          className="ml-0.5 text-xs font-semibold"
                          style={{ color: COLORS.fg3 }}
                        >
                          /{m.max}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Participation card */}
          <div className="inst-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl" style={{ color: COLORS.fg }}>
                Check-in participation
              </h3>
              <span className="inst-chip" style={{ color: COLORS.fg2 }}>
                {current.chip}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-end gap-3">
                <span
                  className="font-display text-7xl leading-none"
                  style={{ color: COLORS.fg }}
                >
                  {participation}
                  <span className="text-3xl">%</span>
                </span>
                <span
                  className="pb-1.5 text-sm font-semibold"
                  style={{ color: COLORS.fg2 }}
                >
                  {period === "today"
                    ? "of students checked in"
                    : "checked in at least once"}
                </span>
              </div>

              <div
                className="mt-6 h-4 rounded-full overflow-hidden"
                style={{ background: COLORS.muted }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${participation}%`,
                    background: COLORS.gradient,
                  }}
                />
              </div>

              <div className="mt-4 flex justify-between text-xs font-semibold">
                <span style={{ color: COLORS.fg }}>
                  {analytics.studentsCheckedIn} checked in
                </span>
                <span style={{ color: COLORS.fg3 }}>
                  {Math.max(analytics.totalStudents - analytics.studentsCheckedIn, 0)}{" "}
                  yet to check in
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="inst-card p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-extrabold mb-1" style={{ color: COLORS.fg }}>
            {period === "today"
              ? "No check-ins recorded today"
              : "No check-ins in this period"}
          </p>
          <p className="text-xs" style={{ color: COLORS.fg3 }}>
            Student wellness data will appear here once they start checking in.
          </p>
        </div>
      )}

      {/* Most common issue categories in the period */}
      {analytics && analytics.studentsCheckedIn > 0 && (
        <div className="inst-card p-6">
          <h3 className="text-xl" style={{ color: COLORS.fg }}>
            Most common reasons
          </h3>
          <p className="text-xs mb-4" style={{ color: COLORS.fg3 }}>
            What is weighing on students' minds {current.over}, out of{" "}
            {analytics.checkinCount} check-ins
          </p>

          {reasons.length === 0 ? (
            <p className="text-xs" style={{ color: COLORS.fg3 }}>
              No issues reported {current.over}.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
              <div className="relative h-[220px] w-full max-w-[220px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasons}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={62}
                      outerRadius={100}
                      stroke={COLORS.card}
                      strokeWidth={2}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={false}
                      onClick={(_, index) => {
                        const reason = reasons[index];
                        if (reason?.breakdown.length)
                          toggleCategory(reason.category);
                      }}
                    >
                      {reasons.map((reason) => (
                        <Cell
                          key={reason.category}
                          fill={reason.color}
                          style={{
                            cursor: reason.breakdown.length
                              ? "pointer"
                              : "default",
                            outline: "none",
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        const reason = active ? payload?.[0]?.payload : null;
                        if (!reason) return null;
                        return (
                          <div
                            className="rounded-lg border px-3 py-2 text-xs shadow-md"
                            style={{
                              background: COLORS.card,
                              borderColor: COLORS.border,
                              color: COLORS.fg,
                            }}
                          >
                            <div className="font-bold">
                              {reason.emoji} {reason.label}
                            </div>
                            <div style={{ color: COLORS.fg2 }}>
                              {reason.count} {unit}
                              {reason.count !== 1 ? "s" : ""} · {reason.percent}%
                              of check-ins
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color: COLORS.fg }}
                  >
                    {reasonTotal}
                  </span>
                  <span className="text-[10px]" style={{ color: COLORS.fg3 }}>
                    {unit}{reasonTotal !== 1 ? "s" : ""} · top{" "}
                    {reasons.length}
                  </span>
                </div>
              </div>

              <ol className="space-y-3">
                {reasons.map((reason, index) => {
                  const expandable = reason.breakdown.length > 0;
                  const isOpen = expandable && openCategory === reason.category;
                  const Chevron = isOpen ? ChevronDown : ChevronRight;

                  const summary = (
                    <>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span
                          className="w-3 h-3 rounded-[3px] shrink-0"
                          style={{ background: reason.color }}
                        />
                        <span
                          className="w-4 text-xs font-bold"
                          style={{ color: COLORS.fg3 }}
                        >
                          {index + 1}.
                        </span>
                        <span>{reason.emoji}</span>
                        <span
                          className="flex-1 font-semibold"
                          style={{ color: COLORS.fg }}
                        >
                          {reason.label}
                        </span>
                        <span className="text-xs" style={{ color: COLORS.fg2 }}>
                          {reason.count} {unit}{reason.count !== 1 ? "s" : ""}{" "}
                          · {reason.percent}%
                        </span>
                        {expandable && (
                          <Chevron
                            size={14}
                            style={{ color: COLORS.fg3 }}
                            className="shrink-0"
                          />
                        )}
                      </div>
                      <div
                        className="ml-[1.9rem] h-2 rounded-full overflow-hidden"
                        style={{ background: COLORS.muted }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${reason.percent}%`,
                            background: reason.color,
                          }}
                        />
                      </div>
                    </>
                  );

                  return (
                    <li key={reason.category}>
                      {expandable ? (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => toggleCategory(reason.category)}
                          className="block w-full text-left rounded-lg hover:bg-teal-50/60 transition-colors"
                        >
                          {summary}
                        </button>
                      ) : (
                        summary
                      )}

                      {isOpen && (
                        <div
                          className="ml-[1.9rem] mt-3 pl-3 border-l-2 animate-fade-in"
                          style={{ borderColor: reason.color }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                            style={{ color: COLORS.fg3 }}
                          >
                            What part is troubling them · % of {reason.label}
                          </p>
                          <ul className="space-y-2.5">
                            {reason.breakdown.map((root) => {
                              const canOpen = root.issues.length > 0;
                              const rootOpen = canOpen && openRoot === root.key;
                              const RootChevron = rootOpen
                                ? ChevronDown
                                : ChevronRight;
                              const rootPercent = Math.round(
                                (root.count / reason.count) * 100,
                              );

                              const rootSummary = (
                                <>
                                  <div className="flex items-center gap-2 text-xs mb-1">
                                    <span
                                      className="flex-1 font-semibold"
                                      style={{ color: COLORS.fg }}
                                    >
                                      {root.label}
                                    </span>
                                    <span style={{ color: COLORS.fg2 }}>
                                      {root.count} · {rootPercent}%
                                    </span>
                                    {canOpen && (
                                      <RootChevron
                                        size={12}
                                        style={{ color: COLORS.fg3 }}
                                        className="shrink-0"
                                      />
                                    )}
                                  </div>
                                  <div
                                    className="h-1.5 rounded-full overflow-hidden"
                                    style={{ background: COLORS.muted }}
                                  >
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${rootPercent}%`,
                                        background: reason.color,
                                        opacity: 0.75,
                                      }}
                                    />
                                  </div>
                                </>
                              );

                              return (
                                <li key={root.key}>
                                  {canOpen ? (
                                    <button
                                      type="button"
                                      aria-expanded={rootOpen}
                                      onClick={() => toggleRoot(root.key)}
                                      className="block w-full text-left rounded-md hover:bg-teal-50/60 transition-colors"
                                    >
                                      {rootSummary}
                                    </button>
                                  ) : (
                                    rootSummary
                                  )}

                                  {rootOpen && (
                                    <div
                                      className="mt-2.5 ml-3 pl-3 border-l-2 animate-fade-in"
                                      style={{ borderColor: reason.color }}
                                    >
                                      <p
                                        className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                                        style={{ color: COLORS.fg3 }}
                                      >
                                        Where they are stuck · % of this group
                                      </p>
                                      <ul className="space-y-2">
                                        {root.issues.map((issue) => {
                                          const issuePercent = Math.round(
                                            (issue.count / root.count) * 100,
                                          );
                                          return (
                                            <li key={issue.key}>
                                              <div className="flex items-center gap-2 text-[11px] mb-1">
                                                <span
                                                  className="flex-1"
                                                  style={{ color: COLORS.fg }}
                                                >
                                                  {issue.label}
                                                </span>
                                                <span
                                                  style={{ color: COLORS.fg2 }}
                                                >
                                                  {issue.count} · {issuePercent}%
                                                </span>
                                              </div>
                                              <div
                                                className="h-1 rounded-full overflow-hidden"
                                                style={{
                                                  background: COLORS.muted,
                                                }}
                                              >
                                                <div
                                                  className="h-full rounded-full"
                                                  style={{
                                                    width: `${issuePercent}%`,
                                                    background: reason.color,
                                                    opacity: 0.55,
                                                  }}
                                                />
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
