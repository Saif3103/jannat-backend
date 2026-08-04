const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const { v4: uuidv4 } = require('uuid');
const { notifyAdmin, notifyUser } = require('../utils/notify');

function makeDisplayId() {
  const year = new Date().getFullYear();
  const short = uuidv4().split('-')[0].toUpperCase().slice(0, 5);
  return `JR-${year}-${short}`;
}

function initialStateForPayment(method) {
  switch (method) {
    case 'BankTransfer':
      return {
        orderStatus: 'Awaiting Payment',
        paymentStatus: 'AwaitingProof',
        verificationStatus: 'Pending',
        historyMsg: 'Order created — awaiting bank transfer proof',
      };
    case 'PayAfterConfirm':
      return {
        orderStatus: 'Awaiting Confirmation',
        paymentStatus: 'Pending',
        verificationStatus: 'N/A',
        historyMsg: 'Order awaiting customer confirmation call',
      };
    case 'COD':
    default:
      return {
        orderStatus: 'Pending',
        paymentStatus: 'Pending',
        verificationStatus: 'N/A',
        historyMsg: 'COD order received — ready for verification',
      };
  }
}

// POST /api/orders
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

    // Design Consultation / Showroom are handled by their own APIs
    if (paymentMethod === 'DesignConsultation' || paymentMethod === 'Showroom') {
      return res.status(400).json({
        success: false,
        message: 'Use consultation or showroom booking endpoints for this option',
        redirect:
          paymentMethod === 'DesignConsultation' ? 'consultation' : 'showroom',
      });
    }

    const allowed = ['COD', 'BankTransfer', 'PayAfterConfirm', 'Razorpay', 'UPI', 'Card', 'Wallet'];
    const safePayment = allowed.includes(paymentMethod) ? paymentMethod : 'COD';
    const safeDelivery = deliveryOption === 'express' ? 'express' : 'standard';
    const init = initialStateForPayment(safePayment);
    const orderIdDisplay = makeDisplayId();
    const trackingNumber = 'JRC-' + uuidv4().split('-')[0].toUpperCase();

    const order = new Order({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod: safePayment,
      itemsPrice: Number(itemsPrice) || 0,
      shippingPrice: Number(shippingPrice) || 0,
      taxPrice: Number(taxPrice) || 0,
      totalPrice: Number(totalPrice) || 0,
      notes: notes || '',
      deliveryOption: safeDelivery,
      discountAmount: Number(discountAmount) || 0,
      couponCode: couponCode || '',
      trackingNumber,
      orderIdDisplay,
      orderStatus: init.orderStatus,
      paymentStatus: init.paymentStatus,
      verificationStatus: init.verificationStatus,
      statusHistory: [{ status: init.orderStatus, message: init.historyMsg }],
    });
    order.initTimeline();
    await order.save();

    const dateYear = new Date().getFullYear();
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    await Invoice.create({
      invoiceNumber: `INV-${dateYear}-${randomId}`,
      order: order._id,
      user: req.user._id,
      amount: Number(totalPrice) || 0,
    });

    const notifType = safePayment === 'BankTransfer' ? 'bank_transfer' : 'order';
    await notifyAdmin({
      type: notifType,
      title: `New ${safePayment} order`,
      body: `${orderIdDisplay} · ₹${Number(totalPrice || 0).toLocaleString('en-IN')} · ${shippingAddress?.name || req.user.name}`,
      link: '/admin/orders',
      refId: order._id,
    });
    await notifyUser(req.user._id, {
      type: 'order',
      title: 'Order received',
      body: `Your order ${orderIdDisplay} has been received.`,
      link: `/order-success`,
      refId: order._id,
    });

    res.status(201).json({
      success: true,
      order,
      nextStep:
        safePayment === 'BankTransfer'
          ? 'bank_transfer'
          : safePayment === 'PayAfterConfirm'
            ? 'awaiting_confirmation'
            : 'success',
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create order',
    });
  }
};

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

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const trackOrder = async (req, res) => {
  try {
    const q = req.params.trackingNumber;
    const order = await Order.findOne({
      $or: [{ trackingNumber: q }, { orderIdDisplay: q }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({
      success: true,
      order: {
        orderIdDisplay: order.orderIdDisplay,
        trackingNumber: order.trackingNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        statusHistory: order.statusHistory,
        timeline: order.timeline,
        createdAt: order.createdAt,
        deliveryOption: order.deliveryOption,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { paymentMethod, paymentStatus, status } = req.query;
    const filter = {};
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter).populate('user', 'name email phone').sort('-createdAt');
    const total = await Order.countDocuments(filter);
    const revenue = await Order.aggregate([
      { $match: { orderStatus: { $nin: ['Cancelled', 'Returned'] } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    res.json({ success: true, orders, total, revenue: revenue[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, message: message || `Order ${status}` });

    // Advance timeline loosely by status
    if (Array.isArray(order.timeline) && order.timeline.length) {
      const map = {
        Pending: 0,
        'Awaiting Confirmation': 0,
        Confirmed: 1,
        'Awaiting Payment': 2,
        'Payment Pending': 2,
        Paid: 2,
        'Payment Received': 2,
        Processing: 3,
        'Quality Check': 3,
        Packed: 4,
        Shipped: 5,
        'Out for Delivery': 5,
        Delivered: 6,
      };
      const idx = map[status];
      if (idx !== undefined) {
        order.timeline = order.timeline.map((t, i) => ({
          step: t.step,
          completed: i <= idx,
          at: i <= idx ? t.at || new Date() : null,
        }));
      }
    }

    if (status === 'Delivered') {
      order.deliveredAt = Date.now();
    }
    if (['Paid', 'Payment Received'].includes(status)) {
      order.isPaid = true;
      order.paidAt = order.paidAt || Date.now();
      order.paymentStatus = 'Received';
    }

    await order.save();
    await notifyUser(order.user, {
      type: 'status',
      title: `Order ${status}`,
      body: message || `Your order is now ${status}`,
      link: '/dashboard?tab=orders',
      refId: order._id,
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/orders/:id/payment-proof
const submitPaymentProof = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (order.paymentMethod !== 'BankTransfer') {
      return res.status(400).json({ success: false, message: 'Not a bank transfer order' });
    }

    const { transactionId, bankName } = req.body;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID required' });
    }

    const proofUrl = req.file?.path || req.file?.secure_url || req.body.paymentProof || '';
    if (!proofUrl) {
      return res.status(400).json({ success: false, message: 'Payment screenshot required' });
    }

    order.transactionId = transactionId;
    order.bankName = bankName || '';
    order.paymentProof = proofUrl;
    order.paymentStatus = 'UnderReview';
    order.verificationStatus = 'Pending';
    order.orderStatus = 'Payment Pending';
    order.statusHistory.push({
      status: 'Payment Pending',
      message: 'Payment proof submitted — awaiting admin verification',
    });
    await order.save();

    await notifyAdmin({
      type: 'bank_transfer',
      title: 'Bank transfer proof uploaded',
      body: `${order.orderIdDisplay} · Txn ${transactionId}`,
      link: '/admin/payments',
      refId: order._id,
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH payment verification (admin)
const updatePaymentStatus = async (req, res) => {
  try {
    const { action, message } = req.body; // approve | reject | request_again | mark_received
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (action === 'approve') {
      order.verificationStatus = 'Approved';
      order.paymentStatus = 'Approved';
      order.isPaid = true;
      order.paidAt = Date.now();
      order.orderStatus = 'Confirmed';
      order.statusHistory.push({
        status: 'Confirmed',
        message: message || 'Payment verified and approved',
      });
    } else if (action === 'reject') {
      order.verificationStatus = 'Rejected';
      order.paymentStatus = 'Rejected';
      order.orderStatus = 'Awaiting Payment';
      order.statusHistory.push({
        status: 'Awaiting Payment',
        message: message || 'Payment proof rejected',
      });
    } else if (action === 'request_again') {
      order.verificationStatus = 'RequestAgain';
      order.paymentStatus = 'AwaitingProof';
      order.orderStatus = 'Awaiting Payment';
      order.statusHistory.push({
        status: 'Awaiting Payment',
        message: message || 'Please re-upload payment proof',
      });
    } else if (action === 'mark_received') {
      order.paymentStatus = 'Received';
      order.isPaid = true;
      order.paidAt = Date.now();
      order.orderStatus = 'Payment Received';
      order.statusHistory.push({
        status: 'Payment Received',
        message: message || 'Payment marked as received',
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await order.save();
    await notifyUser(order.user, {
      type: 'payment',
      title: `Payment ${action}`,
      body: message || `Payment status updated: ${action}`,
      link: '/dashboard?tab=orders',
      refId: order._id,
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await order.deleteOne();
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBankDetails = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    res.json({
      success: true,
      bank: {
        accountName: settings?.bankAccountName || 'Jannat Rugs Co.',
        accountNumber: settings?.bankAccountNumber || 'XXXXXXXXXXXX',
        ifsc: settings?.bankIfsc || 'XXXX0000000',
        bankName: settings?.bankName || 'Please contact support for bank details',
        branch: settings?.bankBranch || '',
        upi: settings?.bankUpi || '',
        note: 'Use your Order ID as payment reference. Upload proof after transfer.',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
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
};
