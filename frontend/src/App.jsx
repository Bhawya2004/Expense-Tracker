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
import AnalyticsDashboard from './components/AnalyticsDashboard';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [budgetMode, setBudgetMode] = useState('monthly');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [fixedDailyBudget, setFixedDailyBudget] = useState(0);
  const [balanceSetupDate, setBalanceSetupDate] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [isNewMonth, setIsNewMonth] = useState(false);
  const [monthName, setMonthName] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
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
      setBudgetMode(budgetData.budget_mode || 'monthly');
      setMonthlyBudget(parseFloat(budgetData.monthly_budget) || 0);
      setCurrentBalance(parseFloat(budgetData.current_balance) || 0);
      setFixedDailyBudget(parseFloat(budgetData.fixed_daily_budget) || 0);
      setBalanceSetupDate(budgetData.balance_setup_date);
      setGoogleConnected(budgetData.google_connected);
      setSheetUrl(budgetData.sheet_url);
      setServiceAccountEmail(budgetData.service_account_email || '');
      setMonthName(budgetData.month_name || '');

      const currentMonth = new Date().toISOString().slice(0, 7);
      if (!budgetData.budget_mode || budgetData.budget_mode === 'monthly') {
        if (budgetData.is_new_month || budgetData.budget_month !== currentMonth) {
          setIsNewMonth(true);
          setShowBudgetModal(true);
        } else {
          setIsNewMonth(false);
        }
      }

      loadExpenses(activeFilter, startDate, endDate);
    } catch (err) {
      if (err.response?.status === 404) {
        setShowBudgetModal(true);
      }
    }
  };

  const loadExpenses = async (category = activeFilter, start = startDate, end = endDate) => {
    let url = '/expenses/';
    const queryParams = [];
    if (category) queryParams.push(`category=${category}`);
    if (start) queryParams.push(`start=${start}`);
    if (end) queryParams.push(`end=${end}`);
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
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
    loadExpenses(cat, startDate, endDate);
    try {
      await api.post('/sheet/highlight/', { category: cat });
      refreshSheet();
    } catch (e) {}
  };

  const handleClearFilter = async () => {
    setActiveFilter(null);
    loadExpenses(null, startDate, endDate);
    try {
      await api.post('/sheet/highlight/', { category: null });
      refreshSheet();
    } catch (e) {}
  };

  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    loadExpenses(activeFilter, start, end);
  };

  const handleConnectGoogle = async (sheetUrlInput) => {
    if (sheetUrlInput && typeof sheetUrlInput === 'string') {
      try {
        showToast('Linking your Google Sheet... 📊', 'success');
        const res = await api.post('/sheet/create/', { sheet_url: sheetUrlInput });
        setGoogleConnected(true);
        setSheetUrl(res.data.sheet_url);
        setShowGoogleModal(false);
        showToast('Google Sheet linked and synced successfully! 🚀', 'success');
        loadAppData();
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.error || 'Failed to connect Google Sheet', 'error');
      }
    } else {
      setShowGoogleModal(true);
    }
  };

  const handleBudgetSet = (data) => {
    setBudgetMode(data.budget_mode);
    setMonthlyBudget(parseFloat(data.monthly_budget) || 0);
    setCurrentBalance(parseFloat(data.current_balance) || 0);
    setFixedDailyBudget(parseFloat(data.fixed_daily_budget) || 0);
    setBalanceSetupDate(data.balance_setup_date);
    setGoogleConnected(data.google_connected);
    
    showToast(`Budget configuration updated successfully!`, 'success');
    if (!data.google_connected) {
      setShowGoogleModal(true);
    } else {
      loadAppData();
    }
  };

  const calculateStats = () => {
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    
    let top = '—';
    if (expenses.length) {
      const cats = {};
      expenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount));
      top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
    }

    const dailyTotals = {};
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
    const currentMonth = todayStr.slice(0, 7);

    expenses.forEach(e => {
      const isAfterSetup = budgetMode === 'monthly' ? e.date?.startsWith(currentMonth) : (!balanceSetupDate || e.date >= balanceSetupDate);
      if (e.date < todayStr && isAfterSetup) {
        const dStr = e.date;
        dailyTotals[dStr] = (dailyTotals[dStr] || 0) + parseFloat(e.amount);
      }
    });

    let budgetLimit = monthlyBudget;
    const currentMonthExpensesTotal = expenses
      .filter(e => e.date?.startsWith(currentMonth))
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    let remaining = monthlyBudget - currentMonthExpensesTotal;
    let dailyBudget = monthlyBudget / 30.0;
    
    if (budgetMode === 'balance') {
      budgetLimit = currentBalance;
      remaining = currentBalance - total;
      dailyBudget = fixedDailyBudget;
    }

    let totalSavings = 0;
    Object.keys(dailyTotals).forEach(dStr => {
      const dailyExp = dailyTotals[dStr];
      totalSavings += (dailyBudget - dailyExp);
    });

    return {
      budget: budgetLimit,
      total: budgetMode === 'monthly' ? currentMonthExpensesTotal : total,
      allTimeTotal: total,
      remaining,
      percent: budgetLimit > 0 ? Math.min(((budgetMode === 'monthly' ? currentMonthExpensesTotal : total) / budgetLimit) * 100, 100) : 0,
      count: expenses.length,
      top,
      totalSavings: Math.round(totalSavings * 100) / 100
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

  const activeStats = calculateStats();

  return (
    <div className="app-container">
      <Topbar 
        username={username}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenBudget={() => setShowBudgetModal(true)}
        onOpenGoogleConnect={() => setShowGoogleModal(true)}
        googleConnected={googleConnected}
        sheetUrl={sheetUrl}
        onConnectGoogle={handleConnectGoogle}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
      />

      <div className="app-body">
        <Sidebar 
          stats={activeStats}
          onAddExpense={handleAddExpense}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onClearFilter={handleClearFilter}
          budgetMode={budgetMode}
        />

        <div className="main-content" style={{ overflowY: 'auto' }}>
          <SheetView 
            sheetUrl={sheetUrl}
            googleConnected={googleConnected}
            onConnectGoogle={handleConnectGoogle}
          />

          <AnalyticsDashboard 
            expenses={expenses}
            monthlyBudget={activeStats.budget}
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
        initialMode={budgetMode}
        initialMonthlyBudget={monthlyBudget || ''}
        initialCurrentBalance={currentBalance || ''}
        initialFixedDailyBudget={fixedDailyBudget || ''}
        isNewMonth={isNewMonth}
        monthName={monthName}
      />

      <GoogleConnectModal 
        show={showGoogleModal}
        serviceAccountEmail={serviceAccountEmail}
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
