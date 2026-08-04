const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
      name: { type: String, required: true },
      email: String,
      phone: String,
    },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productSnapshot: {
      name: String,
      image: String,
      price: Number,
      size: String,
      color: String,
    },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    consultationType: {
      type: String,
      enum: ['Video Call', 'Phone Call', 'WhatsApp', 'Google Meet'],
      default: 'WhatsApp',
    },
    specialRequirements: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Rescheduled', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    adminNotes: { type: String, default: '' },
    rescheduleDate: String,
    rescheduleTime: String,
    bookingId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultation', consultationSchema);
