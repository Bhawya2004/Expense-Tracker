import React, { useState } from 'react';

const ExpenseList = ({ expenses, onDelete, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEditClick = (expense) => {
    setEditingId(expense.id);
    setEditData(expense);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = () => {
    onUpdate(editingId, editData);
    setEditingId(null);
  };

  const getColor = (cat) => {
    return {
      food: '#c8f135',
      transport: '#35d4f1',
      shopping: '#f135c8',
      health: '#f14235',
      entertainment: '#f1a035',
      bills: '#35a0f1',
      other: '#8b8b8b'
    }[cat] || '#8b8b8b';
  };

  const categories = [
    { id: 'food', label: 'Food' },
    { id: 'transport', label: 'Transport' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'health', label: 'Health' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'bills', label: 'Bills' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="expenses-container">
      <div className="expenses-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.25rem', fontWeight: 800 }}>All Expenses</h2>
        <span className="count-badge" style={{ opacity: 0.6 }}>{expenses.length} items</span>
      </div>

      <div className="expenses-list">
        {expenses.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="empty-icon">📭</div>
            <div className="empty-text">No expenses found. Add one from the sidebar!</div>
          </div>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="expense-card">
              <div 
                className="cat-dot" 
                style={{ 
                  background: getColor(exp.category),
                  boxShadow: `0 0 12px ${getColor(exp.category)}44`
                }}
              ></div>
              
              {editingId === exp.id ? (
                /* Edit Mode - Responsive Grid */
                <div className="expense-edit-mode" style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', width: '100%' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.6rem' }}>Description</label>
                      <input 
                        type="text" 
                        value={editData.description} 
                        onChange={e => setEditData({...editData, description: e.target.value})}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', width: '100%' }}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.6rem' }}>Amount (₹)</label>
                      <input 
                        type="number" 
                        value={editData.amount} 
                        onChange={e => setEditData({...editData, amount: e.target.value})}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', width: '100%' }}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.6rem' }}>Category</label>
                      <select 
                        value={editData.category} 
                        onChange={e => setEditData({...editData, category: e.target.value})}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', width: '100%' }}
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.6rem' }}>Date</label>
                      <input 
                        type="date" 
                        value={editData.date} 
                        onChange={e => setEditData({...editData, date: e.target.value})}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (err) {}
                        }}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={handleSave} className="btn-add" style={{ padding: '0.4rem 1.2rem', fontSize: '0.75rem' }}>SAVE CHANGES</button>
                    <button onClick={handleCancel} style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>CANCEL</button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="expense-info">
                    <div className="expense-desc">{exp.description || '—'}</div>
                    <div className="expense-meta">
                      <span>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="cat-tag" style={{ background: `${getColor(exp.category)}15`, color: getColor(exp.category), border: `1px solid ${getColor(exp.category)}33` }}>
                        {exp.category}
                      </span>
                    </div>
                  </div>
                  <div className="expense-amount">₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="expense-actions" style={{ display: 'flex', gap: '0.6rem', marginLeft: '1rem' }}>
                    <button className="btn-delete" onClick={() => handleEditClick(exp)} title="Edit">✏️</button>
                    <button className="btn-delete" onClick={() => onDelete(exp.id)} title="Delete">✕</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
