import { useEffect, useState, useRef } from 'react';
import { socket, SOCKET_EVENTS } from '../socket/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [privateChats, setPrivateChats] = useState(new Map());
  const [unreadCounts, setUnreadCounts] = useState(new Map());
  const [activePrivateChat, setActivePrivateChat] = useState(null);
  
  const socketRef = useRef(socket);
  const currentUserRef = useRef(null);

  // Connect to socket server with Clerk user data
  const connect = (userAuth) => {
    console.log('🔐 Connecting to socket with Clerk user:', userAuth.username);
    currentUserRef.current = userAuth;
    
    socketRef.current.auth = {
      username: userAuth.username,
      userId: userAuth.userId,
      clerkUserId: userAuth.clerkUserId,
      email: userAuth.email,
      avatar: userAuth.avatar,
      token: userAuth.token
    };
    
    socketRef.current.connect();
    
    const handleConnect = () => {
      socketRef.current.emit(SOCKET_EVENTS.USER_JOIN, {
        username: userAuth.username,
        userId: userAuth.userId,
        clerkUserId: userAuth.clerkUserId,
        email: userAuth.email,
        avatar: userAuth.avatar
      });
      console.log('✅ Socket connected, Clerk user join emitted');
    };
    
    socketRef.current.once(SOCKET_EVENTS.CONNECT, handleConnect);
  };

  const disconnect = () => {
    socketRef.current.disconnect();
  };

  const sendMessage = (content, roomId = currentRoom) => {
    if (content.trim()) {
      console.log('📤 Sending room message:', content);
      socketRef.current.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        content,
        roomId
      });
    }
  };

  // FIXED: Send private message
  const sendPrivateMessage = (content, recipientId) => {
    if (content.trim() && recipientId) {
      console.log('🔒 Sending private message to:', recipientId, 'Content:', content);
      socketRef.current.emit(SOCKET_EVENTS.SEND_PRIVATE_MESSAGE, {
        content,
        recipientId
      });
    } else {
      console.log('❌ Cannot send private message - missing content or recipient');
    }
  };

  // FIXED: Mark messages as read
  const markMessagesAsRead = (roomId, messageIds) => {
    if (messageIds && messageIds.length > 0) {
      console.log('👁️ Marking messages as read:', messageIds);
      socketRef.current.emit(SOCKET_EVENTS.MARK_READ, {
        roomId,
        messageIds
      });
    }
  };

  // FIXED: Open private chat with user
  const openPrivateChat = (userId) => {
    console.log('🔒 Opening private chat with user ID:', userId);
    setActivePrivateChat(userId);
    setCurrentRoom(null); // Clear room selection
    
    // Mark messages as read when opening chat
    const chatMessages = privateChats.get(userId) || [];
    const unreadMessageIds = chatMessages
      .filter(msg => !msg.read && msg.senderId !== socketRef.current.id)
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      markMessagesAsRead(`private_${userId}`, unreadMessageIds);
    }
    
    // Clear unread count
    setUnreadCounts(prev => {
      const updated = new Map(prev);
      updated.set(userId, 0);
      return updated;
    });
  };

  const joinRoom = (roomName) => {
    console.log('🚪 Joining room:', roomName);
    socketRef.current.emit(SOCKET_EVENTS.JOIN_ROOM, roomName);
    setCurrentRoom(roomName);
    setActivePrivateChat(null); // Clear private chat
    setMessages([]);
    
    // Mark room messages as read
    const roomMessages = messages.filter(msg => msg.roomId === roomName);
    const unreadMessageIds = roomMessages
      .filter(msg => !msg.read && msg.senderId !== socketRef.current.id)
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      markMessagesAsRead(roomName, unreadMessageIds);
    }
  };

  const setTyping = (isTyping, roomId = currentRoom) => {
    if (isTyping) {
      socketRef.current.emit(SOCKET_EVENTS.TYPING_START, roomId);
    } else {
      socketRef.current.emit(SOCKET_EVENTS.TYPING_STOP, roomId);
    }
  };

  // Socket event listeners
  useEffect(() => {
    const socketInstance = socketRef.current;

    const onConnect = () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('❌ Disconnected from server');
    };

    const onReceiveMessage = (message) => {
      console.log('📨 Received room message:', message);
      setMessages(prev => [...prev, message]);
    };

    const onMessageHistory = (messageList) => {
      console.log('📚 Message history loaded:', messageList.length, 'messages');
      setMessages(messageList);
    };

    // FIXED: Handle private messages
    const onPrivateMessage = (message) => {
      console.log('🔒 Received private message:', message);
      
      // Use recipientId for the chat key (consistent with server)
      const otherUserId = message.senderId === socketInstance.id 
        ? message.recipientId 
        : message.senderId;
      
      console.log('🔒 Private chat partner ID:', otherUserId);
      
      setPrivateChats(prev => {
        const updated = new Map(prev);
        const chatMessages = updated.get(otherUserId) || [];
        updated.set(otherUserId, [...chatMessages, message]);
        return updated;
      });
      
      // Update unread count if not in active chat
      if (activePrivateChat !== otherUserId && message.senderId !== socketInstance.id) {
        setUnreadCounts(prev => {
          const updated = new Map(prev);
          updated.set(otherUserId, (updated.get(otherUserId) || 0) + 1);
          return updated;
        });
      } else if (activePrivateChat === otherUserId) {
        // Auto-mark as read if in active chat
        markMessagesAsRead(`private_${otherUserId}`, [message.id]);
      }
    };

    // Handle read receipts
    const onMessageRead = (data) => {
      console.log('👁️ Messages marked as read:', data);
      
      // Update messages in current room
      setMessages(prev => prev.map(msg => 
        data.messageIds.includes(msg.id) 
          ? { ...msg, read: true, readBy: [...(msg.readBy || []), data.userId] }
          : msg
      ));
      
      // Update private chat messages
      setPrivateChats(prev => {
        const updated = new Map(prev);
        updated.forEach((chatMessages, userId) => {
          const updatedMessages = chatMessages.map(msg =>
            data.messageIds.includes(msg.id)
              ? { ...msg, read: true, readBy: [...(msg.readBy || []), data.userId] }
              : msg
          );
          updated.set(userId, updatedMessages);
        });
        return updated;
      });
    };

    const onUsersOnline = (userList) => {
      console.log('👥 Users online:', userList.length);
      console.log('👥 User details:', userList.map(u => ({ id: u.id, username: u.username })));
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      console.log(`👋 ${user.username} joined the chat`);
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        content: `${user.username} joined the chat`,
        timestamp: new Date().toISOString()
      }]);
    };

    const onUserLeft = (user) => {
      console.log(`👋 ${user.username} left the chat`);
      setMessages(prev => [...prev, {
        id: Date.now(),
        system: true,
        content: `${user.username} left the chat`,
        timestamp: new Date().toISOString()
      }]);
    };

    const onUserTyping = (user) => {
      console.log('⌨️ User typing:', user.username);
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== user.userId);
        return [...filtered, user];
      });
    };

    const onUserStopTyping = (data) => {
      console.log('⌨️ User stopped typing:', data.userId);
      setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
    };

    const onAvailableRooms = (rooms) => {
      console.log('🚪 Available rooms:', rooms);
      setAvailableRooms(rooms);
    };

    // Register event listeners
    socketInstance.on(SOCKET_EVENTS.CONNECT, onConnect);
    socketInstance.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    socketInstance.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
    socketInstance.on(SOCKET_EVENTS.MESSAGE_HISTORY, onMessageHistory);
    socketInstance.on(SOCKET_EVENTS.PRIVATE_MESSAGE, onPrivateMessage);
    socketInstance.on(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
    socketInstance.on(SOCKET_EVENTS.USERS_ONLINE, onUsersOnline);
    socketInstance.on(SOCKET_EVENTS.USER_JOINED, onUserJoined);
    socketInstance.on(SOCKET_EVENTS.USER_LEFT, onUserLeft);
    socketInstance.on(SOCKET_EVENTS.USER_TYPING, onUserTyping);
    socketInstance.on(SOCKET_EVENTS.USER_STOP_TYPING, onUserStopTyping);
    socketInstance.on(SOCKET_EVENTS.AVAILABLE_ROOMS, onAvailableRooms);

    return () => {
      socketInstance.off(SOCKET_EVENTS.CONNECT, onConnect);
      socketInstance.off(SOCKET_EVENTS.DISCONNECT, onDisconnect);
      socketInstance.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
      socketInstance.off(SOCKET_EVENTS.MESSAGE_HISTORY, onMessageHistory);
      socketInstance.off(SOCKET_EVENTS.PRIVATE_MESSAGE, onPrivateMessage);
      socketInstance.off(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
      socketInstance.off(SOCKET_EVENTS.USERS_ONLINE, onUsersOnline);
      socketInstance.off(SOCKET_EVENTS.USER_JOINED, onUserJoined);
      socketInstance.off(SOCKET_EVENTS.USER_LEFT, onUserLeft);
      socketInstance.off(SOCKET_EVENTS.USER_TYPING, onUserTyping);
      socketInstance.off(SOCKET_EVENTS.USER_STOP_TYPING, onUserStopTyping);
      socketInstance.off(SOCKET_EVENTS.AVAILABLE_ROOMS, onAvailableRooms);
    };
  }, [activePrivateChat, messages]);

  return {
    isConnected,
    messages,
    users,
    typingUsers,
    availableRooms,
    currentRoom,
    privateChats,
    unreadCounts,
    activePrivateChat,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    openPrivateChat,
    markMessagesAsRead,
    joinRoom,
    setTyping
  };
};