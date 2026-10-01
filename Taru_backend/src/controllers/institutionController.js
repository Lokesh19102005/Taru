const { validationResult } = require("express-validator");
const Institution = require("../models/Institution");
const User = require("../models/User");
const DailyCheckIn = require("../models/DailyCheckIn");
const generateToken = require("../utils/generateToken");
const mongoose = require("mongoose");
const {
  getMoodTrend,
  getInstitutionMoodOverview,
} = require("../services/moodAnalytics");

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
    const collegeName = req.user.collegeName;

    // Find all students from this college
    const students = await User.find({ college: collegeName }).select("_id");
    const studentIds = students.map((s) => s._id);
    const totalStudents = studentIds.length;

    // Get today's date range
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

    // Find today's check-ins for these students
    const checkins = await DailyCheckIn.find({
      userId: { $in: studentIds },
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    const studentsCheckedIn = checkins.length;

    // Compute averages ONLY from students who checked in
    let averages = {
      mood: 0,
      energy: 0,
      stress: 0,
      sleep: 0,
      concentration: 0,
      support: 0,
      motivation: 0,
      totalScore: 0,
    };

    if (studentsCheckedIn > 0) {
      let sums = {
        mood: 0,
        energy: 0,
        stress: 0,
        sleep: 0,
        concentration: 0,
        support: 0,
        motivation: 0,
        totalScore: 0,
      };

      checkins.forEach((c) => {
        sums.mood += c.mood?.score || 0;
        sums.energy += c.energy || 0;
        sums.stress += c.stress || 0;
        sums.sleep += c.sleep || 0;
        sums.concentration += c.concentration || 0;
        sums.support += c.support || 0;
        sums.motivation += c.motivation || 0;
        sums.totalScore += c.totalScore || 0;
      });

      averages = {
        mood: Math.round((sums.mood / studentsCheckedIn) * 10) / 10,
        energy: Math.round((sums.energy / studentsCheckedIn) * 10) / 10,
        stress: Math.round((sums.stress / studentsCheckedIn) * 10) / 10,
        sleep: Math.round((sums.sleep / studentsCheckedIn) * 10) / 10,
        concentration:
          Math.round((sums.concentration / studentsCheckedIn) * 10) / 10,
        support: Math.round((sums.support / studentsCheckedIn) * 10) / 10,
        motivation: Math.round((sums.motivation / studentsCheckedIn) * 10) / 10,
        totalScore: Math.round((sums.totalScore / studentsCheckedIn) * 10) / 10,
      };
    }

    res.status(200).json({
      success: true,
      data: { totalStudents, studentsCheckedIn, averages },
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
              energy: checkin.energy,
              stress: checkin.stress,
              sleep: checkin.sleep,
              concentration: checkin.concentration,
              support: checkin.support,
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
