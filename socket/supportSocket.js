const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** @type {import('socket.io').Server | null} */
let io = null;

/** admin userId -> socket count */
const onlineAdmins = new Map();

function getIO() {
  return io;
}

function getOnlineAdminCount() {
  return onlineAdmins.size;
}

function isSupportOnline() {
  return onlineAdmins.size > 0;
}

function initSupportSocket(server, corsOrigins) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = corsOrigins.some(
          (a) => a === '*' || origin.replace(/\/$/, '') === String(a).replace(/\/$/, '')
        );
        callback(null, allowed);
      },
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          socket.user = user;
          socket.isAdmin = user.role === 'admin';
        }
      }
      socket.guestId = socket.handshake.auth?.guestId || socket.handshake.query?.guestId || '';
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.isAdmin && socket.user) {
      const id = String(socket.user._id);
      onlineAdmins.set(id, (onlineAdmins.get(id) || 0) + 1);
      io.emit('support:status', { online: true, agents: onlineAdmins.size });
    }

    socket.on('join:conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('join:admin', () => {
      if (socket.isAdmin) socket.join('admins');
    });

    socket.on('typing:start', ({ conversationId, sender }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        sender: sender || (socket.isAdmin ? 'agent' : 'customer'),
      });
      if (socket.isAdmin) return;
      socket.to('admins').emit('typing:start', {
        conversationId,
        sender: 'customer',
      });
    });

    socket.on('typing:stop', ({ conversationId, sender }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        sender: sender || (socket.isAdmin ? 'agent' : 'customer'),
      });
      socket.to('admins').emit('typing:stop', {
        conversationId,
        sender: sender || (socket.isAdmin ? 'agent' : 'customer'),
      });
    });

    socket.on('message:seen', ({ conversationId, by }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('message:seen', {
        conversationId,
        by: by || (socket.isAdmin ? 'agent' : 'customer'),
      });
      if (by === 'customer' || !socket.isAdmin) {
        socket.to('admins').emit('message:seen', { conversationId, by: 'customer' });
      }
    });

    socket.on('disconnect', () => {
      if (socket.isAdmin && socket.user) {
        const id = String(socket.user._id);
        const count = (onlineAdmins.get(id) || 1) - 1;
        if (count <= 0) onlineAdmins.delete(id);
        else onlineAdmins.set(id, count);
        io.emit('support:status', {
          online: onlineAdmins.size > 0,
          agents: onlineAdmins.size,
        });
      }
    });
  });

  return io;
}

function emitToConversation(conversationId, event, payload) {
  if (!io || !conversationId) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

function emitToAdmins(event, payload) {
  if (!io) return;
  io.to('admins').emit(event, payload);
}

module.exports = {
  initSupportSocket,
  getIO,
  getOnlineAdminCount,
  isSupportOnline,
  emitToConversation,
  emitToAdmins,
};
