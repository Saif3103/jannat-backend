const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const {
  isSupportOnline,
  getOnlineAdminCount,
  emitToConversation,
  emitToAdmins,
} = require('../socket/supportSocket');

function getGuestId(req) {
  return (req.headers['x-guest-id'] || req.body?.guestId || '').toString().trim();
}

async function findCustomerConversation(req) {
  if (req.user) {
    const open = await Conversation.findOne({
      'customer.user': req.user._id,
      status: { $in: ['open', 'pending'] },
    }).sort({ lastMessageAt: -1 });
    if (open) return open;
  }

  const guestId = getGuestId(req);
  if (guestId) {
    return Conversation.findOne({
      guestId,
      status: { $in: ['open', 'pending'] },
    }).sort({ lastMessageAt: -1 });
  }
  return null;
}

function canAccessConversation(req, conversation) {
  if (!conversation) return false;
  if (req.user?.role === 'admin') return true;
  if (req.user && conversation.customer?.user && String(conversation.customer.user) === String(req.user._id)) {
    return true;
  }
  const guestId = getGuestId(req);
  if (guestId && conversation.guestId && conversation.guestId === guestId) return true;
  return false;
}

async function createSystemMessage(conversationId, text) {
  return Message.create({
    conversation: conversationId,
    sender: 'system',
    senderName: 'System',
    text,
    seenByCustomer: true,
    seenByAgent: true,
  });
}

// ─── Public / customer ───────────────────────────────────────────────────────

exports.getSupportStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      online: isSupportOnline(),
      agents: getOnlineAdminCount(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startOrGetConversation = async (req, res) => {
  try {
    const { name, email, phone, topic } = req.body;
    let conversation = await findCustomerConversation(req);

    if (!conversation) {
      const guestId = getGuestId(req);
      const customerName = req.user?.name || name;
      const customerEmail = req.user?.email || email;
      const customerPhone = req.user?.phone || phone || '';

      if (!customerName || !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required to start a chat',
          needsIdentity: true,
        });
      }

      if (!req.user && !guestId) {
        return res.status(400).json({
          success: false,
          message: 'Guest session missing',
          needsIdentity: true,
        });
      }

      conversation = await Conversation.create({
        customer: {
          user: req.user?._id || null,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        guestId: req.user ? '' : guestId,
        status: isSupportOnline() ? 'open' : 'pending',
        isOfflineRequest: !isSupportOnline(),
        quickTopic: topic || '',
        lastMessage: topic ? `Topic: ${topic}` : 'Conversation started',
        lastMessageAt: new Date(),
        unreadAdmin: 1,
      });

      const welcome = isSupportOnline()
        ? 'Welcome to Jannat Rugs Co. support. An agent will be with you shortly.'
        : "We're currently offline. Leave a message and we'll get back to you soon.";

      await createSystemMessage(conversation._id, welcome);

      if (topic) {
        const topicMsg = await Message.create({
          conversation: conversation._id,
          sender: 'customer',
          senderId: req.user?._id || null,
          senderName: customerName,
          text: `I'd like help with: ${topic}`,
          seenByCustomer: true,
        });
        conversation.lastMessage = topicMsg.text;
        await conversation.save();
        emitToAdmins('conversation:new', { conversation });
        emitToAdmins('message:new', { conversationId: conversation._id, message: topicMsg });
      } else {
        emitToAdmins('conversation:new', { conversation });
      }
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500);

    res.json({
      success: true,
      conversation,
      messages,
      online: isSupportOnline(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyConversation = async (req, res) => {
  try {
    const conversation = await findCustomerConversation(req);
    if (!conversation) {
      return res.json({
        success: true,
        conversation: null,
        messages: [],
        online: isSupportOnline(),
      });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500);

    res.json({
      success: true,
      conversation,
      messages,
      online: isSupportOnline(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendCustomerMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (['closed'].includes(conversation.status)) {
      return res.status(400).json({ success: false, message: 'This conversation is closed' });
    }

    const bodyText = (text || '').trim();
    const imageUrl = image || (req.file?.path || req.file?.secure_url || '');
    if (!bodyText && !imageUrl) {
      return res.status(400).json({ success: false, message: 'Message or image required' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: 'customer',
      senderId: req.user?._id || null,
      senderName: conversation.customer.name,
      text: bodyText,
      image: imageUrl,
      seenByCustomer: true,
      seenByAgent: false,
    });

    conversation.lastMessage = bodyText || '📷 Image';
    conversation.lastMessageAt = new Date();
    conversation.unreadAdmin = (conversation.unreadAdmin || 0) + 1;
    conversation.unreadCustomer = 0;
    if (conversation.status === 'resolved') conversation.status = 'open';
    await conversation.save();

    const payload = { conversationId: conversation._id, message, conversation };
    emitToConversation(conversation._id, 'message:new', payload);
    emitToAdmins('message:new', payload);
    emitToAdmins('notification:new', {
      type: 'message',
      title: 'New customer message',
      body: `${conversation.customer.name}: ${conversation.lastMessage}`,
      conversationId: conversation._id,
    });

    res.status(201).json({ success: true, message, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitOfflineRequest = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and message are required',
      });
    }

    const guestId = getGuestId(req);
    let conversation = await findCustomerConversation(req);

    if (!conversation) {
      conversation = await Conversation.create({
        customer: {
          user: req.user?._id || null,
          name,
          email,
          phone: phone || '',
        },
        guestId: req.user ? '' : guestId,
        status: 'pending',
        isOfflineRequest: true,
        lastMessage: message,
        lastMessageAt: new Date(),
        unreadAdmin: 1,
      });

      await createSystemMessage(
        conversation._id,
        "We're currently offline. Your message has been received — we'll reply by email soon."
      );
    }

    const msg = await Message.create({
      conversation: conversation._id,
      sender: 'customer',
      senderId: req.user?._id || null,
      senderName: name,
      text: message,
      seenByCustomer: true,
    });

    conversation.lastMessage = message;
    conversation.lastMessageAt = new Date();
    conversation.unreadAdmin = (conversation.unreadAdmin || 0) + 1;
    conversation.customer = {
      user: conversation.customer?.user || req.user?._id || null,
      name,
      email,
      phone: phone || conversation.customer?.phone || '',
    };
    await conversation.save();

    emitToAdmins('conversation:new', { conversation });
    emitToAdmins('message:new', { conversationId: conversation._id, message: msg });
    emitToAdmins('notification:new', {
      type: 'offline',
      title: 'Offline support request',
      body: `${name}: ${message.slice(0, 80)}`,
      conversationId: conversation._id,
    });

    res.status(201).json({ success: true, conversation, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markCustomerSeen = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !canAccessConversation(req, conversation)) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.updateMany(
      { conversation: conversation._id, sender: 'agent', seenByCustomer: false },
      { $set: { seenByCustomer: true } }
    );
    conversation.unreadCustomer = 0;
    await conversation.save();

    emitToConversation(conversation._id, 'message:seen', {
      conversationId: conversation._id,
      by: 'customer',
    });
    emitToAdmins('message:seen', { conversationId: conversation._id, by: 'customer' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

exports.adminListConversations = async (req, res) => {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { 'customer.name': regex },
        { 'customer.email': regex },
        { 'customer.phone': regex },
        { lastMessage: regex },
      ];
    }

    const conversations = await Conversation.find(filter)
      .populate('assignedAgent', 'name email')
      .sort({ lastMessageAt: -1 })
      .limit(200);

    const unreadTotal = await Conversation.aggregate([
      { $match: { status: { $in: ['open', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$unreadAdmin' } } },
    ]);

    res.json({
      success: true,
      conversations,
      unreadTotal: unreadTotal[0]?.total || 0,
      online: isSupportOnline(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminGetConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('assignedAgent', 'name email')
      .populate('customer.user', 'name email phone avatar');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });

    await Message.updateMany(
      { conversation: conversation._id, sender: 'customer', seenByAgent: false },
      { $set: { seenByAgent: true } }
    );
    conversation.unreadAdmin = 0;
    if (!conversation.assignedAgent) {
      conversation.assignedAgent = req.user._id;
    }
    await conversation.save();

    emitToConversation(conversation._id, 'message:seen', {
      conversationId: conversation._id,
      by: 'agent',
    });

    res.json({ success: true, conversation, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminSendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const bodyText = (text || '').trim();
    const imageUrl = image || (req.file?.path || req.file?.secure_url || '');
    if (!bodyText && !imageUrl) {
      return res.status(400).json({ success: false, message: 'Message or image required' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: 'agent',
      senderId: req.user._id,
      senderName: req.user.name || 'Support Agent',
      text: bodyText,
      image: imageUrl,
      seenByAgent: true,
      seenByCustomer: false,
    });

    conversation.lastMessage = bodyText || '📷 Image';
    conversation.lastMessageAt = new Date();
    conversation.unreadCustomer = (conversation.unreadCustomer || 0) + 1;
    conversation.unreadAdmin = 0;
    conversation.assignedAgent = req.user._id;
    if (conversation.status === 'pending') conversation.status = 'open';
    if (conversation.isOfflineRequest) conversation.isOfflineRequest = false;
    await conversation.save();

    const payload = { conversationId: conversation._id, message, conversation };
    emitToConversation(conversation._id, 'message:new', payload);
    emitToAdmins('message:new', payload);
    emitToConversation(conversation._id, 'notification:new', {
      type: 'reply',
      title: 'Support replied',
      body: bodyText || 'Sent an image',
      conversationId: conversation._id,
    });

    res.status(201).json({ success: true, message, conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminUpdateConversation = async (req, res) => {
  try {
    const { status } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (status && ['open', 'pending', 'resolved', 'closed'].includes(status)) {
      conversation.status = status;
      if (status === 'resolved' || status === 'closed') {
        const sys = await createSystemMessage(
          conversation._id,
          status === 'resolved'
            ? 'This conversation was marked as resolved. Reply anytime to reopen.'
            : 'This conversation has been closed by support.'
        );
        emitToConversation(conversation._id, 'message:new', {
          conversationId: conversation._id,
          message: sys,
          conversation,
        });
      }
    }

    await conversation.save();
    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });

    emitToConversation(conversation._id, 'conversation:updated', { conversation });
    emitToAdmins('conversation:updated', { conversation });

    res.json({ success: true, conversation, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminUnreadCount = async (req, res) => {
  try {
    const result = await Conversation.aggregate([
      { $match: { status: { $in: ['open', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$unreadAdmin' } } },
    ]);
    res.json({ success: true, unreadTotal: result[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
