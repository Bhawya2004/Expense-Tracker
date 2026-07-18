import React, { useState } from 'react';

const Sidebar = ({ stats, onAddExpense, activeFilter, onFilterChange, onClearFilter }) => {
  const getToday = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'food',
    date: getToday(),
  });
  const [loading, setLoading] = useState(false);

  // Automatically update the date if it's currently set to "today" and the day rolls over
  React.useEffect(() => {
    const timer = setInterval(() => {
      const today = getToday();
      // Only auto-update if the user hasn't manually picked a different date
      setFormData(prev => {
        if (prev.date !== today && prev.amount === '' && prev.description === '') {
          return { ...prev, date: today };
        }
        return prev;
      });
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.date) return;
    
    setLoading(true);
    const success = await onAddExpense(formData);
    setLoading(false);
    
    if (success) {
      setFormData({
        ...formData,
        amount: '',
        description: '',
        date: getToday(), // Refresh the date to ensure it rolls over if past 12 AM
      });
    }
  };

  const categories = [
    { id: 'food', label: 'Food', emoji: '🍔' },
    { id: 'transport', label: 'Transport', emoji: '🚗' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍' },
    { id: 'health', label: 'Health', emoji: '💊' },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎮' },
    { id: 'bills', label: 'Bills', emoji: '🧾' },
    { id: 'other', label: 'Other', emoji: '📦' },
  ];

  return (
    <div className="sidebar">
      {/* Summary Section */}
      <div>
        <div className="section-title">Summary</div>
        <div className="stats-strip">
          <div className="stat-row">
            <span className="stat-label">monthly budget</span>
            <span className="stat-val">₹{stats.budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">total spent</span>
            <span className="stat-val big">₹{stats.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">remaining</span>
            <span className={`stat-val ${stats.remaining < 0 ? 'over-budget' : 'remaining'}`}>
              ₹{Math.abs(stats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {stats.remaining < 0 ? ' over!' : ''}
            </span>
          </div>
          <div className="budget-bar-track">
            <div 
              className={`budget-bar-fill ${stats.percent >= 100 ? 'danger' : stats.percent >= 75 ? 'warning' : ''}`}
              style={{ width: `${stats.percent}%` }}
            ></div>
          </div>
          <div className="stat-row" style={{ marginTop: '0.25rem' }}>
            <span className="stat-label">expenses</span>
            <span className="stat-val">{stats.count}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">top category</span>
            <span className="stat-val" style={{ textTransform: 'capitalize' }}>{stats.top || '—'}</span>
          </div>
        </div>
      </div>

      {/* Add Expense Section */}
      <div>
        <div className="section-title">Add Expense</div>
        <form className="add-form" onSubmit={handleSubmit}>
          <div className="field" style={{ margin: 0 }}>
            <label>Amount (₹)</label>
            <input 
              name="amount"
              type="number" 
              placeholder="0.00" 
              step="0.01" 
              min="0.01"
              value={formData.amount}
              onChange={handleChange}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Description</label>
            <input 
              name="description"
              type="text" 
              placeholder="e.g. Lunch at restaurant"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="row2">
            <div className="field" style={{ margin: 0 }}>
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Date</label>
              <input 
                name="date" 
                type="date" 
                value={formData.date} 
                onChange={handleChange} 
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
              />
            </div>
          </div>
          <button className="btn-add" type="submit" disabled={loading}>
            {loading ? 'Adding...' : '+ Add Expense'}
          </button>
        </form>
      </div>

      {/* Filter Section */}
      <div>
        <div className="section-title">Filter by Category</div>
        <div className="filter-group">
          {categories.map(cat => (
            <button 
              key={cat.id}
              className={`btn-filter ${activeFilter === cat.id ? 'active' : ''}`}
              onClick={() => onFilterChange(cat.id)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <button className="btn-clear-filter" onClick={onClearFilter}>
            ✕ clear filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
