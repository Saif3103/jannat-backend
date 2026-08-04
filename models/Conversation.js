const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    customer: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, default: '', trim: true },
    },
    guestId: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadCustomer: { type: Number, default: 0 },
    unreadAdmin: { type: Number, default: 0 },
    isOfflineRequest: { type: Boolean, default: false },
    quickTopic: { type: String, default: '' },
  },
  { timestamps: true }
);

conversationSchema.index({ 'customer.user': 1, status: 1 });
conversationSchema.index({ 'customer.email': 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
