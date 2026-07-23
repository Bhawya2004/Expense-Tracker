import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const BudgetModal = ({ 
  show, 
  onClose, 
  onBudgetSet, 
  initialMode = 'monthly',
  initialMonthlyBudget = '',
  initialCurrentBalance = '',
  initialFixedDailyBudget = ''
}) => {
  const [budgetMode, setBudgetMode] = useState(initialMode);
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(initialMonthlyBudget);
  const [currentBalanceInput, setCurrentBalanceInput] = useState(initialCurrentBalance);
  const [fixedDailyBudgetInput, setFixedDailyBudgetInput] = useState(initialFixedDailyBudget);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setBudgetMode(initialMode || 'monthly');
      setMonthlyBudgetInput(initialMonthlyBudget || '');
      setCurrentBalanceInput(initialCurrentBalance || '');
      setFixedDailyBudgetInput(initialFixedDailyBudget || '');
      setError('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [show, initialMode, initialMonthlyBudget, initialCurrentBalance, initialFixedDailyBudget]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    const payload = { budget_mode: budgetMode };
    if (budgetMode === 'monthly') {
      const budgetVal = parseFloat(monthlyBudgetInput);
      if (!monthlyBudgetInput || isNaN(budgetVal) || budgetVal <= 0) {
        return setError('Please enter a valid monthly budget amount.');
      }
      payload.monthly_budget = budgetVal;
    } else {
      const balVal = parseFloat(currentBalanceInput);
      const limitVal = parseFloat(fixedDailyBudgetInput);
      if (!currentBalanceInput || isNaN(balVal) || balVal < 0) {
        return setError('Please enter a valid current balance.');
      }
      if (!fixedDailyBudgetInput || isNaN(limitVal) || limitVal <= 0) {
        return setError('Please enter a valid fixed daily budget.');
      }
      payload.current_balance = balVal;
      payload.fixed_daily_budget = limitVal;
    }

    setLoading(true);
    try {
      const res = await api.post('/budget/update/', payload);
      onBudgetSet(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set budget config');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div id="budget-modal" className="show">
      <div className="budget-box" style={{ position: 'relative', maxWidth: '460px' }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1.2rem',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0.2rem',
            transition: 'color 0.2s',
            lineHeight: 1
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--muted)'}
          title="Close"
        >
          ✕
        </button>
        <div className="budget-icon">💰</div>
        <div className="budget-title">Set your <span>budget mode</span></div>
        <div className="budget-sub" style={{ marginBottom: '1.2rem' }}>
          Choose how you want to track your spending. You can set a standard monthly budget or enter your custom balance with a daily limit.
        </div>

        {/* Tab Selector */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.5rem', 
          border: '1px solid var(--border)', 
          borderRadius: '10px', 
          padding: '0.3rem', 
          background: 'var(--surface2)' 
        }}>
          <button
            type="button"
            onClick={() => { setBudgetMode('monthly'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              background: budgetMode === 'monthly' ? 'var(--accent)' : 'none',
              color: budgetMode === 'monthly' ? '#000' : 'var(--muted)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: budgetMode === 'monthly' ? '800' : '500',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              letterSpacing: '0.02em',
              transition: 'all 0.2s'
            }}
          >
            Monthly Budget
          </button>
          <button
            type="button"
            onClick={() => { setBudgetMode('balance'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem',
              background: budgetMode === 'balance' ? 'var(--accent)' : 'none',
              color: budgetMode === 'balance' ? '#000' : 'var(--muted)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: budgetMode === 'balance' ? '800' : '500',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              letterSpacing: '0.02em',
              transition: 'all 0.2s'
            }}
          >
            Balance & Daily Limit
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {budgetMode === 'monthly' ? (
            <>
              <div className="budget-input-wrap">
                <span className="currency">₹</span>
                <input 
                  ref={inputRef}
                  type="number" 
                  placeholder="20000" 
                  min="1" 
                  step="1"
                  value={monthlyBudgetInput}
                  onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                />
              </div>
              <div className="budget-hint" style={{ marginBottom: '1.5rem' }}>
                e.g. ₹<span>20,000</span> for the whole month
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Current Balance</label>
                  <div className="budget-input-wrap" style={{ marginBottom: 0 }}>
                    <span className="currency" style={{ fontSize: '1.1rem' }}>₹</span>
                    <input 
                      ref={inputRef}
                      type="number" 
                      placeholder="5000" 
                      min="0" 
                      step="1"
                      style={{ fontSize: '1.3rem', padding: '0.7rem 0.7rem 0.7rem 2.2rem', borderRadius: '8px' }}
                      value={currentBalanceInput}
                      onChange={(e) => setCurrentBalanceInput(e.target.value)}
                    />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Starting funds available right now</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Fixed Daily Budget</label>
                  <div className="budget-input-wrap" style={{ marginBottom: 0 }}>
                    <span className="currency" style={{ fontSize: '1.1rem' }}>₹</span>
                    <input 
                      type="number" 
                      placeholder="150" 
                      min="1" 
                      step="1"
                      style={{ fontSize: '1.3rem', padding: '0.7rem 0.7rem 0.7rem 2.2rem', borderRadius: '8px' }}
                      value={fixedDailyBudgetInput}
                      onChange={(e) => setFixedDailyBudgetInput(e.target.value)}
                    />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Maximum daily spending target</span>
                </div>
              </div>
            </>
          )}
          
          {error && <div className="budget-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          <button className="btn-set-budget" type="submit" disabled={loading}>
            {loading ? 'Saving configuration...' : 'Start Tracking →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;
