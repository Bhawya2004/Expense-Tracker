import React, { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/react";
import api from './api';
import AuthScreen from './components/AuthScreen';
import BudgetModal from './components/BudgetModal';
import GoogleConnectModal from './components/GoogleConnectModal';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import SheetView from './components/SheetView';
import ExpenseList from './components/ExpenseList';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', '/');
      if (isLoggedIn) {
        showToast('Google connected! Your sheet is ready 📊', 'success');
      }
    }
    if (params.get('error')) {
      window.history.replaceState({}, '', '/');
      showToast('Google connection failed: ' + params.get('error'), 'error');
    }

    if (isLoggedIn) {
      loadAppData();
    }
  }, [isLoggedIn]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const loadAppData = async () => {
    try {
      const budgetRes = await api.get('/budget/');
      const budgetData = budgetRes.data;
      setMonthlyBudget(parseFloat(budgetData.monthly_budget) || 0);
      setGoogleConnected(budgetData.google_connected);
      setSheetUrl(budgetData.sheet_url);

      const currentMonth = new Date().toISOString().slice(0, 7);
      if (budgetData.budget_month !== currentMonth) {
        setShowBudgetModal(true);
      }

      loadExpenses(activeFilter);
    } catch (err) {
      if (err.response?.status === 404) {
        setShowBudgetModal(true);
      }
    }
  };

  const loadExpenses = async (category = null) => {
    let url = '/expenses/';
    if (category) url += `?category=${category}`;
    try {
      const res = await api.get(url);
      setExpenses(res.data);
    } catch (err) {}
  };

  const handleLoginSuccess = (user, isNew = false) => {
    setUsername(user);
    setIsLoggedIn(true);
    if (isNew) {
      setShowBudgetModal(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setExpenses([]);
    setMonthlyBudget(0);
    setGoogleConnected(false);
    setSheetUrl('');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await api.delete('/user/delete/');
      alert('Account deleted successfully.');
      handleLogout();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete account.');
    }
  };

  const handleAddExpense = async (data) => {
    try {
      await api.post('/expenses/', data);
      showToast('Expense added & sheet updated! 📊', 'success');
      loadExpenses(activeFilter);
      refreshSheet();
      return true;
    } catch (err) {
      const data = err.response?.data;
      showToast(data ? Object.values(data).flat().join(' ') : 'Failed to add expense', 'error');
      return false;
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}/`);
      showToast('Expense deleted', 'success');
      loadExpenses(activeFilter);
      refreshSheet();
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  const handleUpdateExpense = async (id, data) => {
    try {
      await api.put(`/expenses/${id}/`, data);
      showToast('Expense updated', 'success');
      loadExpenses(activeFilter);
      refreshSheet();
    } catch (err) {
      showToast('Failed to update expense', 'error');
    }
  };

  const refreshSheet = () => {
    if (googleConnected) {
      // Small delay to let the backend finish the sheet sync before we reload iframe
      setTimeout(() => {
        setSheetUrl(prev => {
          const url = new URL(prev);
          url.searchParams.set('t', Date.now());
          return url.toString();
        });
      }, 1500);
    }
  };

  const handleFilterChange = async (cat) => {
    setActiveFilter(cat);
    loadExpenses(cat);
    try {
      await api.post('/sheet/highlight/', { category: cat });
      refreshSheet();
    } catch (e) {}
  };

  const handleClearFilter = async () => {
    setActiveFilter(null);
    loadExpenses();
    try {
      await api.post('/sheet/highlight/', { category: null });
      refreshSheet();
    } catch (e) {}
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await api.get('/google/auth-url/');
      window.location.href = res.data.auth_url;
    } catch (err) {
      showToast('Failed to start Google sign-in', 'error');
    }
  };

  const handleBudgetSet = (amount, isGoogleConnected) => {
    setMonthlyBudget(amount);
    showToast(`Budget ₹${amount.toLocaleString('en-IN')} set!`, 'success');
    if (!isGoogleConnected) {
      setShowGoogleModal(true);
    } else {
      loadAppData();
    }
  };

  const calculateStats = () => {
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const remaining = monthlyBudget - total;
    const percent = monthlyBudget > 0 ? Math.min((total / monthlyBudget) * 100, 100) : 0;
    
    let top = '—';
    if (expenses.length) {
      const cats = {};
      expenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount));
      top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
    }

    return {
      budget: monthlyBudget,
      total,
      remaining,
      percent,
      count: expenses.length,
      top
    };
  };

  if (!isLoggedIn) {
    return (
      <>
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
        <div id="toast" className={`${toast.show ? 'show' : ''} ${toast.type}`}>
          {toast.msg}
        </div>
      </>
    );
  }

  return (
    <div id="app-screen" style={{ display: 'block' }}>
      <Topbar 
        username={username}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onSetBudget={() => setShowBudgetModal(true)}
        googleConnected={googleConnected}
        sheetUrl={sheetUrl}
        onConnectGoogle={handleConnectGoogle}
      />

      <div className="app-body">
        <Sidebar 
          stats={calculateStats()}
          onAddExpense={handleAddExpense}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onClearFilter={handleClearFilter}
        />

        <div className="main-content" style={{ overflowY: 'auto' }}>
          <SheetView 
            sheetUrl={sheetUrl}
            googleConnected={googleConnected}
            onConnectGoogle={handleConnectGoogle}
          />
          
          <ExpenseList 
            expenses={expenses}
            onDelete={handleDeleteExpense}
            onUpdate={handleUpdateExpense}
          />
        </div>
      </div>

      <BudgetModal 
        show={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onBudgetSet={handleBudgetSet}
        initialValue={monthlyBudget || ''}
      />

      <GoogleConnectModal 
        show={showGoogleModal}
        onConnect={handleConnectGoogle}
        onSkip={() => setShowGoogleModal(false)}
      />

      <div id="toast" className={`${toast.show ? 'show' : ''} ${toast.type}`}>
        {toast.msg}
      </div>
      <Analytics />
    </div>
  );
};

export default App;
