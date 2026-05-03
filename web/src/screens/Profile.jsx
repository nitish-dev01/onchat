import React, { useState, useEffect } from 'react';
import { getMe, updateMe, getBlockedUsers, unblockUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', bio: '' });
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await getMe();
      setProfile(data);
      setFormData({ fullName: data.full_name || '', bio: data.bio || '' });
      try {
        const blocked = await getBlockedUsers();
        setBlockedUsers(Array.isArray(blocked) ? blocked : []);
      } catch (error) {
        console.error('Failed to load blocked users:', error);
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMe(formData);
      setProfile(updated);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  const handleUnblock = async (userId) => {
    try { await unblockUser(userId); setBlockedUsers(prev => prev.filter(u => u.id !== userId)); } catch {}
  };

  const handleLogout = () => { if (window.confirm('Logout?')) logout(); };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-avatar">{profile?.username?.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h2>{profile?.full_name || profile?.username}</h2>
          <p>{profile?.email}</p>
          <span className={`profile-status ${profile?.is_online ? 'online' : ''}`}>
            {profile?.is_online ? '🟢 Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="profile-section">
        <h3>Edit Profile</h3>
        {editing ? (
          <div className="edit-form">
            <input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Full Name" />
            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Bio" rows={3} />
            <div className="edit-buttons">
              <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <button className="edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
        )}
      </div>

      <div className="profile-section">
        <h3>Blocked Users ({blockedUsers.length})</h3>
        {blockedUsers.length === 0 ? (
          <p className="no-blocked">No blocked users</p>
        ) : (
          blockedUsers.map(u => (
            <div key={u.id} className="blocked-user">
              <span>{u.username}</span>
              <button onClick={() => handleUnblock(u.id)}>Unblock</button>
            </div>
          ))
        )}
      </div>

      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  );
}