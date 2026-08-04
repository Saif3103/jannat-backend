const Notification = require('../models/Notification');

async function notifyAdmin({ type, title, body, link = '', refId = '' }) {
  try {
    await Notification.create({
      forRole: 'admin',
      type,
      title,
      body,
      link,
      refId: String(refId || ''),
    });
  } catch (err) {
    console.error('notifyAdmin failed:', err.message);
  }
}

async function notifyUser(userId, { type, title, body, link = '', refId = '' }) {
  try {
    if (!userId) return;
    await Notification.create({
      forRole: 'user',
      user: userId,
      type,
      title,
      body,
      link,
      refId: String(refId || ''),
    });
  } catch (err) {
    console.error('notifyUser failed:', err.message);
  }
}

module.exports = { notifyAdmin, notifyUser };
