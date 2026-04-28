const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, changePassword, addAddress, toggleWishlist, getAllUsers, toggleUserStatus } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/address', protect, addAddress);
router.put('/wishlist/:productId', protect, toggleWishlist);

// Admin
router.get('/admin/all', protect, adminOnly, getAllUsers);
router.put('/admin/:id/toggle', protect, adminOnly, toggleUserStatus);

module.exports = router;
