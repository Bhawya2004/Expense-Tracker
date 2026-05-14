import React, { useState } from 'react';
import api from '../api';

const AuthScreen = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!formData.username || !formData.password) return setError('Please fill in all fields.');
    
    setLoading(true);
    try {
      const res = await api.post('/token/', {
        username: formData.username,
        password: formData.password,
      });
      const { access, refresh } = res.data;
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('username', formData.username);
      onLoginSuccess(formData.username);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!formData.username || !formData.password) return setError('Username and password are required.');

    setLoading(true);
    try {
      await api.post('/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        monthly_budget: 0,
      });

      // Auto-login after registration
      const res = await api.post('/token/', {
        username: formData.username,
        password: formData.password,
      });
      const { access, refresh } = res.data;
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('username', formData.username);
      onLoginSuccess(formData.username, true); // true indicates a new registration
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen">
      <div className="auth-box">
        <div className="auth-logo">expense<span>.</span>track</div>
        <div className="auth-sub">Personal finance API — Django + DRF</div>
        
        <div className="tab-row">
          <button 
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`} 
            onClick={() => { setTab('login'); setError(''); }}
          >
            Login
          </button>
          <button 
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`} 
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Username</label>
              <input 
                name="username"
                type="text" 
                placeholder="your_username" 
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input 
                name="password"
                type="password" 
                placeholder="••••••••" 
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Username</label>
              <input 
                name="username"
                type="text" 
                placeholder="choose_a_username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input 
                name="email"
                type="email" 
                placeholder="you@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input 
                name="password"
                type="password" 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
