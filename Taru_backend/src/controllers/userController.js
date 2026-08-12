const User = require('../models/User');

exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

exports.updateMe = async (req, res) => {
  try {
    const { college, year, degree, batch, age, gender } = req.body;
    
    const updateData = {};
    if (college !== undefined) updateData.college = college;
    if (year !== undefined) updateData.year = year;
    if (degree !== undefined) updateData.degree = degree;
    if (batch !== undefined) updateData.batch = batch;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
