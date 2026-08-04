const express = require('express');
const router = express.Router();
const {
  createShowroomBooking,
  getBranches,
  getMyShowroomBookings,
  getAllShowroomBookings,
  updateShowroomBooking,
} = require('../controllers/showroomController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/branches', getBranches);
router.post('/', protect, createShowroomBooking);
router.get('/mine', protect, getMyShowroomBookings);
router.get('/admin/all', protect, adminOnly, getAllShowroomBookings);
router.patch('/:id', protect, adminOnly, updateShowroomBooking);

module.exports = router;
