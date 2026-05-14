import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const BudgetModal = ({ show, onClose, onBudgetSet, initialValue = '' }) => {
  const [amount, setAmount] = useState(initialValue);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus();
    }
  }, [show]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!amount || parseFloat(amount) <= 0) {
      return setError('Please enter a valid budget amount.');
    }

    setLoading(true);
    try {
      const res = await api.post('/budget/update/', {
        monthly_budget: parseFloat(amount)
      });
      onBudgetSet(parseFloat(amount), res.data.google_connected);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set budget');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div id="budget-modal" className="show">
      <div className="budget-box">
        <div className="budget-icon">💰</div>
        <div className="budget-title">Set your <span>monthly<br/>budget</span></div>
        <div className="budget-sub">
          Welcome! Before you start, tell us your spending limit for this month. 
          We'll track your remaining balance after every expense and sync everything 
          to your personal Google Sheet automatically.
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="budget-input-wrap">
            <span className="currency">₹</span>
            <input 
              ref={inputRef}
              type="number" 
              placeholder="20000" 
              min="1" 
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="budget-hint" style={{ marginBottom: '1rem' }}>
            e.g. ₹<span>20,000</span> for the month
          </div>
          
          {error && <div className="budget-error">{error}</div>}
          
          <button className="btn-set-budget" type="submit" disabled={loading}>
            {loading ? 'Saving budget...' : 'Start Tracking →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;
