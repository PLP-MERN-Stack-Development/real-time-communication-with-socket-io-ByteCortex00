import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import './ChatInterface.css';

export const ChatInterface = ({ userAuth }) => {
  const {
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
    sendMessage,
    sendPrivateMessage,
    openPrivateChat,
    markMessagesAsRead,
    joinRoom,
    setTyping
  } = useSocket();

  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, privateChats, activePrivateChat]);

  useEffect(() => {
    if (userAuth) {
      console.log('🔐 Connecting with Clerk user:', userAuth.username);
      connect(userAuth);
    }
  }, [userAuth, connect]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      console.log('📤 Sending message in:', activePrivateChat ? 'private chat' : 'room');
      if (activePrivateChat) {
        sendPrivateMessage(messageInput, activePrivateChat);
      } else {
        sendMessage(messageInput);
      }
      setMessageInput('');
      setTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // FIXED: Handle user click for private chat
  const handleUserClick = (user) => {
    if (user.id !== userAuth?.userId) {
      console.log('🔒 Opening private chat with:', user.username, 'Socket ID:', user.id);
      openPrivateChat(user.id);
    } else {
      console.log('❌ Cannot open private chat with yourself');
    }
  };

  const handleRoomClick = (room) => {
    console.log('🚪 Switching to room:', room);
    joinRoom(room);
  };

  // Get current messages to display
  const currentMessages = activePrivateChat 
    ? (privateChats.get(activePrivateChat) || [])
    : messages;

  // Get current chat partner info
  const chatPartner = activePrivateChat 
    ? users.find(u => u.id === activePrivateChat)
    : null;

  console.log('🔍 Current state:', {
    activePrivateChat,
    chatPartner: chatPartner?.username,
    privateChatsSize: privateChats.size,
    currentMessagesCount: currentMessages.length,
    usersCount: users.length
  });

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-section">
          <h3>Rooms</h3>
          <div className="room-list">
            {availableRooms.map(room => (
              <button
                key={room}
                className={`room-item ${currentRoom === room && !activePrivateChat ? 'active' : ''}`}
                onClick={() => handleRoomClick(room)}
              >
                # {room}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Online Users ({users.length})</h3>
          <div className="user-list">
            {users.map(user => {
              const isCurrentUser = user.id === userAuth?.userId;
              const unreadCount = unreadCounts.get(user.id) || 0;
              
              console.log('👤 Rendering user:', user.username, 'ID:', user.id, 'Unread:', unreadCount);
              
              return (
                <div 
                  key={user.id} 
                  className={`user-item ${activePrivateChat === user.id ? 'active' : ''} ${isCurrentUser ? 'current-user' : ''}`}
                  onClick={() => !isCurrentUser && handleUserClick(user)}
                  style={{ cursor: isCurrentUser ? 'default' : 'pointer' }}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="avatar-img" />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="online-indicator"></span>
                  <span className="username">
                    {user.username} {isCurrentUser && '(You)'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        {/* Chat Header */}
        <div className="chat-header">
          {activePrivateChat ? (
            <>
              <h2>
                💬 {chatPartner?.username || 'Private Chat'}
                <span className="chat-type-badge">Private</span>
              </h2>
              <div className="typing-indicator">
                {typingUsers.filter(user => user.userId === activePrivateChat).length > 0 && (
                  <span>{chatPartner?.username} is typing...</span>
                )}
              </div>
            </>
          ) : (
            <>
              <h2># {currentRoom}</h2>
              <div className="typing-indicator">
                {typingUsers.length > 0 && (
                  <span>
                    {typingUsers.map(user => user.username).join(', ')} 
                    {typingUsers.length === 1 ? ' is' : ' are'} typing...
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          {currentMessages.length === 0 ? (
            <div className="empty-state">
              <p>
                {activePrivateChat 
                  ? `No messages with ${chatPartner?.username || 'this user'} yet. Start a private conversation!` 
                  : 'No messages yet. Start the conversation!'}
              </p>
            </div>
          ) : (
            currentMessages.map((message) => {
              const isSystemMessage = message.system || message.type === 'system';
              const isOwnMessage = message.senderId === userAuth?.userId || 
                                   message.clerkUserId === userAuth?.clerkUserId;
              const messageContent = message.content || message.message;

              return (
                <div
                  key={message.id || Date.now()}
                  className={`message ${isSystemMessage ? 'system-message' : ''} ${
                    isOwnMessage ? 'own-message' : ''
                  }`}
                >
                  {!isSystemMessage && (
                    <div className="message-header">
                      <div className="sender-info">
                        {message.senderAvatar ? (
                          <img 
                            src={message.senderAvatar} 
                            alt={message.senderName} 
                            className="message-avatar"
                          />
                        ) : (
                          <div className="message-avatar-placeholder">
                            {message.senderName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="sender-name">
                          {message.senderName || 'Unknown User'}
                          {isOwnMessage && ' (You)'}
                        </span>
                      </div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatTime(message.timestamp)}
                        </span>
                        {isOwnMessage && message.read && (
                          <span className="read-receipt" title="Read">✓✓</span>
                        )}
                        {isOwnMessage && !message.read && (
                          <span className="read-receipt unread" title="Sent">✓</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="message-content">
                    {messageContent}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder={
              isConnected 
                ? (activePrivateChat ? `Message ${chatPartner?.username || 'user'}...` : "Type a message...")
                : "Connecting..."
            }
            className="message-input"
            disabled={!isConnected}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!messageInput.trim() || !isConnected}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};