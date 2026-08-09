const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Psychiatrist = require('../models/Psychiatrist');
const Institution = require('../models/Institution');

const modelMap = {
  user: User,
  psychiatrist: Psychiatrist,
  institution: Institution
};

const protect = (...allowedRoles) => {
  return async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const role = decoded.role || 'user';
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({ success: false, message: 'Not authorized for this role' });
      }
      
      const Model = modelMap[role];
      if (!Model) {
        return res.status(401).json({ success: false, message: 'Invalid role' });
      }
      
      req.user = await Model.findById(decoded.id);
      req.userRole = role;
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
  };
};

const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role || 'user';
    const Model = modelMap[role];
    if (Model) {
      req.user = await Model.findById(decoded.id);
      req.userRole = role;
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { protect, optionalProtect };
