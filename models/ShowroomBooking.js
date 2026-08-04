const mongoose = require('mongoose');

const showroomBookingSchema = new mongoose.Schema(
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
    branch: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
      default: 'Pending',
    },
    qrCode: { type: String, default: '' },
    bookingId: { type: String, default: '' },
    notes: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShowroomBooking', showroomBookingSchema);
