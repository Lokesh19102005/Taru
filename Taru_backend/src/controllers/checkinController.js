const DailyCheckIn = require('../models/DailyCheckIn');
const User = require('../models/User');

const MAX_TREE_TEXT = 500;
const MAX_FEEDBACK = 2000;

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

function cleanScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 4 ? value : null;
}

// Validates the request body and returns the fields to store, or null if mood is invalid.
function parseCheckin(body) {
  const { mood } = body;
  const moodScore = cleanScore(mood?.score);
  const moodLabel = cleanText(mood?.label, 50);
  if (moodScore === null || !moodLabel) return null;

  // A deeper level only makes sense when its parent was answered.
  const category = cleanText(body.category, MAX_TREE_TEXT);
  const rootCause = category ? cleanText(body.rootCause, MAX_TREE_TEXT) : null;
  const specificIssue = rootCause ? cleanText(body.specificIssue, MAX_TREE_TEXT) : null;

  return {
    mood: { label: moodLabel, score: moodScore },
    category,
    rootCause,
    specificIssue,
    energy: cleanScore(body.energy),
    stress: cleanScore(body.stress),
    motivation: cleanScore(body.motivation),
    feedback: cleanText(body.feedback, MAX_FEEDBACK) || ''
  };
}

const submitCheckin = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const fields = parseCheckin(req.body);
    if (!fields) {
      return res.status(400).json({ success: false, message: 'A valid mood is required' });
    }

    let checkin;
    let isUpdate = false;

    if (userId) {
      const existingCheckIn = await DailyCheckIn.findOne({
        userId,
        date: { $gte: today }
      });

      if (existingCheckIn) {
        existingCheckIn.set(fields);
        await existingCheckIn.save();
        checkin = existingCheckIn;
        isUpdate = true;
      }
    }

    if (!isUpdate) {
      checkin = new DailyCheckIn({
        userId,
        date: today,
        ...fields
      });
      await checkin.save();

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const checkedInYesterday = await DailyCheckIn.findOne({
            userId,
            date: { $gte: yesterday, $lt: today }
          });

          if (checkedInYesterday) {
            user.checkinStreak = (user.checkinStreak || 0) + 1;
          } else {
            user.checkinStreak = 1;
          }
          await user.save();
        }
      }
    }

    res.status(isUpdate ? 200 : 201).json({ success: true, data: checkin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const checkins = await DailyCheckIn.find({ userId })
      .sort({ date: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: checkins.length, data: checkins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getToday = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const checkin = await DailyCheckIn.findOne({
      userId,
      date: { $gte: today }
    });

    if (checkin) {
      res.status(200).json({ success: true, checkedIn: true, checkin });
    } else {
      res.status(200).json({ success: true, checkedIn: false, checkin: null });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  submitCheckin,
  getHistory,
  getToday
};
