const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const { v4: uuidv4 } = require('uuid');

// @desc  Create order
const createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      notes,
      deliveryOption,
      discountAmount,
      couponCode,
    } = req.body;
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      notes,
      deliveryOption: deliveryOption || 'standard',
      discountAmount: discountAmount || 0,
      couponCode: couponCode || '',
      trackingNumber: 'JRC-' + uuidv4().split('-')[0].toUpperCase(),
      statusHistory: [{ status: 'Pending', message: 'Order request received — awaiting verification' }],
    });

    // Auto-generate invoice record
    const dateYear = new Date().getFullYear();
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateYear}-${randomId}`;

    await Invoice.create({
      invoiceNumber,
      order: order._id,
      user: req.user._id,
      amount: totalPrice
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get my orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name images price')
      .sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get single order
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Track order by tracking number
const trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: { trackingNumber: order.trackingNumber, orderStatus: order.orderStatus, statusHistory: order.statusHistory, createdAt: order.createdAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort('-createdAt');
    const total = await Order.countDocuments();
    const revenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
    res.json({ success: true, orders, total, revenue: revenue[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, message: message || `Order ${status}` });
    if (status === 'Delivered') { order.isDelivered = true; order.deliveredAt = Date.now(); }
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrder, trackOrder, getAllOrders, updateOrderStatus };
