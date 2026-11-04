const { validationResult } = require("express-validator");
const Institution = require("../models/Institution");
const User = require("../models/User");
const DailyCheckIn = require("../models/DailyCheckIn");
const generateToken = require("../utils/generateToken");
const mongoose = require("mongoose");
const {
  getMoodTrend,
  getInstitutionMoodOverview,
  getInstitutionWellnessTrend,
  getInstitutionWellnessFilterOptions: loadInstitutionWellnessFilterOptions,
  buildStudentMatch,
} = require("../services/moodAnalytics");

const AGE_RANGES = {
  under18: { ageMax: 17 },
  "18-20": { ageMin: 18, ageMax: 20 },
  "21-23": { ageMin: 21, ageMax: 23 },
  "24plus": { ageMin: 24 },
};

// Prebuilt check-in categories (keys from Taru_frontend/src/lib/checkinTree.ts).
// "positive" is the happy-mood tree, so it is not an issue.
const ISSUE_CATEGORIES = new Set([
  "placements",
  "academics",
  "exams",
  "family",
  "relationships",
  "loneliness",
  "health",
  "money",
  "overthinking",
]);
const TOP_CATEGORY_LIMIT = 5;

// Overview periods -> number of days ending today
const OVERVIEW_PERIOD_DAYS = { today: 1, week: 7, month: 30, quarter: 90 };

const byCountDesc = (a, b) => b.count - a.count;

// Most common issue categories with their root-cause → specific-issue breakdown.
// Free-text "Others" categories are grouped as "others" (no breakdown, since the
// check-in skips the deeper questions). Root causes / issues are returned as stored;
// null means the student skipped that question.
function getTopCategories(checkins) {
  const groups = new Map();

  for (const { category, rootCause, specificIssue } of checkins) {
    if (!category || category === "positive") continue;
    const key = ISSUE_CATEGORIES.has(category) ? category : "others";

    let group = groups.get(key);
    if (!group) {
      group = { count: 0, rootCauses: new Map() };
      groups.set(key, group);
    }
    group.count += 1;
    if (key === "others") continue;

    const rootKey = rootCause || null;
    let root = group.rootCauses.get(rootKey);
    if (!root) {
      root = { count: 0, issues: new Map() };
      group.rootCauses.set(rootKey, root);
    }
    root.count += 1;

    if (rootKey) {
      const issueKey = specificIssue || null;
      root.issues.set(issueKey, (root.issues.get(issueKey) || 0) + 1);
    }
  }

  return [...groups]
    .map(([category, group]) => ({
      category,
      count: group.count,
      rootCauses: [...group.rootCauses]
        .map(([rootCause, root]) => ({
          rootCause,
          count: root.count,
          issues: [...root.issues]
            .map(([issue, count]) => ({ issue, count }))
            .sort(byCountDesc),
        }))
        .sort(byCountDesc),
    }))
    .sort(byCountDesc)
    .slice(0, TOP_CATEGORY_LIMIT);
}

function getCohortFilters(query) {
  const filters = {};

  for (const field of ["batch", "gender"]) {
    const value = String(query[field] || "")
      .trim()
      .slice(0, 80);
    if (value) filters[field] = value;
  }

  const ageRange = AGE_RANGES[query.ageRange];
  if (ageRange) Object.assign(filters, ageRange);

  return filters;
}

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { collegeName, contactEmail, password } = req.body;

    const exists = await Institution.findOne({ collegeName });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Institution already registered" });
    }

    const institution = await Institution.create({
      collegeName,
      contactEmail,
      password,
    });

    const token = generateToken(institution._id, "institution");

    res.status(201).json({
      success: true,
      token,
      user: {
        id: institution._id,
        collegeName: institution.collegeName,
        contactEmail: institution.contactEmail,
        role: institution.role,
        createdAt: institution.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { collegeName, password } = req.body;

    const institution = await Institution.findOne({ collegeName }).select(
      "+password",
    );

    if (!institution) {
      return res
        .status(401)
        .json({ success: false, message: "Institution not found" });
    }

    const isMatch = await institution.comparePassword(password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(institution._id, "institution");

    res.status(200).json({
      success: true,
      token,
      user: {
        id: institution._id,
        collegeName: institution.collegeName,
        contactEmail: institution.contactEmail,
        role: institution.role,
        createdAt: institution.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const filters = getCohortFilters(req.query);
    const studentMatch = buildStudentMatch(req.user.collegeName, filters);
    const students = await User.find(studentMatch).select("_id");
    const studentIds = students.map((s) => s._id);
    const totalStudents = studentIds.length;

    // Window ending today: today only, past 7 days, 1 month (30 days) or 3 months (90 days)
    const range = OVERVIEW_PERIOD_DAYS[req.query.range] ? req.query.range : "today";
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (OVERVIEW_PERIOD_DAYS[range] - 1),
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const checkins = await DailyCheckIn.find({
      userId: { $in: studentIds },
      date: { $gte: windowStart, $lte: endOfToday },
    });

    // Each student counts once, however many days they checked in during the window
    const studentsCheckedIn = new Set(checkins.map((c) => String(c.userId))).size;

    // Averages over the check-ins in the window. Ratings can be skipped, so each
    // one is averaged over the check-ins that answered it
    const average = (getValue) => {
      const values = checkins.map(getValue).filter((v) => typeof v === "number");
      if (!values.length) return null;
      return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
    };

    const averages = {
      mood: average((c) => c.mood?.score),
      energy: average((c) => c.energy),
      stress: average((c) => c.stress),
      motivation: average((c) => c.motivation),
      totalScore: average((c) => c.totalScore),
    };

    res.status(200).json({
      success: true,
      data: {
        range,
        totalStudents,
        studentsCheckedIn,
        checkinCount: checkins.length,
        averages,
        topCategories: getTopCategories(checkins),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const collegeName = req.user.collegeName;

    // Find all students from this college (no email exposed)
    const students = await User.find({ college: collegeName }).select(
      "_id username year degree batch age gender",
    );
    const studentIds = students.map((s) => s._id);

    // Get today's check-ins
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const checkins = await DailyCheckIn.find({
      userId: { $in: studentIds },
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    // Map checkins by userId
    const checkinMap = {};
    checkins.forEach((c) => {
      checkinMap[c.userId.toString()] = c;
    });

    // Build response
    const result = students.map((s) => {
      const checkin = checkinMap[s._id.toString()] || null;
      return {
        username: s.username,
        year: s.year,
        degree: s.degree,
        batch: s.batch || "",
        age: s.age || null,
        gender: s.gender || "",
        todayCheckin: checkin
          ? {
              mood: checkin.mood,
              category: checkin.category,
              rootCause: checkin.rootCause,
              specificIssue: checkin.specificIssue,
              energy: checkin.energy,
              stress: checkin.stress,
              motivation: checkin.motivation,
              totalScore: checkin.totalScore,
              feedback: checkin.feedback,
            }
          : null,
      };
    });

    // Sort: checked-in students first, then alphabetically
    result.sort((a, b) => {
      if (a.todayCheckin && !b.todayCheckin) return -1;
      if (!a.todayCheckin && b.todayCheckin) return 1;
      return a.username.localeCompare(b.username);
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getMoodOverview = async (req, res) => {
  try {
    const ranges = ["week", "month", "semester", "year"];
    const statuses = ["all", "checked-in", "not-checked-in"];
    const sorts = ["label", "score_low", "score_high", "checkins"];

    const range = ranges.includes(req.query.range) ? req.query.range : "week";
    const status = statuses.includes(req.query.status)
      ? req.query.status
      : "all";
    const sort = sorts.includes(req.query.sort) ? req.query.sort : "label";
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 80);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50),
    );

    const parseScore = (value) => {
      if (value === undefined || value === "") return undefined;
      const score = Number(value);
      return Number.isFinite(score) && score >= 0 && score <= 4 ? score : null;
    };

    const minScore = parseScore(req.query.minScore);
    const maxScore = parseScore(req.query.maxScore);

    if (minScore === null || maxScore === null) {
      return res.status(400).json({
        success: false,
        message: "Mood scores must be between 0 and 4",
      });
    }
    if (
      minScore !== undefined &&
      maxScore !== undefined &&
      minScore > maxScore
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum score must not exceed maximum score",
      });
    }

    const data = await getInstitutionMoodOverview(req.user._id, {
      range,
      status,
      search,
      minScore,
      maxScore,
      sort,
      page,
      limit,
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getMoodOverview error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStudentMoodTrend = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const student = await User.findOne({
      _id: studentId,
      college: req.user.collegeName,
    }).select("_id");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const allowedRanges = ["week", "month", "semester", "year"];
    const range = allowedRanges.includes(req.query.range)
      ? req.query.range
      : "week";
    const data = await getMoodTrend(student._id, range);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("getStudentMoodTrend error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getInstitutionWellnessTrend = async (req, res) => {
  try {
    const ranges = ["week", "month", "semester", "year"];
    const range = ranges.includes(req.query.range) ? req.query.range : "week";

    const filters = getCohortFilters(req.query);
    const data = await getInstitutionWellnessTrend(
      req.user._id,
      range,
      filters,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error("getInstitutionWellnessTrend error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getInstitutionWellnessFilterOptions = async (req, res) => {
  try {
    const data = await loadInstitutionWellnessFilterOptions(req.user._id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("getInstitutionWellnessFilterOptions error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
