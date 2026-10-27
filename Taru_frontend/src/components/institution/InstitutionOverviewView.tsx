import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { COLORS } from "../../lib/theme";
import { TOTAL_SCORE_MAX } from "../../lib/moodScale";
import {
  fetchAnalytics,
  fetchInstitutionWellnessFilterOptions,
  fetchInstitutionWellnessTrend,
} from "../../api/institution";
import {
  AgeRange,
  InstitutionCohortFilters,
  InstitutionWellnessFilterOptions,
  InstitutionWellnessTrend,
  MoodOverviewRange,
} from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsData {
  totalStudents: number;
  studentsCheckedIn: number;
  averages: {
    // null when no student answered that question today
    mood: number | null;
    energy: number | null;
    stress: number | null;
    motivation: number | null;
    totalScore: number | null;
  };
}

// All scores: lower is better (ratings 0–4, total 0–16)
const getColor = (value: number, max: number) => {
  if (max === TOTAL_SCORE_MAX) {
    if (value >= 12) return "#DC2626";
    if (value >= 8) return "#D97706";
    return "#059669";
  }
  if (value >= 3) return "#DC2626";
  if (value >= 2) return "#D97706";
  return "#059669";
};

const getMoodEmoji = (score: number) => {
  if (score >= 4) return "😢";
  if (score >= 3) return "😟";
  if (score >= 2) return "😐";
  if (score >= 1) return "😊";
  return "😄";
};

const getMoodLabel = (score: number) => {
  if (score >= 4) return "Very Sad";
  if (score >= 3) return "Sad";
  if (score >= 2) return "Neutral";
  if (score >= 1) return "Happy";
  return "Very Happy";
};

const trendMetrics = [
  { key: "averageMood", label: "Mood" },
  { key: "averageStress", label: "Stress" },
  { key: "averageEnergy", label: "Energy" },
  { key: "averageMotivation", label: "Motivation" },
] as const;

type TrendMetric = (typeof trendMetrics)[number]["key"];

export default function InstitutionOverviewView() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<MoodOverviewRange>("week");
  const [filters, setFilters] = useState<InstitutionCohortFilters>({
    batch: "",
    gender: "",
    ageRange: "",
  });

  const [filterOptions, setFilterOptions] =
    useState<InstitutionWellnessFilterOptions>({
      batches: [],
      genders: [],
    });

  const updateFilter = <K extends keyof InstitutionCohortFilters>(
    key: K,
    value: InstitutionCohortFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const [trend, setTrend] = useState<InstitutionWellnessTrend | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<TrendMetric>("averageMood");

  const selectedMetricLabel =
    trendMetrics.find((metric) => metric.key === selectedMetric)?.label ??
    "Mood";

  const trendSeries = trend?.series ?? [];
  const latestBucket = trendSeries[trendSeries.length - 1];

  useEffect(() => {
    fetchInstitutionWellnessFilterOptions()
      .then((response) => setFilterOptions(response.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchInstitutionWellnessTrend(range, filters)
      .then((response) => setTrend(response.data))
      .catch(console.error);
  }, [range, filters]);

  useEffect(() => {
    fetchAnalytics(filters)
      .then((res) => {
        if (res.success) setAnalytics(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} style={{ color: COLORS.fg }} />
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            Campus Mental Health Overview
          </h2>
        </div>
        <p className="text-xs" style={{ color: COLORS.fg3 }}>
          {analytics?.totalStudents || 0} students ·{" "}
          {analytics?.studentsCheckedIn || 0} checked in today
        </p>
      </div>

      {/* Metric cards */}
      {analytics && analytics.studentsCheckedIn > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl p-4 border card-hover transition-all"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <div
                className="text-xs font-bold mb-2"
                style={{ color: COLORS.fg2 }}
              >
                {m.label}
              </div>
              <div className="flex items-center gap-2">
                {m.label === "Mood" && m.value !== null && (
                  <span className="text-2xl">
                    {getMoodEmoji(Math.round(m.value))}
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-2xl font-extrabold"
                    style={{
                      color:
                        m.value === null
                          ? COLORS.fg3
                          : getColor(m.value, m.max),
                    }}
                  >
                    {m.value ?? "—"}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: COLORS.fg4 }}
                  >
                    /{m.max}
                  </span>
                </div>
              </div>
              {m.label === "Mood" && m.value !== null && (
                <div
                  className="text-[10px] mt-1 font-semibold"
                  style={{ color: COLORS.fg3 }}
                >
                  {getMoodLabel(Math.round(m.value))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 border text-center card-hover transition-all"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
        >
          <div className="text-3xl mb-2">📊</div>
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: COLORS.fg }}
          >
            No check-ins recorded today
          </p>
          <p className="text-xs" style={{ color: COLORS.fg3 }}>
            Student wellness data will appear here once they start checking in.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-5 border card-hover transition-all shadow-sm"
          style={{ background: COLORS.gradient, borderColor: COLORS.border }}
        >
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-extrabold text-white">
            {analytics?.totalStudents || 0}
          </div>
          <div className="text-xs font-medium text-teal-50">Total Students</div>
        </div>
        <div
          className="rounded-2xl p-5 border card-hover transition-all shadow-sm"
          style={{ background: COLORS.gradient, borderColor: COLORS.border }}
        >
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-extrabold text-white">
            {analytics?.studentsCheckedIn || 0}
          </div>
          <div className="text-xs font-medium text-teal-50">
            Checked In Today
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold" style={{ color: COLORS.fg }}>
              Campus trends
            </h3>
            <p className="text-xs" style={{ color: COLORS.fg3 }}>
              Scores range from 0 (better) to 4 (more difficult). Values are
              institution-wide aggregates.
            </p>
          </div>

          <label
            className="text-xs font-semibold"
            style={{ color: COLORS.fg2 }}
          >
            Time period
            <select
              value={range}
              onChange={(event) =>
                setRange(event.target.value as MoodOverviewRange)
              }
              className="mt-1 block rounded-lg border px-3 py-2 text-sm"
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
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["batch", "Batch / Academic Year", filterOptions.batches],
              ["gender", "Gender", filterOptions.genders],
            ] as const
          ).map(([key, label, options]) => (
            <label
              key={key}
              className="text-xs font-semibold"
              style={{ color: COLORS.fg2 }}
            >
              {label}
              <select
                value={filters[key]}
                onChange={(event) => updateFilter(key, event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.fg,
                }}
              >
                <option value="">All {label.toLowerCase()}s</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label
            className="text-xs font-semibold"
            style={{ color: COLORS.fg2 }}
          >
            Age range
            <select
              value={filters.ageRange}
              onChange={(event) =>
                updateFilter("ageRange", event.target.value as AgeRange)
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: COLORS.card,
                borderColor: COLORS.border,
                color: COLORS.fg,
              }}
            >
              <option value="">All ages</option>
              <option value="under18">Under 18</option>
              <option value="18-20">18-20</option>
              <option value="21-23">21-23</option>
              <option value="24plus">24+</option>
            </select>
          </label>
        </div>

        <label
          className="block max-w-xs text-xs font-semibold"
          style={{ color: COLORS.fg2 }}
        >
          Check-in measure
          <select
            value={selectedMetric}
            onChange={(event) =>
              setSelectedMetric(event.target.value as TrendMetric)
            }
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          >
            {trendMetrics.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>

        {latestBucket && (
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <p className="text-xs" style={{ color: COLORS.fg3 }}>
                Checked in this period
              </p>
              <p
                className="mt-1 text-xl font-bold"
                style={{ color: COLORS.fg }}
              >
                {latestBucket.activeStudents}
              </p>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <p className="text-xs" style={{ color: COLORS.fg3 }}>
                Check-ins in latest bucket
              </p>
              <p
                className="mt-1 text-xl font-bold"
                style={{ color: COLORS.fg }}
              >
                {latestBucket.checkinCount}
              </p>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <p className="text-xs" style={{ color: COLORS.fg3 }}>
                Participation in latest bucket
              </p>
              <p
                className="mt-1 text-xl font-bold"
                style={{ color: COLORS.fg }}
              >
                {latestBucket.participationRate}%
              </p>
            </div>
          </div>
        )}

        {!trend ? (
          <p
            className="py-10 text-center text-sm"
            style={{ color: COLORS.fg3 }}
          >
            Loading institution trends...
          </p>
        ) : trendSeries.every((point) => point[selectedMetric] === null) ? (
          <div
            className="rounded-xl border p-8 text-center text-sm"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.fg3,
            }}
          >
            No check-in data for this period.
          </div>
        ) : (
          <>
            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <h4
                className="mb-4 text-sm font-bold"
                style={{ color: COLORS.fg }}
              >
                Average {selectedMetricLabel}
              </h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number"
                          ? [
                              `${value.toFixed(1)} / 4`,
                              `Average ${selectedMetricLabel}`,
                            ]
                          : ["No data", selectedMetricLabel]
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric}
                      name={`Average ${selectedMetricLabel.toLowerCase()}`}
                      stroke={COLORS.primary}
                      connectNulls={false}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <h4
                className="mb-1 text-sm font-bold"
                style={{ color: COLORS.fg }}
              >
                Check-in dimensions for selected period
              </h4>
              <p className="mb-4 text-xs" style={{ color: COLORS.fg3 }}>
                Lower scores indicate better reported experiences.
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        dimension: "Mood",
                        score: trend.periodAverages.averageMood,
                      },
                      {
                        dimension: "Stress",
                        score: trend.periodAverages.averageStress,
                      },
                      {
                        dimension: "Energy",
                        score: trend.periodAverages.averageEnergy,
                      },
                      {
                        dimension: "Motivation",
                        score: trend.periodAverages.averageMotivation,
                      },
                    ].filter((item) => item.score !== null)}
                    layout="vertical"
                    margin={{ left: 12, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                    />
                    <YAxis type="category" dataKey="dimension" width={110} />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number"
                          ? [value.toFixed(1), "Average score"]
                          : ["No data", "Average score"]
                      }
                    />
                    <Bar
                      dataKey="score"
                      name="Average score"
                      fill={COLORS.primary}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <h4
                className="mb-4 text-sm font-bold"
                style={{ color: COLORS.fg }}
              >
                Mood distribution
              </h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number"
                          ? [`${value.toFixed(1)}%`, "Share of check-ins"]
                          : ["No check-ins", "Share of check-ins"]
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="moodVeryHappyPercent"
                      name="Very Happy"
                      stackId="mood"
                      fill="#15803D"
                    />
                    <Bar
                      dataKey="moodHappyPercent"
                      name="Happy"
                      stackId="mood"
                      fill="#65A30D"
                    />
                    <Bar
                      dataKey="moodNeutralPercent"
                      name="Neutral"
                      stackId="mood"
                      fill="#D97706"
                    />
                    <Bar
                      dataKey="moodStressedPercent"
                      name="Stressed"
                      stackId="mood"
                      fill="#F97316"
                    />
                    <Bar
                      dataKey="moodSadPercent"
                      name="Sad"
                      stackId="mood"
                      fill="#DC2626"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <h4
                className="mb-4 text-sm font-bold"
                style={{ color: COLORS.fg }}
              >
                Participation by time bucket
              </h4>
              <p className="mb-4 text-xs" style={{ color: COLORS.fg3 }}>
                Percentage of enrolled students with at least one check-in in
                each displayed bucket. Each student is counted once per bucket.
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number"
                          ? [`${value.toFixed(0)}%`, "Participation"]
                          : ["No data", "Participation"]
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="participationRate"
                      name="Participation"
                      stroke="#059669"
                      connectNulls={false}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <h4
                className="mb-1 text-sm font-bold"
                style={{ color: COLORS.fg }}
              >
                Check-in volume by weekday
              </h4>
              <p className="mb-4 text-xs" style={{ color: COLORS.fg3 }}>
                Number of check-in records across the selected period, grouped
                by weekday.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {trend.weekdayPattern.map((day) => {
                  const maximum = Math.max(
                    1,
                    ...trend.weekdayPattern.map((item) => item.checkinCount),
                  );
                  const intensity = day.checkinCount / maximum;

                  return (
                    <div
                      key={day.weekday}
                      className="rounded-lg border p-3"
                      style={{
                        background: `rgba(13, 148, 136, ${0.08 + intensity * 0.32})`,
                        borderColor: COLORS.border,
                      }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: COLORS.fg2 }}
                      >
                        {day.weekday}
                      </p>
                      <p
                        className="mt-2 text-lg font-bold"
                        style={{ color: COLORS.fg }}
                      >
                        {day.checkinCount}
                      </p>
                      <p className="text-[10px]" style={{ color: COLORS.fg3 }}>
                        check-ins
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
