const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    forRole: { type: String, enum: ['admin', 'user'], default: 'admin' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'order',
        'bank_transfer',
        'consultation',
        'showroom',
        'payment',
        'status',
      ],
      default: 'order',
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    refId: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
