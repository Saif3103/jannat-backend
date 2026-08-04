const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Attach req.user when a valid token is present; never block guests. */
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { optionalAuth };
