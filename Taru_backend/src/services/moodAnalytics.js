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

module.exports = { getMoodTrend, getInstitutionMoodOverview };
