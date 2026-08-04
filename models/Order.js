const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Awaiting Confirmation',
  'Awaiting Payment',
  'Payment Pending',
  'Paid',
  'Payment Received',
  'Processing',
  'Quality Check',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

const TIMELINE_STEPS = [
  'Order Received',
  'Verification',
  'Payment',
  'Quality Inspection',
  'Packaging',
  'Shipment',
  'Delivered',
];

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        image: String,
        price: Number,
        quantity: Number,
        size: String,
        color: String,
      },
    ],
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      house: String,
      street: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
      addressType: { type: String, default: 'Home' },
    },
    paymentMethod: { type: String, default: 'COD' },
    paymentStatus: {
      type: String,
      default: 'Pending',
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'RequestAgain', 'N/A'],
      default: 'N/A',
    },
    transactionId: { type: String, default: '' },
    paymentProof: { type: String, default: '' },
    bankName: { type: String, default: '' },
    paymentResult: {
      id: String,
      status: String,
      updateTime: String,
      emailAddress: String,
    },
    deliveryOption: {
      type: String,
      enum: ['standard', 'express'],
      default: 'standard',
    },
    itemsPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    totalPrice: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    orderStatus: {
      type: String,
      default: 'Pending',
    },
    orderIdDisplay: { type: String, default: '' },
    trackingNumber: String,
    deliveredAt: Date,
    timeline: [
      {
        step: String,
        completed: { type: Boolean, default: false },
        at: Date,
      },
    ],
    statusHistory: [
      {
        status: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.TIMELINE_STEPS = TIMELINE_STEPS;

orderSchema.methods.initTimeline = function () {
  this.timeline = TIMELINE_STEPS.map((step, i) => ({
    step,
    completed: i === 0,
    at: i === 0 ? new Date() : null,
  }));
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.TIMELINE_STEPS = TIMELINE_STEPS;
