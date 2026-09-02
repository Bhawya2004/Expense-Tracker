import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getBaseURL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrlState] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('access');
      const storedUsername = await AsyncStorage.getItem('username');
      const activeUrl = await getBaseURL();
      setApiUrlState(activeUrl);

      if (storedToken && storedUsername) {
        setToken(storedToken);
        setUser({ username: storedUsername });
        // Fetch initial expenses
        try {
          const res = await api.get('/expenses/');
          setExpenses(res.data || []);
        } catch (e) {
          console.warn('Initial expenses fetch warning:', e);
        }
      }
    } catch (e) {
      console.error('Failed to load stored auth session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = useCallback(async () => {
    try {
      const res = await api.get('/expenses/');
      setExpenses(res.data || []);
      setRefreshTrigger((prev) => prev + 1);
      return res.data;
    } catch (e) {
      console.warn('Failed to refresh expenses:', e);
    }
  }, []);

  const addExpense = async (payload) => {
    const res = await api.post('/expenses/', payload);
    await refreshAllData();
    return res.data;
  };

  const updateExpense = async (id, payload) => {
    const res = await api.put(`/expenses/${id}/`, payload);
    await refreshAllData();
    return res.data;
  };

  const deleteExpense = async (id) => {
    try {
      await api.delete(`/expenses/${id}/`);
    } catch (e) {
      if (e.response && (e.response.status === 404 || e.response.status === 400)) {
        console.warn(`Expense ${id} already removed.`);
      } else {
        console.warn('Delete expense error:', e);
      }
    }
    await refreshAllData();
  };

  const updateApiUrl = async (newUrl) => {
    try {
      if (!newUrl || newUrl.trim() === '') {
        await AsyncStorage.removeItem('custom_api_url');
      } else {
        await AsyncStorage.setItem('custom_api_url', newUrl.trim());
      }
      const updated = await getBaseURL();
      setApiUrlState(updated);
      return updated;
    } catch (e) {
      console.error('Failed to update API URL:', e);
    }
  };

  /**
   * Google Account / Firebase Login Handler
   */
  const loginWithGoogleEmail = async (email, name = '') => {
    const res = await api.post('/token/firebase/', { email, name });
    const { access, refresh, username, is_new } = res.data;

    await AsyncStorage.setItem('access', access);
    await AsyncStorage.setItem('refresh', refresh);
    await AsyncStorage.setItem('username', username);

    setToken(access);
    setUser({ username, isNew: is_new });
    await refreshAllData();
    return { username, is_new };
  };

  /**
   * Email & Password Login
   */
  const loginWithEmailPassword = async (emailOrUsername, password) => {
    const trimmedInput = (emailOrUsername || '').trim();
    let lastError = null;

    // 1. Try with exact input as username
    try {
      const res = await api.post('/token/', { username: trimmedInput, password });
      const { access, refresh } = res.data;

      await AsyncStorage.setItem('access', access);
      await AsyncStorage.setItem('refresh', refresh);
      await AsyncStorage.setItem('username', trimmedInput);

      setToken(access);
      setUser({ username: trimmedInput });
      await refreshAllData();
      return { username: trimmedInput };
    } catch (err) {
      lastError = err;
    }

    // 2. If input was an email (contains @), also try the username part before @
    if (trimmedInput.includes('@')) {
      const baseUsername = trimmedInput.split('@')[0];
      try {
        const res = await api.post('/token/', { username: baseUsername, password });
        const { access, refresh } = res.data;

        await AsyncStorage.setItem('access', access);
        await AsyncStorage.setItem('refresh', refresh);
        await AsyncStorage.setItem('username', baseUsername);

        setToken(access);
        setUser({ username: baseUsername });
        await refreshAllData();
        return { username: baseUsername };
      } catch (err) {
        lastError = err;
      }
    }

    // Throw authentic error
    const msg =
      lastError?.response?.data?.detail ||
      lastError?.response?.data?.error ||
      'Invalid email or password. Please check your credentials or switch to Register.';
    const customError = new Error(msg);
    customError.response = lastError?.response;
    throw customError;
  };

  /**
   * Email & Password Register
   */
  const registerWithEmailPassword = async (email, password) => {
    const trimmedEmail = (email || '').trim();
    const baseUsername = trimmedEmail.includes('@') ? trimmedEmail.split('@')[0] : trimmedEmail;

    const regRes = await api.post('/register/', {
      username: baseUsername,
      email: trimmedEmail,
      password,
    });

    return await loginWithEmailPassword(baseUsername, password);
  };

  /**
   * Update Profile Name
   */
  const updateUserName = async (newName) => {
    if (!newName || !newName.trim()) return;
    const cleanName = newName.trim();
    try {
      await api.post('/user/update/', { name: cleanName });
    } catch (e) {
      console.warn('Backend name update warning:', e.message);
    }
    await AsyncStorage.setItem('username', cleanName);
    setUser((prev) => ({ ...prev, username: cleanName }));
    return cleanName;
  };

  /**
   * Logout
   */
  const logout = async () => {
    await AsyncStorage.multiRemove(['access', 'refresh', 'username']);
    setToken(null);
    setUser(null);
    setExpenses([]);
  };

  /**
   * Delete Account
   */
  const deleteAccount = async () => {
    await api.delete('/user/delete/');
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        apiUrl,
        expenses,
        refreshTrigger,
        refreshAllData,
        addExpense,
        updateExpense,
        deleteExpense,
        updateApiUrl,
        updateUserName,
        loginWithGoogleEmail,
        loginWithEmailPassword,
        registerWithEmailPassword,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
