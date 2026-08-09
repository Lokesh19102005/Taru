const DailyCheckIn = require('../models/DailyCheckIn');
const User = require('../models/User');

const submitCheckin = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const { mood, energy, stress, sleep, concentration, support, motivation, feedback } = req.body;

    let checkin;
    let isUpdate = false;

    if (userId) {
      const existingCheckIn = await DailyCheckIn.findOne({
        userId,
        date: { $gte: today }
      });
      
      if (existingCheckIn) {
        existingCheckIn.mood = mood;
        existingCheckIn.energy = energy;
        existingCheckIn.stress = stress;
        existingCheckIn.sleep = sleep;
        existingCheckIn.concentration = concentration;
        existingCheckIn.support = support;
        existingCheckIn.motivation = motivation;
        existingCheckIn.feedback = feedback || '';
        await existingCheckIn.save();
        checkin = existingCheckIn;
        isUpdate = true;
      }
    }

    if (!isUpdate) {
      checkin = new DailyCheckIn({
        userId,
        date: today,
        mood,
        energy,
        stress,
        sleep,
        concentration,
        support,
        motivation,
        feedback
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
