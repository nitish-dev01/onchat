import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, addContact, getContacts, createDirectChannel } from '../services/api';
import socket from '../services/socket';
import './Contacts.css';

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadContacts();
    socket.addListener('user_online', handlePresence);
    socket.addListener('user_offline', handlePresence);
    return () => {
      socket.removeListener('user_online', handlePresence);
      socket.removeListener('user_offline', handlePresence);
    };
  }, []);

  const handlePresence = (data) => {
    setContacts(prev => prev.map(c => c.id === data.user_id ? { ...c, is_online: data.is_online } : c));
  };

  const loadContacts = async () => {
    try { const data = await getContacts(); setContacts(data); } catch {}
    finally { setLoading(false); }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try { const results = await searchUsers(query); setSearchResults(results); } catch {}
    finally { setSearching(false); }
  };

  const handleAddContact = async (userId) => {
    try { await addContact(userId); await loadContacts(); setSearchQuery(''); setSearchResults([]); } catch {}
  };

  const handleStartChat = async (userId) => {
    try {
      const channel = await createDirectChannel(userId);
      navigate(`/chat/${channel.id}`);
    } catch {}
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return 'never';
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'recently';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) return <div className="contacts-loading">Loading...</div>;

  return (
    <div className="contacts">
      <div className="contacts-header">
        <h1>Contacts</h1>
      </div>
      <div className="search-container">
        <input type="text" placeholder="Search users..." value={searchQuery} onChange={handleSearch} />
        {searching && <span className="search-spinner">...</span>}
      </div>
      {searchQuery.length >= 2 ? (
        <div className="contacts-list">
          {searchResults.length === 0 ? <div className="contacts-empty">No users found</div> : searchResults.map(user => (
            <div key={user.id} className="contact-item">
              <div className="contact-avatar">{(user.full_name || user.username).charAt(0).toUpperCase()}</div>
              <div className="contact-info">
                <span className="contact-name">{user.full_name || user.username}</span>
                <span className="contact-email">{user.email}</span>
              </div>
              <button className="add-contact-btn" onClick={() => handleAddContact(user.id)}>+ Add</button>
              <button className="chat-btn" onClick={() => handleStartChat(user.id)}>💬</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="contacts-list">
          {contacts.length === 0 ? (
            <div className="contacts-empty">No contacts yet. Search for users to add!</div>
          ) : contacts.map(contact => (
            <div key={contact.id} className="contact-item" onClick={() => handleStartChat(contact.user_id)}>
              <div className="contact-avatar">
                {(contact.full_name || contact.username).charAt(0).toUpperCase()}
                <span className={`status-dot ${contact.is_online ? 'online' : ''}`} />
              </div>
              <div className="contact-info">
                <span className="contact-name">{contact.full_name || contact.username}</span>
                <span className="contact-status">{contact.is_online ? 'Online' : `Last seen ${formatLastSeen(contact.last_seen)}`}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}