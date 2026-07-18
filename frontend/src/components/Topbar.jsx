import React from 'react';

const Topbar = ({ 
  username, 
  onLogout, 
  onDeleteAccount, 
  onSetBudget, 
  googleConnected, 
  sheetUrl, 
  onConnectGoogle,
  startDate,
  endDate,
  onDateChange
}) => {
  return (
    <div className="topbar">
      <div className="topbar-logo">expense<span>.</span>track</div>
      
      <div className="date-filter-bar" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.8rem', 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: '6px', 
        padding: '0.3rem 0.6rem' 
      }}>
        <span style={{ 
          fontSize: '0.65rem', 
          textTransform: 'uppercase', 
          color: 'var(--muted)', 
          letterSpacing: '0.05em', 
          fontFamily: "'Syne', sans-serif", 
          fontWeight: 700 
        }}>
          Filter Dates:
        </span>
        <input 
          type="date" 
          value={startDate} 
          onChange={e => onDateChange(e.target.value, endDate)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text)', 
            fontSize: '0.75rem', 
            outline: 'none', 
            fontFamily: "'DM Mono', monospace" 
          }}
        />
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>to</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={e => onDateChange(startDate, e.target.value)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text)', 
            fontSize: '0.75rem', 
            outline: 'none', 
            fontFamily: "'DM Mono', monospace" 
          }}
        />
        {(startDate || endDate) && (
          <button 
            onClick={() => onDateChange('', '')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--danger)', 
              cursor: 'pointer', 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              paddingLeft: '0.3rem' 
            }}
            title="Clear date filter"
          >
            ✕
          </button>
        )}
      </div>

      <div className="topbar-right">
        <button 
          className="btn-sheet" 
          onClick={onSetBudget}
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          set budget
        </button>
        
        {!googleConnected ? (
          <button className="btn-sheet" onClick={onConnectGoogle}>
            🔗 Connect Google
          </button>
        ) : (
          <a className="btn-sheet" href={sheetUrl} target="_blank" rel="noopener noreferrer">
            📊 View Sheet
          </a>
        )}
        
        <span className="user-badge">@{username}</span>
        
        <button className="btn-logout" onClick={onLogout}>logout</button>
        
        <button 
          className="btn-logout" 
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} 
          onClick={onDeleteAccount}
        >
          delete account
        </button>
      </div>
    </div>
  );
};

export default Topbar;

