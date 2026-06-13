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

// Dedicated team image upload endpoint — avoids multer "unexpected file" errors
router.post('/settings/upload-team-image', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { field, base64 } = req.body;
    const allowedFields = ['founderImage', 'sahanaImage', 'saifImage', 'coFounderImage'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid field name' });
    }
    
    let imageUrl = '';
    if (base64) {
      const { cloudinary } = require('../config/cloudinary');
      try {
        const uploadResponse = await cloudinary.uploader.upload(base64, {
          folder: 'jannat_rugs/general',
        });
        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryErr) {
        console.error('Cloudinary base64 upload failed, storing base64 directly:', cloudinaryErr);
        imageUrl = base64; // Storing base64 as fallback
      }
    } else if (req.file) {
      imageUrl = req.file.path;
    } else {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    settings[field] = imageUrl;
    await settings.save();
    res.json({ success: true, settings, url: imageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/newsletter', subscribeNewsletter);
router.get('/analytics', protect, adminOnly, getAnalytics);
router.get('/video-reviews', getRecentVideoReviews);
router.post('/chatbot', chatbotQuery);

module.exports = router;

