const express = require('express');
const router = express.Router();
const {
  getAdminNotifications,
  getMyNotifications,
  markRead,
  markAllAdminRead,
} = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/admin', protect, adminOnly, getAdminNotifications);
router.get('/mine', protect, getMyNotifications);
router.patch('/:id/read', protect, markRead);
router.post('/admin/read-all', protect, adminOnly, markAllAdminRead);

module.exports = router;
