import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Minus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchMoodOverview,
  fetchStudentMoodTrend,
} from "../../api/institution";
import { moodColor, moodForScore } from "../../lib/moodScale";
import { COLORS } from "../../lib/theme";
import type {
  InstitutionMoodOverviewRow,
  MoodTrendBucket,
  MoodTrendRange,
  MoodOverviewRange,
  MoodOverviewStatus,
  MoodOverviewSort,
} from "../../types";

const ranges: { value: MoodTrendRange; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "semester", label: "Semester" },
  { value: "year", label: "Yearly" },
];

export default function InstitutionMoodAnalyticsView() {
  const [students, setStudents] = useState<InstitutionMoodOverviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [overviewRange, setOverviewRange] = useState<MoodOverviewRange>("week");
  const [status, setStatus] = useState<MoodOverviewStatus>("all");
  const [sort, setSort] = useState<MoodOverviewSort>("label");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [selected, setSelected] = useState<InstitutionMoodOverviewRow | null>(
    null,
  );
  const [range, setRange] = useState<MoodTrendRange>("week");
  const [trend, setTrend] = useState<MoodTrendBucket[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [trendError, setTrendError] = useState("");

  const scoreRangeInvalid =
    minScore !== "" && maxScore !== "" && Number(minScore) > Number(maxScore);

  useEffect(() => {
    if (scoreRangeInvalid) {
      setOverviewError("Minimum score must not exceed maximum score.");
      setOverviewLoading(false);
      return;
    }

    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError("");

    fetchMoodOverview({
      range: overviewRange,
      status,
      sort,
      search,
      page,
      limit: pageSize,
      minScore: minScore === "" ? undefined : Number(minScore),
      maxScore: maxScore === "" ? undefined : Number(maxScore),
    })
      .then((response) => {
        if (cancelled) return;
        setStudents(response.data.students);
        setTotal(response.data.total);
      })
      .catch(() => {
        if (!cancelled)
          setOverviewError("Could not load student mood overview.");
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    overviewRange,
    status,
    sort,
    search,
    page,
    minScore,
    maxScore,
    scoreRangeInvalid,
  ]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setTrendLoading(true);
    setTrendError("");
    fetchStudentMoodTrend(selected.studentId, range)
      .then((response) => {
        if (!cancelled) setTrend(response.data);
      })
      .catch(() => {
        if (!cancelled) setTrendError("Could not load this mood trend.");
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, range]);

  const changeFilter = (action: () => void) => {
    action();
    setPage(1);
  };

  if (overviewLoading && !selected && students.length === 0) {
    return <p style={{ color: COLORS.fg3 }}>Loading mood overview...</p>;
  }

  if (selected) {
    const realPoints = trend.filter((point) => point.averageMood !== null);
    return (
      <section className="space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: COLORS.fg2 }}
        >
          <ArrowLeft size={16} /> All students
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ color: COLORS.fg }}>
            {selected.studentLabel}
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg3 }}>
            Mood score from 0 (Very Happy) to 4 (Sad)
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Mood time range"
        >
          {ranges.map((item) => (
            <button
              key={item.value}
              role="tab"
              aria-selected={range === item.value}
              onClick={() => setRange(item.value)}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{
                background: range === item.value ? COLORS.primary : COLORS.card,
                borderColor: COLORS.border,
                color: range === item.value ? "#fff" : COLORS.fg2,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {trendError ? (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {trendError}
          </p>
        ) : trendLoading ? (
          <p style={{ color: COLORS.fg3 }}>Loading trend...</p>
        ) : realPoints.length === 0 ? (
          <p className="py-12 text-center" style={{ color: COLORS.fg3 }}>
            No check-ins recorded in this period.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value !== "number")
                      return ["No check-in", "Mood"];
                    const mood = moodForScore(Math.round(value));
                    return [
                      `${mood.emoji} ${value.toFixed(1)} · ${mood.label}`,
                      "Mood",
                    ];
                  }}
                />
                <Line
                  type="linear"
                  dataKey="averageMood"
                  name="Average mood"
                  stroke={COLORS.primary}
                  connectNulls={false}
                  dot={(props) => {
                    const value = props.payload?.averageMood;
                    if (typeof value !== "number") return <g key={props.key} />;
                    return (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill={moodColor(value)}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    );
  }

  if (overviewError)
    return (
      <p role="alert" style={{ color: "#b91c1c" }}>
        {overviewError}
      </p>
    );

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold" style={{ color: COLORS.fg }}>
          Student mood analytics
        </h2>
        <p className="text-sm" style={{ color: COLORS.fg3 }}>
          Student labels are anonymous account IDs. Higher scores indicate a
          more difficult mood. Scores shown here are averages for the selected
          period.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold" style={{ color: COLORS.fg2 }}>
          Period
          <select
            value={overviewRange}
            onChange={(event) =>
              changeFilter(() =>
                setOverviewRange(event.target.value as MoodOverviewRange),
              )
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="semester">Last 26 weeks</option>
            <option value="year">Last 12 months</option>
          </select>
        </label>

        <label className="text-xs font-semibold" style={{ color: COLORS.fg2 }}>
          Check-in status
          <select
            value={status}
            onChange={(event) =>
              changeFilter(() =>
                setStatus(event.target.value as MoodOverviewStatus),
              )
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          >
            <option value="all">All students</option>
            <option value="checked-in">Has check-ins</option>
            <option value="not-checked-in">No check-ins</option>
          </select>
        </label>

        <label className="text-xs font-semibold" style={{ color: COLORS.fg2 }}>
          Sort by
          <select
            value={sort}
            onChange={(event) =>
              changeFilter(() =>
                setSort(event.target.value as MoodOverviewSort),
              )
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          >
            <option value="label">Student ID</option>
            <option value="score_low">Lower mood score first</option>
            <option value="score_high">Higher mood score first</option>
            <option value="checkins">Most check-ins</option>
          </select>
        </label>

        <label
          className="text-xs font-semibold sm:col-span-2"
          style={{ color: COLORS.fg2 }}
        >
          Search student ID
          <input
            type="search"
            value={search}
            onChange={(event) =>
              changeFilter(() => setSearch(event.target.value))
            }
            placeholder="Search taru_ ID"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          />
        </label>

        <label className="text-xs font-semibold" style={{ color: COLORS.fg2 }}>
          Minimum average score
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={minScore}
            onChange={(event) =>
              changeFilter(() => setMinScore(event.target.value))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          />
        </label>

        <label className="text-xs font-semibold" style={{ color: COLORS.fg2 }}>
          Maximum average score
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={maxScore}
            onChange={(event) =>
              changeFilter(() => setMaxScore(event.target.value))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          />
        </label>
      </div>

      <div
        className="flex items-center justify-between gap-3 text-sm"
        style={{ color: COLORS.fg3 }}
      >
        <span>
          {overviewLoading ? "Updating students..." : `${total} students`}
        </span>
        <button
          type="button"
          onClick={() =>
            changeFilter(() => {
              setSearch("");
              setStatus("all");
              setSort("label");
              setMinScore("");
              setMaxScore("");
              setOverviewRange("week");
            })
          }
          className="font-semibold hover:underline"
          style={{ color: COLORS.primary }}
        >
          Clear filters
        </button>
      </div>

      <div
        className="divide-y rounded-xl border"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        {students.map((student) => {
          const score = student.averageMood;
          const mood = score === null ? null : moodForScore(Math.round(score));
          const delta =
            score === null || student.previousAverageMood === null
              ? null
              : score - student.previousAverageMood;

          return (
            <button
              key={student.studentId}
              onClick={() => setSelected(student)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-teal-50"
            >
              <span>
                <span
                  className="block font-semibold"
                  style={{ color: COLORS.fg }}
                >
                  {student.studentLabel}
                </span>
                {score === null || !student.hasRecentCheckins ? (
                  <span
                    className="text-sm font-medium"
                    style={{ color: COLORS.fg3 }}
                  >
                    No check-ins in this period
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: moodColor(score) }}>
                    {mood?.emoji} Average {score.toFixed(1)} / 4 ·{" "}
                    {student.entryCount} check-ins
                  </span>
                )}
              </span>

              {delta === null ? (
                <Minus size={18} aria-label="No comparison available" />
              ) : delta > 0.1 ? (
                <ArrowUp
                  size={18}
                  color="#DC2626"
                  aria-label="Mood score increased"
                />
              ) : delta < -0.1 ? (
                <ArrowDown
                  size={18}
                  color="#059669"
                  aria-label="Mood score decreased"
                />
              ) : (
                <Minus
                  size={18}
                  color={COLORS.fg3}
                  aria-label="Mood score is similar"
                />
              )}
            </button>
          );
        })}
        {students.length === 0 && (
          <p className="p-6 text-center" style={{ color: COLORS.fg3 }}>
            {overviewLoading
              ? "Loading students..."
              : "No students match these filters."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page <= 1 || overviewLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"
          style={{
            background: COLORS.card,
            borderColor: COLORS.border,
            color: COLORS.fg2,
          }}
        >
          Previous
        </button>
        <span className="text-sm" style={{ color: COLORS.fg3 }}>
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button
          type="button"
          disabled={page >= Math.ceil(total / pageSize) || overviewLoading}
          onClick={() => setPage((current) => current + 1)}
          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"
          style={{
            background: COLORS.card,
            borderColor: COLORS.border,
            color: COLORS.fg2,
          }}
        >
          Next
        </button>
      </div>
    </section>
  );
}
