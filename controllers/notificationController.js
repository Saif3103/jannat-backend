const Notification = require('../models/Notification');

const getAdminNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ forRole: 'admin' }).sort('-createdAt').limit(50);
    const unread = await Notification.countDocuments({ forRole: 'admin', read: false });
    res.json({ success: true, notifications: list, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ forRole: 'user', user: req.user._id })
      .sort('-createdAt')
      .limit(50);
    const unread = await Notification.countDocuments({
      forRole: 'user',
      user: req.user._id,
      read: false,
    });
    res.json({ success: true, notifications: list, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Not found' });
    if (n.forRole === 'user' && String(n.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    n.read = true;
    await n.save();
    res.json({ success: true, notification: n });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAdminRead = async (req, res) => {
  try {
    await Notification.updateMany({ forRole: 'admin', read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAdminNotifications,
  getMyNotifications,
  markRead,
  markAllAdminRead,
};
