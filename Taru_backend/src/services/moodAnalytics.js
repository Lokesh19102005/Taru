const DailyCheckIn = require("../models/DailyCheckIn");
const Institution = require("../models/Institution");
const User = require("../models/User");

const RANGE_CONFIG = {
  week: { count: 7, unit: "day" },
  month: { count: 30, unit: "day" },
  semester: { count: 26, unit: "week" },
  year: { count: 12, unit: "month" },
};

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(value) {
  const date = startOfDay(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function bucketStart(value, range) {
  const date = startOfDay(value);
  if (range === "semester") return startOfWeek(date);
  if (range === "year") return new Date(date.getFullYear(), date.getMonth(), 1);
  return date;
}

function shiftBucket(value, range, amount) {
  const date = new Date(value);
  if (range === "semester") date.setDate(date.getDate() + amount * 7);
  else if (range === "year") date.setMonth(date.getMonth() + amount);
  else date.setDate(date.getDate() + amount);
  return date;
}

function makeLabel(date, range) {
  if (range === "semester") {
    return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (range === "year") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function getMoodTrend(studentId, requestedRange = "week") {
  const range = RANGE_CONFIG[requestedRange] ? requestedRange : "week";
  const config = RANGE_CONFIG[range];
  const now = new Date();
  const currentBucket = bucketStart(now, range);
  const windowStart = shiftBucket(currentBucket, range, 1 - config.count);

  // Create every bucket in the selected range, including periods before
  // the student's first check-in.
  const buckets = new Map();

  for (
    let date = new Date(windowStart);
    date <= currentBucket;
    date = shiftBucket(date, range, 1)
  ) {
    buckets.set(date.getTime(), {
      label: makeLabel(date, range),
      sum: 0,
      entryCount: 0,
    });
  }

  const checkins = await DailyCheckIn.find({
    userId: studentId,
    date: { $gte: windowStart, $lte: now },
  })
    .select("date mood.score")
    .lean();

  for (const checkin of checkins) {
    const key = bucketStart(checkin.date, range).getTime();
    const bucket = buckets.get(key);

    if (bucket && Number.isFinite(checkin.mood?.score)) {
      bucket.sum += checkin.mood.score;
      bucket.entryCount += 1;
    }
  }

  return [...buckets.values()].map(({ label, sum, entryCount }) => ({
    label,
    averageMood: entryCount ? Math.round((sum / entryCount) * 10) / 10 : null,
    entryCount,
  }));
}

function getOverviewWindow(range, now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const start = new Date(end);

  if (range === "week") start.setDate(start.getDate() - 7);
  else if (range === "month") start.setDate(start.getDate() - 30);
  else if (range === "semester") start.setDate(start.getDate() - 26 * 7);
  else start.setMonth(start.getMonth() - 12, 1);

  const previousStart = new Date(start);
  if (range === "year") previousStart.setMonth(previousStart.getMonth() - 12);
  else if (range === "semester")
    previousStart.setDate(previousStart.getDate() - 26 * 7);
  else if (range === "month")
    previousStart.setDate(previousStart.getDate() - 30);
  else previousStart.setDate(previousStart.getDate() - 7);

  return { start, previousStart, end };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStudentMatch(collegeName, filters = {}) {
  const match = { college: collegeName };

  for (const field of ["batch", "gender"]) {
    const value = String(filters[field] || "").trim();
    if (value) match[field] = value;
  }

  if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
    match.age = {};
    if (filters.ageMin !== undefined) match.age.$gte = filters.ageMin;
    if (filters.ageMax !== undefined) match.age.$lte = filters.ageMax;
  }

  return match;
}

async function getInstitutionWellnessFilterOptions(institutionId) {
  const institution = await Institution.findById(institutionId)
    .select("collegeName")
    .lean();

  if (!institution) {
    return { batches: [], genders: [] };
  }

  const studentMatch = { college: institution.collegeName };

  const [batches, genders] = await Promise.all([
    User.distinct("batch", studentMatch),
    User.distinct("gender", studentMatch),
  ]);

  const clean = (values) =>
    values
      .filter((value) => typeof value === "string" && value.trim())
      .sort((a, b) => a.localeCompare(b));

  return {
    batches: clean(batches),
    genders: clean(genders),
  };
}

async function getInstitutionMoodOverview(institutionId, options = {}) {
  const {
    range = "week",
    status = "all",
    search = "",
    minScore,
    maxScore,
    sort = "label",
    page = 1,
    limit = 50,
  } = options;

  const institution = await Institution.findById(institutionId)
    .select("collegeName")
    .lean();

  if (!institution) {
    return { students: [], total: 0, page, limit };
  }

  const { start, previousStart, end } = getOverviewWindow(range);
  const match = { college: institution.collegeName };

  if (search) {
    match.username = { $regex: escapeRegex(search), $options: "i" };
  }

  const sortStage = {
    label: { username: 1 },
    score_low: { hasRecentCheckins: -1, averageMood: 1, username: 1 },
    score_high: { hasRecentCheckins: -1, averageMood: -1, username: 1 },
    checkins: { entryCount: -1, username: 1 },
  }[sort] || { username: 1 };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: DailyCheckIn.collection.name,
        let: { studentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$studentId"] },
                  { $gte: ["$date", previousStart] },
                  { $lt: ["$date", end] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              currentSum: {
                $sum: {
                  $cond: [{ $gte: ["$date", start] }, "$mood.score", 0],
                },
              },
              currentCount: {
                $sum: { $cond: [{ $gte: ["$date", start] }, 1, 0] },
              },
              previousSum: {
                $sum: {
                  $cond: [{ $lt: ["$date", start] }, "$mood.score", 0],
                },
              },
              previousCount: {
                $sum: { $cond: [{ $lt: ["$date", start] }, 1, 0] },
              },
            },
          },
        ],
        as: "periodStats",
      },
    },
    { $unwind: { path: "$periodStats", preserveNullAndEmptyArrays: true } },
    {
      $set: {
        entryCount: { $ifNull: ["$periodStats.currentCount", 0] },
        previousEntryCount: { $ifNull: ["$periodStats.previousCount", 0] },
        currentSum: { $ifNull: ["$periodStats.currentSum", 0] },
        previousSum: { $ifNull: ["$periodStats.previousSum", 0] },
      },
    },
    {
      $set: {
        averageMood: {
          $cond: [
            { $gt: ["$entryCount", 0] },
            { $divide: ["$currentSum", "$entryCount"] },
            null,
          ],
        },
        previousAverageMood: {
          $cond: [
            { $gt: ["$previousEntryCount", 0] },
            { $divide: ["$previousSum", "$previousEntryCount"] },
            null,
          ],
        },
        hasRecentCheckins: { $gt: ["$entryCount", 0] },
      },
    },
  ];

  if (status === "checked-in") {
    pipeline.push({ $match: { entryCount: { $gt: 0 } } });
  } else if (status === "not-checked-in") {
    pipeline.push({ $match: { entryCount: 0 } });
  }

  const scoreFilter = {};
  if (minScore !== undefined) scoreFilter.$gte = minScore;
  if (maxScore !== undefined) scoreFilter.$lte = maxScore;
  if (Object.keys(scoreFilter).length) {
    pipeline.push({ $match: { averageMood: scoreFilter } });
  }

  pipeline.push(
    { $sort: sortStage },
    {
      $facet: {
        students: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              studentId: { $toString: "$_id" },
              studentLabel: "$username",
              averageMood: 1,
              previousAverageMood: 1,
              entryCount: 1,
              previousEntryCount: 1,
              hasRecentCheckins: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  );

  const [result] = await User.aggregate(pipeline);
  return {
    students: result?.students || [],
    total: result?.totalCount?.[0]?.count || 0,
    page,
    limit,
  };
}

async function getInstitutionWellnessTrend(
  institutionId,
  requestedRange = "week",
  filters = {},
) {
  const range = RANGE_CONFIG[requestedRange] ? requestedRange : "week";
  const config = RANGE_CONFIG[range];
  const now = new Date();
  const currentBucket = bucketStart(now, range);
  const windowStart = shiftBucket(currentBucket, range, 1 - config.count);

  const institution = await Institution.findById(institutionId)
    .select("collegeName")
    .lean();

  if (!institution) return { totalStudents: 0, series: [] };

  const studentMatch = buildStudentMatch(institution.collegeName, filters);

  const totalStudents = await User.countDocuments(studentMatch);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateTrunc = {
    date: "$date",
    unit: config.unit,
    timezone,
  };
  if (range === "semester") dateTrunc.startOfWeek = "monday";

  const rows = await User.aggregate([
    { $match: studentMatch },
    {
      $lookup: {
        from: DailyCheckIn.collection.name,
        let: { studentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$studentId"] },
                  { $gte: ["$date", windowStart] },
                  { $lte: ["$date", now] },
                ],
              },
            },
          },
          { $set: { bucket: { $dateTrunc: dateTrunc } } },
          {
            $group: {
              _id: "$bucket",
              averageMood: { $avg: "$mood.score" },
              averageEnergy: { $avg: "$energy" },
              averageStress: { $avg: "$stress" },
              averageSleep: { $avg: "$sleep" },
              averageConcentration: { $avg: "$concentration" },
              averageSupport: { $avg: "$support" },
              averageMotivation: { $avg: "$motivation" },
              entryCount: { $sum: 1 },
              veryHappyCount: {
                $sum: { $cond: [{ $eq: ["$mood.score", 0] }, 1, 0] },
              },
              happyCount: {
                $sum: { $cond: [{ $eq: ["$mood.score", 1] }, 1, 0] },
              },
              neutralCount: {
                $sum: { $cond: [{ $eq: ["$mood.score", 2] }, 1, 0] },
              },
              stressedCount: {
                $sum: { $cond: [{ $eq: ["$mood.score", 3] }, 1, 0] },
              },
              sadCount: {
                $sum: { $cond: [{ $eq: ["$mood.score", 4] }, 1, 0] },
              },
            },
          },
        ],
        as: "periods",
      },
    },
    { $unwind: "$periods" },
    {
      $group: {
        _id: "$periods._id",
        averageMood: { $avg: "$periods.averageMood" },
        averageEnergy: { $avg: "$periods.averageEnergy" },
        averageStress: { $avg: "$periods.averageStress" },
        averageSleep: { $avg: "$periods.averageSleep" },
        averageConcentration: { $avg: "$periods.averageConcentration" },
        averageSupport: { $avg: "$periods.averageSupport" },
        averageMotivation: { $avg: "$periods.averageMotivation" },
        activeStudents: { $sum: 1 },
        checkinCount: { $sum: "$periods.entryCount" },
        veryHappyCount: { $sum: "$periods.veryHappyCount" },
        happyCount: { $sum: "$periods.happyCount" },
        neutralCount: { $sum: "$periods.neutralCount" },
        stressedCount: { $sum: "$periods.stressedCount" },
        sadCount: { $sum: "$periods.sadCount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const summaryRows = await User.aggregate([
    { $match: studentMatch },
    {
      $lookup: {
        from: DailyCheckIn.collection.name,
        let: { studentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$studentId"] },
                  { $gte: ["$date", windowStart] },
                  { $lte: ["$date", now] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              averageMood: { $avg: "$mood.score" },
              averageStress: { $avg: "$stress" },
              averageSleep: { $avg: "$sleep" },
              averageEnergy: { $avg: "$energy" },
              averageConcentration: { $avg: "$concentration" },
              averageSupport: { $avg: "$support" },
              averageMotivation: { $avg: "$motivation" },
            },
          },
        ],
        as: "period",
      },
    },
    { $unwind: "$period" },
    {
      $group: {
        _id: null,
        averageMood: { $avg: "$period.averageMood" },
        averageStress: { $avg: "$period.averageStress" },
        averageSleep: { $avg: "$period.averageSleep" },
        averageEnergy: { $avg: "$period.averageEnergy" },
        averageConcentration: { $avg: "$period.averageConcentration" },
        averageSupport: { $avg: "$period.averageSupport" },
        averageMotivation: { $avg: "$period.averageMotivation" },
        participatingStudents: { $sum: 1 },
      },
    },
  ]);

  const periodAverages = summaryRows[0]
    ? {
        averageMood: summaryRows[0].averageMood,
        averageStress: summaryRows[0].averageStress,
        averageSleep: summaryRows[0].averageSleep,
        averageEnergy: summaryRows[0].averageEnergy,
        averageConcentration: summaryRows[0].averageConcentration,
        averageSupport: summaryRows[0].averageSupport,
        averageMotivation: summaryRows[0].averageMotivation,
        participatingStudents: summaryRows[0].participatingStudents,
      }
    : {
        averageMood: null,
        averageStress: null,
        averageSleep: null,
        averageEnergy: null,
        averageConcentration: null,
        averageSupport: null,
        averageMotivation: null,
        participatingStudents: 0,
      };

  const weekdayRows = await DailyCheckIn.aggregate([
    {
      $match: {
        date: { $gte: windowStart, $lte: now },
        userId: {
          $in: await User.find(studentMatch).distinct("_id"),
        },
      },
    },
    {
      $group: {
        _id: {
          $dayOfWeek: {
            date: "$date",
            timezone,
          },
        },
        checkinCount: { $sum: 1 },
      },
    },
  ]);

  const weekdayCounts = new Map(
    weekdayRows.map((row) => [row._id, row.checkinCount]),
  );

  const weekdayPattern = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((weekday, index) => {
    const mongoDayNumber = index === 6 ? 1 : index + 2;
    return {
      weekday,
      checkinCount: weekdayCounts.get(mongoDayNumber) ?? 0,
    };
  });

  const valuesByBucket = new Map(
    rows.map((row) => [new Date(row._id).getTime(), row]),
  );
  const series = [];

  for (
    let date = new Date(windowStart);
    date <= currentBucket;
    date = shiftBucket(date, range, 1)
  ) {
    const values = valuesByBucket.get(date.getTime());
    series.push({
      label: makeLabel(date, range),
      averageMood: values?.averageMood ?? null,
      averageEnergy: values?.averageEnergy ?? null,
      averageStress: values?.averageStress ?? null,
      averageSleep: values?.averageSleep ?? null,
      averageConcentration: values?.averageConcentration ?? null,
      averageSupport: values?.averageSupport ?? null,
      averageMotivation: values?.averageMotivation ?? null,
      activeStudents: values?.activeStudents ?? 0,
      checkinCount: values?.checkinCount ?? 0,
      participationRate: totalStudents
        ? Math.round(((values?.activeStudents ?? 0) / totalStudents) * 100)
        : 0,
      moodVeryHappyPercent: values?.checkinCount
        ? Math.round((values.veryHappyCount / values.checkinCount) * 1000) / 10
        : null,
      moodHappyPercent: values?.checkinCount
        ? Math.round((values.happyCount / values.checkinCount) * 1000) / 10
        : null,
      moodNeutralPercent: values?.checkinCount
        ? Math.round((values.neutralCount / values.checkinCount) * 1000) / 10
        : null,
      moodStressedPercent: values?.checkinCount
        ? Math.round((values.stressedCount / values.checkinCount) * 1000) / 10
        : null,
      moodSadPercent: values?.checkinCount
        ? Math.round((values.sadCount / values.checkinCount) * 1000) / 10
        : null,
    });
  }

  return { totalStudents, series, periodAverages, weekdayPattern };
}

module.exports = {
  getMoodTrend,
  getInstitutionMoodOverview,
  getInstitutionWellnessTrend,
  getInstitutionWellnessFilterOptions,
  buildStudentMatch,
};
