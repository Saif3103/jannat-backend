const express = require('express');
const router = express.Router();
const { submitContact, getContacts, getOffers, getAllOffers, createOffer, updateOffer, deleteOffer, getSettings, updateSettings, subscribeNewsletter, getAnalytics, chatbotQuery, getRecentVideoReviews } = require('../controllers/miscController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/contact', submitContact);
router.get('/contacts', protect, adminOnly, getContacts);
router.get('/offers', getOffers);
router.get('/offers/all', protect, adminOnly, getAllOffers);
router.post('/offers', protect, adminOnly, upload.single('image'), createOffer);
router.put('/offers/:id', protect, adminOnly, updateOffer);
router.delete('/offers/:id', protect, adminOnly, deleteOffer);
router.get('/settings', getSettings);
router.put('/settings', protect, adminOnly, upload.any(), updateSettings);
router.post('/newsletter', subscribeNewsletter);
router.get('/analytics', protect, adminOnly, getAnalytics);
router.get('/video-reviews', getRecentVideoReviews);
router.post('/chatbot', chatbotQuery);

module.exports = router;
