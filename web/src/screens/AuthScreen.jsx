import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

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
  );
}