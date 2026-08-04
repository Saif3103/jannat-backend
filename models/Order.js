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
    // No enums — avoids ValidationError for BankTransfer / PayAfterConfirm flows
    paymentStatus: { type: String, default: 'Pending' },
    verificationStatus: { type: String, default: 'N/A' },
    transactionId: { type: String, default: '' },
    paymentProof: { type: String, default: '' },
    bankName: { type: String, default: '' },
    paymentResult: {
      id: String,
      status: String,
      updateTime: String,
      emailAddress: String,
    },
    deliveryOption: { type: String, default: 'standard' },
    itemsPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    totalPrice: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    orderStatus: { type: String, default: 'Pending' },
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
  { timestamps: true, strict: false }
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

// Force re-register so hot-reload / old enum cache cannot block new payment statuses
if (mongoose.models.Order) {
  delete mongoose.models.Order;
  delete mongoose.connection.models.Order;
}

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.TIMELINE_STEPS = TIMELINE_STEPS;
