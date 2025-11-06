// client/src/socket/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // User events
  USER_JOIN: 'user_join',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USERS_ONLINE: 'users_online',
  
  // Message events
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_HISTORY: 'message_history',
  
  // Private messaging events - NEW
  SEND_PRIVATE_MESSAGE: 'send_private_message',
  PRIVATE_MESSAGE: 'private_message',
  
  // Read receipts - NEW
  MARK_READ: 'mark_read',
  MESSAGE_READ: 'message_read',
  
  // Typing events
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
  
  // Room events
  JOIN_ROOM: 'join_room',
  AVAILABLE_ROOMS: 'available_rooms'
};