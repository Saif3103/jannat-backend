const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/supportController');

// Status (public)
router.get('/status', ctrl.getSupportStatus);

// Customer / guest
router.get('/conversations/me', optionalAuth, ctrl.getMyConversation);
router.post('/conversations', optionalAuth, ctrl.startOrGetConversation);
router.post('/conversations/:id/messages', optionalAuth, ctrl.sendCustomerMessage);
router.post(
  '/conversations/:id/images',
  optionalAuth,
  upload.single('image'),
  ctrl.sendCustomerMessage
);
router.post('/conversations/:id/seen', optionalAuth, ctrl.markCustomerSeen);
router.post('/offline', optionalAuth, ctrl.submitOfflineRequest);

// Admin
router.get('/admin/conversations', protect, adminOnly, ctrl.adminListConversations);
router.get('/admin/unread', protect, adminOnly, ctrl.adminUnreadCount);
router.get('/admin/conversations/:id', protect, adminOnly, ctrl.adminGetConversation);
router.post('/admin/conversations/:id/messages', protect, adminOnly, ctrl.adminSendMessage);
router.post(
  '/admin/conversations/:id/images',
  protect,
  adminOnly,
  upload.single('image'),
  ctrl.adminSendMessage
);
router.patch('/admin/conversations/:id', protect, adminOnly, ctrl.adminUpdateConversation);

module.exports = router;
