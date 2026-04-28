import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChannel, getChannelMembers, getChannelMessages, sendMessage, addReaction } from '../services/api';
import socket from '../services/socket';
import './ChatRoom.css';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const SLASH_COMMANDS = [
  { command: '/help', description: 'Show available commands', action: () => ({ type: 'system', content: 'Available commands: /help, /online, /members' }) },
  { command: '/online', description: 'Show online users', action: (members) => ({ type: 'system', content: `Online: ${members.filter(m => m.is_online).map(m => m.username).join(', ') || 'None'}` }) },
  { command: '/members', description: 'List all members', action: (members) => ({ type: 'system', content: `Members (${members.length}): ${members.map(m => m.username).join(', ')}` }) },
];

export default function ChatRoom() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [showReactions, setShowReactions] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showCommandList, setShowCommandList] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadData();
    socket.addListener('new_message', handleNewMessage);
    return () => {
      socket.leaveChannel(channelId);
      socket.removeListener('new_message', handleNewMessage);
    };
  }, [channelId]);

  const loadData = async () => {
    try {
      const [ch, msges] = await Promise.all([getChannel(channelId), getChannelMessages(channelId)]);
      setChannel(ch);
      setMessages(msges.reverse());
      try { const mems = await getChannelMembers(channelId); setMembers(mems); } catch {}
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };

  const handleNewMessage = (data) => { if (data.channel_id == channelId) loadData(); };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);
    if (value.startsWith('/')) {
      const filtered = SLASH_COMMANDS.filter(cmd => cmd.command.startsWith(value.toLowerCase()));
      setFilteredCommands(filtered);
      setShowCommandList(filtered.length > 0);
    } else {
      setShowCommandList(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' && showCommandList && filteredCommands.length > 0) {
      e.preventDefault();
      const idx = filteredCommands.findIndex(c => c.command === inputText);
      const next = idx <= 0 ? filteredCommands.length - 1 : idx - 1;
      setInputText(filteredCommands[next].command + ' ');
      setShowCommandList(false);
    } else if (e.key === 'ArrowDown' && showCommandList && filteredCommands.length > 0) {
      e.preventDefault();
      const idx = filteredCommands.findIndex(c => c.command === inputText);
      const next = idx >= filteredCommands.length - 1 ? 0 : idx + 1;
      setInputText(filteredCommands[next].command + ' ');
      setShowCommandList(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (showCommandList && filteredCommands.length > 0) {
        e.preventDefault();
        executeCommand(filteredCommands[0]);
      } else if (inputText.trim()) {
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'Tab' && showCommandList && filteredCommands.length > 0) {
      e.preventDefault();
      executeCommand(filteredCommands[0]);
    } else if (e.key === 'Escape') {
      setShowCommandList(false);
    }
  };

  const executeCommand = (cmd) => {
    const result = cmd.action(members);
    setInputText('');
    setShowCommandList(false);
    const systemMsg = { id: Date.now(), sender_id: 0, sender_username: 'System', content: result.content, created_at: new Date().toISOString(), message_type: 'text', is_system: true };
    setMessages(prev => [...prev, systemMsg]);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const content = inputText.trim();
    setInputText('');
    try {
      await sendMessage({ channel_id: parseInt(channelId), content, message_type: 'text' });
      await loadData();
    } catch (error) { console.error('Failed to send:', error); }
  };

  const handleReaction = async (messageId, emoji) => {
    try { await addReaction(messageId, emoji); await loadData(); } catch {}
    setShowReactions(null);
  };

  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  };

  if (loading) return <div className="chat-room-loading">Loading...</div>;

  return (
    <div className="chat-room">
      <div className="chat-room-header">
        <button className="back-button" onClick={() => navigate('/')}>← Back</button>
        <h2>{channel?.name}</h2>
        <button className="members-button" onClick={() => setShowMembers(!showMembers)}>
          👥 {members.length}
        </button>
      </div>

      <div className="chat-room-body">
        {showMembers && (
          <div className="members-panel">
            <h3>Members ({members.length})</h3>
            <div className="members-list">
              {members.map(m => (
                <div key={m.user_id} className="member-item">
                  <span className={`online-dot ${m.is_online ? 'online' : ''}`} />
                  <span className="member-name">{m.username}</span>
                  <span className="member-role">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="messages-container">
          {messages.map((msg, i) => {
            const showDate = i === 0 || formatDate(msg.created_at) !== formatDate(messages[i - 1].created_at);
            return (
              <React.Fragment key={msg.id}>
                {showDate && <div className="date-separator"><span>{formatDate(msg.created_at)}</span></div>}
                <div className={`message ${msg.is_system ? 'system' : ''}`}>
                  <div className="message-avatar">{msg.sender_username?.charAt(0).toUpperCase()}</div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="sender-name">{msg.sender_username}</span>
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="message-text">{msg.content}</p>
                    {msg.reactions?.length > 0 && (
                      <div className="reactions-row">
                        {msg.reactions.map((r, i) => <span key={i} className="reaction-badge">{r.emoji} {r.count}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="message-actions">
                    <button onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}>😀</button>
                    {showReactions === msg.id && (
                      <div className="reaction-picker">
                        {EMOJI_OPTIONS.map(e => <button key={e} onClick={() => handleReaction(msg.id, e)}>{e}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="message-input-container">
        {showCommandList && filteredCommands.length > 0 && (
          <div className="command-suggestions">
            {filteredCommands.map(cmd => (
              <button key={cmd.command} className="command-item" onClick={() => executeCommand(cmd)}>
                <span className="command-name">{cmd.command}</span>
                <span className="command-desc">{cmd.description}</span>
              </button>
            ))}
          </div>
        )}
        <div className="input-wrapper">
          <input ref={inputRef} value={inputText} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type a message or / for commands..." />
          <button onClick={handleSend} disabled={!inputText.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}