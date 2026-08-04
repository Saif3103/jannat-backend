const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  trackOrder,
  getAllOrders,
  updateOrderStatus,
  submitPaymentProof,
  updatePaymentStatus,
  deleteOrder,
  getBankDetails,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/bank-details', protect, getBankDetails);
router.get('/track/:trackingNumber', trackOrder);
router.get('/admin/all', protect, adminOnly, getAllOrders);

router.post(
  '/:id/payment-proof',
  protect,
  upload.single('paymentProof'),
  submitPaymentProof
);
router.patch('/:id/payment-status', protect, adminOnly, updatePaymentStatus);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.delete('/:id', protect, deleteOrder);
router.get('/:id', protect, getOrder);

module.exports = router;
