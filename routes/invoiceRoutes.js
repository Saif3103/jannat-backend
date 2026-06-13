const express = require('express');
const router = express.Router();
const { getAllInvoices, downloadInvoice, downloadInvoiceByOrder } = require('../controllers/invoiceController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAllInvoices);
router.get('/:id/download', protect, downloadInvoice);
router.get('/order/:orderId/download', protect, downloadInvoiceByOrder);

module.exports = router;
