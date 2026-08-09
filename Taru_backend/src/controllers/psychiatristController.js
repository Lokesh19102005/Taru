const { validationResult } = require('express-validator');
const Psychiatrist = require('../models/Psychiatrist');
const generateToken = require('../utils/generateToken');

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, qualification, specialization, experience, bio, languages } = req.body;

    const exists = await Psychiatrist.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const psychiatrist = await Psychiatrist.create({
      name,
      email,
      password,
      qualification,
      specialization: specialization || [],
      experience: experience || undefined,
      bio: bio || '',
      languages: languages || []
    });

    const token = generateToken(psychiatrist._id, 'psychiatrist');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: psychiatrist._id,
        name: psychiatrist.name,
        email: psychiatrist.email,
        role: psychiatrist.role,
        qualification: psychiatrist.qualification,
        specialization: psychiatrist.specialization,
        experience: psychiatrist.experience,
        bio: psychiatrist.bio,
        languages: psychiatrist.languages,
        profileImage: psychiatrist.profileImage,
        createdAt: psychiatrist.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const psychiatrist = await Psychiatrist.findOne({ email }).select('+password');

    if (!psychiatrist) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await psychiatrist.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(psychiatrist._id, 'psychiatrist');

    res.status(200).json({
      success: true,
      token,
      user: {
        id: psychiatrist._id,
        name: psychiatrist.name,
        email: psychiatrist.email,
        role: psychiatrist.role,
        qualification: psychiatrist.qualification,
        specialization: psychiatrist.specialization,
        experience: psychiatrist.experience,
        bio: psychiatrist.bio,
        languages: psychiatrist.languages,
        profileImage: psychiatrist.profileImage,
        createdAt: psychiatrist.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAllPsychiatrists = async (req, res) => {
  try {
    const psychiatrists = await Psychiatrist.find();
    res.status(200).json({ success: true, data: psychiatrists });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
