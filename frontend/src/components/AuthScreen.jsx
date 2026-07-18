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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/google/auth-url/?flow=${tab}`);
      window.location.href = res.data.auth_url;
    } catch (err) {
      setError('Failed to initiate Google Login.');
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

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ padding: '0 0.8rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="btn-google-auth"
          style={{
            width: '100%',
            padding: '0.85rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontFamily: "'Syne', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {tab === 'login' ? 'Sign in with Google' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
