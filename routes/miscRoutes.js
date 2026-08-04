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

// Dedicated team image upload endpoint — uses upload.any() to avoid multer "Unexpected field" errors
router.post('/settings/upload-team-image', protect, adminOnly, upload.any(), async (req, res) => {
  try {
    const allowedFields = ['founderImage', 'sahanaImage', 'saifImage', 'coFounderImage'];
    let field = req.body?.field;
    if (Array.isArray(field)) field = field[0];
    field = (field || '').toString().trim();

    // Fallback: infer field from uploaded file's fieldname
    if (!allowedFields.includes(field) && req.files?.length) {
      const match = req.files.find((f) => allowedFields.includes(f.fieldname));
      if (match) field = match.fieldname;
    }

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field name. Use one of: ${allowedFields.join(', ')}`,
      });
    }

    let imageUrl = '';

    if (req.files && req.files.length > 0) {
      const file =
        req.files.find((f) => f.fieldname === field) ||
        req.files.find((f) => allowedFields.includes(f.fieldname)) ||
        req.files[0];

      imageUrl =
        file.path ||
        file.secure_url ||
        file.url ||
        (file.filename ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${file.filename}` : '');
    }

    if (!imageUrl && req.body?.base64) {
      const { cloudinary } = require('../config/cloudinary');
      const uploadResponse = await cloudinary.uploader.upload(req.body.base64, {
        folder: 'jannat_rugs/team',
        public_id: `${field}-${Date.now()}`,
      });
      imageUrl = uploadResponse.secure_url;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'No image provided or upload failed' });
    }

    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    settings.set(field, imageUrl);
    settings.markModified(field);
    await settings.save();

    // Atomic update as backup so field never gets dropped
    await Settings.findByIdAndUpdate(
      settings._id,
      { $set: { [field]: imageUrl } },
      { new: true }
    );

    const fresh = await Settings.findById(settings._id).lean();
    res.json({ success: true, settings: fresh, url: imageUrl, field });
  } catch (err) {
    console.error('Team image upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

router.post('/newsletter', subscribeNewsletter);
router.get('/analytics', protect, adminOnly, getAnalytics);
router.get('/video-reviews', getRecentVideoReviews);
router.post('/chatbot', chatbotQuery);

module.exports = router;

