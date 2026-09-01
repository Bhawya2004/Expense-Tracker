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
  const [monthlyHistories, setMonthlyHistories] = useState({});

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
      setMonthlyHistories(budgetData.monthly_histories || {});

      const currentMonth = new Date().toISOString().slice(0, 7);
      if (!budgetData.budget_mode || budgetData.budget_mode === 'monthly') {
        if (budgetData.is_new_month || !budgetData.budget_month || budgetData.budget_month !== currentMonth) {
          setIsNewMonth(true);
          setShowBudgetModal(true);
        } else {
          setIsNewMonth(false);
        }
      }

      loadExpenses(activeFilter, startDate, endDate);
    } catch (err) {
      if (err.response?.status === 404) {
        setIsNewMonth(true);
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
    setIsNewMonth(false);
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
    if (isNewMonth) {
      showToast('⚠️ Please set your new monthly budget first!', 'error');
      setShowBudgetModal(true);
      return false;
    }
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
    if (data.monthly_histories) setMonthlyHistories(data.monthly_histories);
    
    showToast(`Budget configuration updated successfully!`, 'success');
    if (!data.google_connected) {
      setShowGoogleModal(true);
    } else {
      loadAppData();
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(''); // '' means current active month

  const availableMonths = React.useMemo(() => {
    const set = new Set();
    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const calculateStats = (targetMonth = selectedMonth) => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
    const currentCalMonth = todayStr.slice(0, 7);

    // If viewing a specific past month
    if (targetMonth && targetMonth !== currentCalMonth) {
      const monthExpenses = expenses.filter(e => e.date?.startsWith(targetMonth));
      const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
      
      let top = '—';
      if (monthExpenses.length) {
        const cats = {};
        monthExpenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount));
        top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
      }

      // Retrieve exact recorded history for this month if available
      const history = monthlyHistories[targetMonth];
      let monthMode = history ? history.budget_mode : budgetMode;
      let monthBudgetLimit = 0;
      let monthDailyBudget = 0;

      if (history) {
        if (history.budget_mode === 'balance') {
          monthBudgetLimit = history.starting_balance;
          monthDailyBudget = history.fixed_daily_budget;
        } else {
          monthBudgetLimit = history.monthly_budget;
          monthDailyBudget = history.monthly_budget / 30.0;
        }
      } else {
        if (budgetMode === 'balance') {
          monthBudgetLimit = currentBalance;
          monthDailyBudget = fixedDailyBudget;
        } else {
          monthBudgetLimit = monthlyBudget;
          monthDailyBudget = monthlyBudget / 30.0;
        }
      }

      // Past month daily savings
      const dailyTotals = {};
      monthExpenses.forEach(e => {
        const dStr = e.date;
        dailyTotals[dStr] = (dailyTotals[dStr] || 0) + parseFloat(e.amount);
      });
      let monthSavings = 0;
      Object.keys(dailyTotals).forEach(dStr => {
        monthSavings += (monthDailyBudget - dailyTotals[dStr]);
      });

      return {
        isPastMonth: true,
        monthKey: targetMonth,
        budgetMode: monthMode,
        budget: monthBudgetLimit,
        total: monthTotal,
        allTimeTotal: expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
        remaining: monthBudgetLimit - monthTotal,
        percent: monthBudgetLimit > 0 ? Math.min((monthTotal / monthBudgetLimit) * 100, 100) : 0,
        count: monthExpenses.length,
        top,
        totalSavings: Math.round(monthSavings * 100) / 100
      };
    }

    // Active (current) month / cycle calculation
    const activeCycleExpenses = budgetMode === 'monthly'
      ? expenses.filter(e => e.date?.startsWith(currentCalMonth))
      : expenses.filter(e => (balanceSetupDate ? e.date >= balanceSetupDate : e.date?.startsWith(currentCalMonth)));

    const activeSpent = activeCycleExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const allTimeTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    let top = '—';
    if (activeCycleExpenses.length) {
      const cats = {};
      activeCycleExpenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount));
      top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
    }

    const dailyTotals = {};
    activeCycleExpenses.forEach(e => {
      if (e.date < todayStr) {
        const dStr = e.date;
        dailyTotals[dStr] = (dailyTotals[dStr] || 0) + parseFloat(e.amount);
      }
    });

    let budgetLimit = monthlyBudget;
    let remaining = monthlyBudget - activeSpent;
    let dailyBudget = monthlyBudget / 30.0;

    if (budgetMode === 'balance') {
      budgetLimit = currentBalance;
      remaining = currentBalance - activeSpent;
      dailyBudget = fixedDailyBudget;
    }

    let totalSavings = 0;
    Object.keys(dailyTotals).forEach(dStr => {
      const dailyExp = dailyTotals[dStr];
      totalSavings += (dailyBudget - dailyExp);
    });

    return {
      isPastMonth: false,
      monthKey: currentCalMonth,
      budget: budgetLimit,
      total: activeSpent,
      allTimeTotal,
      remaining,
      percent: budgetLimit > 0 ? Math.min((activeSpent / budgetLimit) * 100, 100) : 0,
      count: activeCycleExpenses.length,
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
  
  const currentCalMonthKey = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
  const activeCycleExpenses = budgetMode === 'monthly'
    ? expenses.filter(e => e.date?.startsWith(currentCalMonthKey))
    : expenses.filter(e => (balanceSetupDate ? e.date >= balanceSetupDate : e.date?.startsWith(currentCalMonthKey)));

  const displayedExpenses = selectedMonth 
    ? expenses.filter(e => e.date?.startsWith(selectedMonth))
    : activeCycleExpenses;

  return (
    <div className="app-container">
      <Topbar 
        username={username}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onSetBudget={() => setShowBudgetModal(true)}
        onOpenBudget={() => setShowBudgetModal(true)}
        onOpenGoogleConnect={() => setShowGoogleModal(true)}
        googleConnected={googleConnected}
        sheetUrl={sheetUrl}
        onConnectGoogle={handleConnectGoogle}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        currentMonthName={monthName}
      />

      {/* Historical Month Notice Banner - Clean & Matching System Theme */}
      {selectedMonth && selectedMonth !== currentCalMonthKey && (
        <div style={{
          background: '#121609',
          borderBottom: '1px solid rgba(200, 241, 53, 0.35)',
          color: '#C8F135',
          padding: '0.65rem 1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          fontFamily: "'Syne', sans-serif"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📜</span>
            <span style={{ color: '#E0E0E0' }}>
              Viewing Historical Insights for <strong style={{ color: '#C8F135' }}>{selectedMonth}</strong> ({activeStats.count} transactions • ₹{activeStats.total.toFixed(2)} spent)
            </span>
          </div>
          <button 
            onClick={() => setSelectedMonth('')}
            style={{
              background: '#C8F135',
              color: '#000000',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: "'Syne', sans-serif"
            }}
          >
            ← Back to Active Month
          </button>
        </div>
      )}

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
            expenses={displayedExpenses}
            monthlyBudget={activeStats.budget}
          />
          
          <ExpenseList 
            expenses={displayedExpenses}
            selectedMonth={selectedMonth}
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
        targetMonth={selectedMonth || ''}
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
