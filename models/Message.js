const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['customer', 'agent', 'system'],
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    senderName: { type: String, default: '' },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    seenByCustomer: { type: Boolean, default: false },
    seenByAgent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
