const express = require('express');
const router = express.Router();
const {
  createConsultation,
  getMyConsultations,
  getAllConsultations,
  updateConsultation,
} = require('../controllers/consultationController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, createConsultation);
router.get('/mine', protect, getMyConsultations);
router.get('/admin/all', protect, adminOnly, getAllConsultations);
router.patch('/:id', protect, adminOnly, updateConsultation);

module.exports = router;
