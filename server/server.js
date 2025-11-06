import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClerkClient } from '@clerk/clerk-sdk-node';

dotenv.config();

const clerkClient = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
});

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5174").split(',');

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage
const connectedUsers = new Map();
const messages = [];
const privateMessages = new Map();
const rooms = new Set(['general', 'random', 'help']);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (token) {
      const session = await clerkClient.verifyToken(token);
      console.log('🔐 Authenticated user:', session.sub);
      socket.userId = session.sub;
    } else {
      console.log('⚠️ No token provided, allowing connection for demo');
    }
    
    next();
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    next();
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id, 'Clerk User:', socket.userId);

  socket.on('user_join', async (userData) => {
    try {
      let userInfo = {
        id: socket.id,
        username: userData.username,
        userId: userData.userId,
        clerkUserId: userData.clerkUserId,
        email: userData.email,
        avatar: userData.avatar,
        isOnline: true,
        joinedAt: new Date().toISOString()
      };

      if (userData.clerkUserId) {
        try {
          const clerkUser = await clerkClient.users.getUser(userData.clerkUserId);
          userInfo.username = clerkUser.fullName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress || userInfo.username;
          userInfo.avatar = clerkUser.imageUrl || userInfo.avatar;
          userInfo.email = clerkUser.primaryEmailAddress?.emailAddress || userInfo.email;
        } catch (error) {
          console.log('⚠️ Could not fetch Clerk user data, using provided data');
        }
      }
      
      connectedUsers.set(socket.id, userInfo);
      socket.join('general');
      
      console.log(`👋 ${userInfo.username} joined the chat (Clerk: ${userInfo.clerkUserId})`);
      
      socket.broadcast.emit('user_joined', {
        username: userInfo.username,
        id: socket.id,
        clerkUserId: userInfo.clerkUserId,
        avatar: userInfo.avatar,
        timestamp: new Date().toISOString()
      });
      
      // Send updated user list to all clients
      io.emit('users_online', Array.from(connectedUsers.values()));
      socket.emit('available_rooms', Array.from(rooms));
      
      const roomMessages = messages.filter(msg => msg.roomId === 'general');
      socket.emit('message_history', roomMessages.slice(-50));
      
    } catch (error) {
      console.error('Error in user_join:', error);
    }
  });

  // Handle regular chat messages
  socket.on('send_message', (messageData) => {
    const user = connectedUsers.get(socket.id);
    
    if (user && messageData.content.trim()) {
      const message = {
        id: `${Date.now()}-${socket.id}`,
        content: messageData.content.trim(),
        senderId: socket.id,
        senderName: user.username,
        senderAvatar: user.avatar,
        clerkUserId: user.clerkUserId,
        timestamp: new Date().toISOString(),
        roomId: messageData.roomId || 'general',
        type: 'text',
        read: false,
        readBy: []
      };
      
      messages.push(message);
      
      if (messages.length > 100) {
        messages.shift();
      }
      
      io.to(message.roomId).emit('receive_message', message);
      console.log(`💬 Message from ${user.username}: ${messageData.content}`);
    }
  });

  // FIXED: Handle private messages
  socket.on('send_private_message', (messageData) => {
    const sender = connectedUsers.get(socket.id);
    const recipient = Array.from(connectedUsers.values()).find(
      u => u.id === messageData.recipientId
    );
    
    console.log('🔒 Private message attempt:', {
      sender: sender?.username,
      senderId: socket.id,
      recipientId: messageData.recipientId,
      recipientFound: !!recipient,
      content: messageData.content,
      allUsers: Array.from(connectedUsers.values()).map(u => ({ id: u.id, username: u.username }))
    });
    
    if (sender && recipient && messageData.content.trim()) {
      const message = {
        id: `private-${Date.now()}-${socket.id}`,
        content: messageData.content.trim(),
        senderId: socket.id,
        senderName: sender.username,
        senderAvatar: sender.avatar,
        clerkUserId: sender.clerkUserId,
        recipientId: messageData.recipientId,
        recipientName: recipient.username,
        recipientClerkUserId: recipient.clerkUserId,
        timestamp: new Date().toISOString(),
        type: 'private',
        read: false,
        readBy: []
      };
      
      // Store private message using Clerk user IDs for persistence
      const chatKey = [sender.clerkUserId, recipient.clerkUserId].sort().join('-');
      if (!privateMessages.has(chatKey)) {
        privateMessages.set(chatKey, []);
      }
      privateMessages.get(chatKey).push(message);
      
      // Keep only last 100 private messages per chat
      if (privateMessages.get(chatKey).length > 100) {
        privateMessages.get(chatKey).shift();
      }
      
      console.log(`🔒 Private message from ${sender.username} to ${recipient.username}`, {
        messageId: message.id,
        recipientSocketId: recipient.id
      });
      
      // Send to both sender and recipient
      socket.emit('private_message', message);
      io.to(messageData.recipientId).emit('private_message', message);
      
    } else {
      console.log('❌ Private message failed - missing:', {
        sender: !!sender,
        recipient: !!recipient,
        content: !!messageData.content?.trim()
      });
    }
  });

  // Handle read receipts
  socket.on('mark_read', (data) => {
    const user = connectedUsers.get(socket.id);
    
    if (user && data.messageIds && data.messageIds.length > 0) {
      // Update read status for room messages
      messages.forEach(msg => {
        if (data.messageIds.includes(msg.id) && msg.senderId !== socket.id) {
          msg.read = true;
          if (!msg.readBy.includes(socket.id)) {
            msg.readBy.push(socket.id);
          }
        }
      });
      
      // Update read status for private messages
      privateMessages.forEach((chatMessages, chatKey) => {
        chatMessages.forEach(msg => {
          if (data.messageIds.includes(msg.id) && msg.senderId !== socket.id) {
            msg.read = true;
            if (!msg.readBy.includes(socket.id)) {
              msg.readBy.push(socket.id);
            }
            
            // Notify the sender that their message was read
            io.to(msg.senderId).emit('message_read', {
              messageIds: [msg.id],
              userId: socket.id,
              username: user.username,
              roomId: data.roomId
            });
          }
        });
      });
      
      // Broadcast to room (for room messages)
      if (data.roomId && !data.roomId.startsWith('private_')) {
        socket.to(data.roomId).emit('message_read', {
          messageIds: data.messageIds,
          userId: socket.id,
          username: user.username,
          roomId: data.roomId
        });
      }
      
      console.log(`👁️ ${user.username} marked ${data.messageIds.length} messages as read`);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (roomId) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(roomId || 'general').emit('user_typing', {
        username: user.username,
        userId: socket.id,
        avatar: user.avatar
      });
    }
  });

  socket.on('typing_stop', (roomId) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(roomId || 'general').emit('user_stop_typing', {
        userId: socket.id
      });
    }
  });

  // Handle room changes
  socket.on('join_room', (roomName) => {
    const roomsArray = Array.from(socket.rooms);
    roomsArray.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    
    socket.join(roomName);
    console.log(`🚪 User ${socket.id} joined room: ${roomName}`);
    
    const roomMessages = messages.filter(msg => msg.roomId === roomName);
    socket.emit('message_history', roomMessages.slice(-50));
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      connectedUsers.delete(socket.id);
      
      io.emit('user_left', {
        username: user.username,
        id: socket.id,
        timestamp: new Date().toISOString()
      });
      
      io.emit('users_online', Array.from(connectedUsers.values()));
      console.log(`👋 ${user.username} disconnected`);
    }
  });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chat server is running',
    usersOnline: connectedUsers.size,
    totalMessages: messages.length,
    totalPrivateChats: privateMessages.size,
    availableRooms: Array.from(rooms),
    clerkEnabled: true,
    features: {
      privateMessaging: true,
      readReceipts: true,
      typingIndicators: true,
      multipleRooms: true
    }
  });
});

app.get('/api/messages', (req, res) => {
  const room = req.query.room || 'general';
  const roomMessages = messages.filter(msg => msg.roomId === room);
  res.json(roomMessages.slice(-50));
});

app.get('/api/users/online', (req, res) => {
  res.json(Array.from(connectedUsers.values()));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Clerk authentication ENABLED`);
  console.log(`✨ Features: Private Messaging, Read Receipts, Typing Indicators`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
});