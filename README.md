# 💬 Socket.io Real-Time Chat Application

A modern, full-featured real-time chat application built with React, Socket.io, Node.js, and Clerk authentication. Features include public rooms, private messaging, typing indicators, read receipts, and a beautiful responsive UI.

![Chat Application](https://img.shields.io/badge/Socket.io-Chat-blue)
![React](https://img.shields.io/badge/React-18.x-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Clerk](https://img.shields.io/badge/Clerk-Auth-purple)

## ✨ Features

### Core Features
- 🔐 **Secure Authentication** - Clerk-based user authentication with Google OAuth
- 💬 **Public Chat Rooms** - Multiple rooms (general, random, help)
- 🔒 **Private Messaging** - One-on-one direct messages
- ✅ **Read Receipts** - Know when your messages are read
- ⌨️ **Typing Indicators** - See when others are typing
- 👥 **Online Users List** - Real-time user presence
- 🔔 **Unread Message Badges** - Never miss a message
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean, Discord-inspired interface

### Technical Features
- Real-time bidirectional communication with Socket.io
- JWT token authentication
- In-memory message storage (easily extendable to database)
- Auto-reconnection handling
- CORS-enabled for secure cross-origin requests
- Custom React hooks for socket management

## 🏗️ Architecture

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ChatInterface.jsx
│   │   │   └── ChatInterface.css
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useSocket.js
│   │   ├── socket/        # Socket.io client setup
│   │   │   └── socket.js
│   │   ├── App.jsx        # Main app component
│   │   ├── App.css        # Global styles
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Base styles
│   └── package.json
│
└── server/                # Node.js backend
    ├── server.js          # Express + Socket.io server
    ├── package.json
    └── .env               # Environment variables
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Clerk account (free tier available)

### Installation

#### 1. Clone the repository

```bash
git clone <your-repo-url>
cd socket-chat-app
```

#### 2. Set up Clerk Authentication

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Create a new application
3. Copy your **Publishable Key** and **Secret Key**

#### 3. Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_URL=http://localhost:5174
```

**Environment Variables:**
- `PORT` - Server port (default: 5000)
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `CLIENT_URL` - Frontend URL (comma-separated for multiple origins)

#### 4. Client Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_SOCKET_URL=http://localhost:5000
```

**Environment Variables:**
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `VITE_SOCKET_URL` - Backend server URL

### Running the Application

#### Development Mode

**Terminal 1 - Start the server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start the client:**
```bash
cd client
npm run dev
```

The application will be available at:
- **Client:** http://localhost:5174
- **Server:** http://localhost:5000

#### Production Build

**Build the client:**
```bash
cd client
npm run build
```

**Start the server:**
```bash
cd server
npm start
```

## 📚 Usage Guide

### Authentication

1. Visit the application URL
2. Sign in with:
   - Email and password
   - Google OAuth
3. Or create a new account via "Sign up"

### Chatting in Rooms

1. Select a room from the sidebar (general, random, help)
2. Type your message in the input field
3. Press Enter or click "Send"
4. See typing indicators when others are composing messages
5. View read receipts (✓✓) on your sent messages

### Private Messaging

1. Click on any online user in the "Online Users" list
2. A private chat will open
3. Send messages - only you and the recipient can see them
4. Unread message badges show new messages
5. Click back on a room to return to public chat

### Message Features

- **Read Receipts:** 
  - ✓ (single check) = Sent
  - ✓✓ (double check) = Read
- **Typing Indicators:** See "X is typing..." when users are composing
- **Unread Badges:** Red badges show unread message counts
- **Avatars:** User profile pictures from Clerk
- **Timestamps:** All messages show send time

## 🔧 API Reference

### Server Endpoints

#### Health Check
```
GET /api/health
```
Returns server status and statistics.

**Response:**
```json
{
  "status": "OK",
  "message": "Chat server is running",
  "usersOnline": 5,
  "totalMessages": 150,
  "totalPrivateChats": 3,
  "availableRooms": ["general", "random", "help"],
  "clerkEnabled": true,
  "features": {
    "privateMessaging": true,
    "readReceipts": true,
    "typingIndicators": true,
    "multipleRooms": true
  }
}
```

#### Get Messages
```
GET /api/messages?room=general
```
Returns last 50 messages from specified room.

#### Get Online Users
```
GET /api/users/online
```
Returns list of currently connected users.

### Socket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `user_join` | `{ username, userId, clerkUserId, email, avatar }` | Join the chat |
| `send_message` | `{ content, roomId }` | Send public message |
| `send_private_message` | `{ content, recipientId }` | Send private message |
| `mark_read` | `{ roomId, messageIds }` | Mark messages as read |
| `typing_start` | `roomId` | Start typing |
| `typing_stop` | `roomId` | Stop typing |
| `join_room` | `roomName` | Switch to different room |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `Message` | New public message |
| `private_message` | `Message` | New private message |
| `message_read` | `{ messageIds, userId, username, roomId }` | Messages marked read |
| `users_online` | `User[]` | Updated user list |
| `user_joined` | `User` | User joined notification |
| `user_left` | `User` | User left notification |
| `user_typing` | `{ username, userId, avatar }` | User started typing |
| `user_stop_typing` | `{ userId }` | User stopped typing |
| `message_history` | `Message[]` | Room message history |
| `available_rooms` | `string[]` | List of available rooms |

## 🎨 Customization

### Adding New Rooms

In `server.js`:
```javascript
const rooms = new Set(['general', 'random', 'help', 'gaming', 'tech']);
```

### Changing Theme Colors

In `App.css` and `ChatInterface.css`:
```css
/* Primary color */
background: #007bff; /* Change to your brand color */

/* Gradient background */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Adjusting Message Limits

In `server.js`:
```javascript
// Room messages limit
if (messages.length > 100) {  // Change to desired limit
  messages.shift();
}

// Private messages limit per chat
if (privateMessages.get(chatKey).length > 100) {  // Change limit
  privateMessages.get(chatKey).shift();
}
```

## 🔒 Security

### Authentication
- JWT tokens from Clerk validate user identity
- Socket connections require valid Clerk session
- User data fetched securely from Clerk API

### Best Practices
- Environment variables for sensitive keys
- CORS protection enabled
- Input sanitization (trim messages)
- Token verification on socket connections

### Production Considerations
- Use HTTPS in production
- Implement rate limiting
- Add message content filtering/moderation
- Store messages in database (MongoDB, PostgreSQL, etc.)
- Implement proper error logging
- Add Redis for session management at scale

## 🗄️ Database Integration (Optional)

To persist messages, integrate a database:

### MongoDB Example

```javascript
// Install mongoose
npm install mongoose

// In server.js
import mongoose from 'mongoose';

// Message Schema
const messageSchema = new mongoose.Schema({
  content: String,
  senderId: String,
  senderName: String,
  roomId: String,
  timestamp: Date,
  read: Boolean,
  type: String
});

const Message = mongoose.model('Message', messageSchema);

// Save message
socket.on('send_message', async (messageData) => {
  const message = new Message({
    content: messageData.content,
    senderId: socket.id,
    // ... other fields
  });
  await message.save();
  io.to(message.roomId).emit('receive_message', message);
});
```

## 📱 Mobile Responsive

The app is fully responsive with breakpoints at:
- **Desktop:** > 768px
- **Tablet:** 481px - 768px
- **Mobile:** < 480px

Mobile optimizations:
- Collapsible sidebar
- Touch-friendly buttons (44px min height)
- Optimized font sizes
- Hidden non-essential elements
- Improved scrolling performance

## 🐛 Troubleshooting

### Connection Issues

**Problem:** "Disconnected" status
```bash
# Check server is running
cd server && npm run dev

# Check VITE_SOCKET_URL matches server port
# In client/.env
VITE_SOCKET_URL=http://localhost:5000
```

**Problem:** CORS errors
```javascript
// In server.js, ensure CLIENT_URL is correct
const allowedOrigins = process.env.CLIENT_URL.split(',');
```

### Authentication Issues

**Problem:** "Missing Publishable Key" error
```bash
# Verify .env file exists in client directory
# Verify VITE_CLERK_PUBLISHABLE_KEY is set
```

**Problem:** Token verification fails
```bash
# Verify CLERK_SECRET_KEY in server/.env
# Ensure key starts with sk_test_ or sk_live_
```

### Message Issues

**Problem:** Messages not appearing
- Check browser console for errors
- Verify socket connection status (should be green)
- Check server logs for error messages

**Problem:** Private messages not working
- Ensure you're clicking on other users (not yourself)
- Check console logs for recipientId
- Verify both users are online

## 🚢 Deployment

### Server (Heroku)

```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set CLERK_SECRET_KEY=sk_xxx
heroku config:set CLIENT_URL=https://your-frontend.com

# Deploy
git push heroku main
```

### Client (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel

# Set environment variables in Vercel dashboard
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
VITE_SOCKET_URL=https://your-backend.herokuapp.com
```

### Environment Variables for Production

**Server:**
- `CLERK_SECRET_KEY` - Production Clerk secret key
- `CLIENT_URL` - Production frontend URL(s)
- `PORT` - Server port (usually set by hosting provider)

**Client:**
- `VITE_CLERK_PUBLISHABLE_KEY` - Production Clerk publishable key
- `VITE_SOCKET_URL` - Production backend URL

## 📊 Performance Optimization

### Current Optimizations
- In-memory storage for fast access
- Message history limited to last 50 messages
- Debounced typing indicators
- Efficient React re-renders with proper state management
- Lazy loading of message history

### Scaling Considerations
- Implement Redis for distributed session storage
- Use Socket.io Redis adapter for multi-server setups
- Add database connection pooling
- Implement message pagination
- Add CDN for static assets
- Use WebSocket compression

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) - Real-time communication
- [Clerk](https://clerk.com/) - Authentication and user management
- [React](https://react.dev/) - UI framework
- [Express](https://expressjs.com/) - Server framework
- [Vite](https://vitejs.dev/) - Build tool

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Check the [Troubleshooting](#-troubleshooting) section
- Review [Socket.io documentation](https://socket.io/docs/)
- Review [Clerk documentation](https://clerk.com/docs)

## 🗺️ Roadmap

- [ ] File/image sharing
- [ ] Message editing and deletion
- [ ] Message reactions (emoji)
- [ ] User blocking
- [ ] Message search
- [ ] Voice/video calls
- [ ] Message encryption
- [ ] Push notifications
- [ ] Offline message queuing
- [ ] Message threading
- [ ] Custom room creation
- [ ] User roles and permissions

---

**Built with ❤️ using React, Socket.io, and Clerk**