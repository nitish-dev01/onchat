import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

const mockContacts = [
  { id: 1, name: 'Sarah Kim', initials: 'SK', av: 'av-purple', preview: 'Sounds great, see you then!', time: '2m', unread: 2 },
  { id: 2, name: 'Alex Torres', initials: 'AT', av: 'av-teal', preview: 'Can you review the doc?', time: '14m', unread: 0 },
  { id: 3, name: 'Priya Nair', initials: 'PN', av: 'av-coral', preview: 'lol yes exactly 😂', time: '1h', unread: 0 },
];

const mockMessages = [
  { from: 'them', text: 'Hey! Are we still on for the team sync tomorrow at 10?', time: '10:02 AM' },
  { from: 'me', text: 'Yes, absolutely! I\'ll send the invite now.', time: '10:04 AM' },
  { from: 'them', text: 'Perfect. Should I also loop in Priya?', time: '10:05 AM' },
  { from: 'me', text: 'Good idea, the more the merrier for this one.', time: '10:06 AM' },
];

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', username: '', fullName: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          username: formData.username || formData.email.split('@')[0],
          full_name: formData.fullName,
        });
      }
    } catch (err) {
      const responseData = err.response?.data;
      const detail = responseData?.detail;
      const status = err.response?.status;

      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg || JSON.stringify(e)).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else if (status === 401) {
        setError('Incorrect email or password. If this is the production app, please register there first.');
      } else {
        setError(responseData?.message || err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-card">
          <h1 className="auth-title">OnChat</h1>
          <p className="auth-subtitle">{isLogin ? 'Welcome back' : 'Create account'}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <>
                <input name="username" placeholder="Username" value={formData.username} onChange={handleChange} autoComplete="off" />
                <input name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} />
              </>
            )}
            <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} autoComplete="email" />
            <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} autoComplete={isLogin ? 'current-password' : 'new-password'} />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <button className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>

      <div className="auth-right">
        <div className="app-preview">
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>OnChat</h2>
              <input className="search-box" type="text" placeholder="Search…" disabled />
            </div>
            <div className="contact-list">
              {mockContacts.map(c => (
                <div key={c.id} className="contact-item active">
                  <div className={`avatar ${c.av}`}>{c.initials}</div>
                  <div className="contact-info">
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-preview">{c.preview}</div>
                  </div>
                  <div className="contact-meta">
                    <span className="contact-time">{c.time}</span>
                    {c.unread > 0 && <span className="badge">{c.unread}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-area">
            <div className="chat-header">
              <div className="avatar av-purple" style={{ width: '32px', height: '32px' }}>SK</div>
              <div className="chat-header-info">
                <div className="chat-header-name">Sarah Kim</div>
                <div className="chat-header-status">Online</div>
              </div>
            </div>
            <div className="messages">
              <div className="date-divider">Today</div>
              {mockMessages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`msg-row ${msg.from}`}>
                    {msg.from === 'them' && <div className="avatar av-purple" style={{ width: '24px', height: '24px', fontSize: '9px' }}>S</div>}
                    <div className={`bubble ${msg.from}`}>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}