import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyChannels, getChannelMessages } from '../services/api';
import socket from '../services/socket';
import './ChatList.css';

export default function ChatList() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
    socket.addListener('new_message', handleNewMessage);
    return () => socket.removeListener('new_message', handleNewMessage);
  }, []);

  const handleNewMessage = (data) => {
    setChannels(prev => prev.map(ch =>
      ch.id === data.channel_id ? { ...ch, lastMessage: data.message?.content, lastMessageTime: new Date() } : ch
    ));
  };

  const loadChannels = async () => {
    try {
      const data = await getMyChannels();
      const withMessages = await Promise.all(data.map(async (ch) => {
        try {
          const msgs = await getChannelMessages(ch.id, 1, 1);
          return { ...ch, lastMessage: msgs[0]?.content || 'No messages', lastMessageTime: msgs[0]?.created_at || ch.created_at };
        } catch { return { ...ch, lastMessage: 'No messages', lastMessageTime: ch.created_at }; }
      }));
      setChannels(withMessages);
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="chat-list-loading">Loading...</div>;

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h1>Chats</h1>
      </div>
      <div className="chat-list-content">
        {channels.length === 0 ? (
          <div className="chat-list-empty">No conversations yet. Add contacts to start chatting!</div>
        ) : (
          channels.map(channel => (
            <Link key={channel.id} to={`/chat/${channel.id}`} className="chat-item">
              <div className="chat-avatar">{channel.name.charAt(0).toUpperCase()}</div>
              <div className="chat-info">
                <div className="chat-header">
                  <span className="chat-name">{channel.name}</span>
                  <span className="chat-time">{formatTime(channel.lastMessageTime)}</span>
                </div>
                <span className="chat-preview">{channel.lastMessage}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}