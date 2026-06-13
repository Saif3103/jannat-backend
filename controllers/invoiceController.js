const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const generateInvoicePdf = require('../utils/generateInvoicePdf');

// @desc  Get all invoices
// @route GET /api/invoices
// @access Private/Admin
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({})
      .populate('user', 'name email')
      .populate('order', 'orderStatus paymentMethod createdAt')
      .sort('-createdAt');
    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Download invoice PDF by Invoice ID
// @route GET /api/invoices/:id/download
// @access Private
const downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const order = await Order.findById(invoice.order).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Associated order not found' });

    // Check permissions
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this invoice' });
    }

    const settings = await Settings.findOne() || {};

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    // Generate and pipe the PDF directly to the response stream
    generateInvoicePdf(order, settings, invoice.invoiceNumber, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Download invoice PDF by Order ID
// @route GET /api/invoices/order/:orderId/download
// @access Private
const downloadInvoiceByOrder = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ order: req.params.orderId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not generated for this order yet' });

    const order = await Order.findById(invoice.order).populate('user', 'name email');
    
    // Check permissions
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const settings = await Settings.findOne() || {};

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    generateInvoicePdf(order, settings, invoice.invoiceNumber, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllInvoices, downloadInvoice, downloadInvoiceByOrder };
