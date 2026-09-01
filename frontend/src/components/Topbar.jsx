import React from 'react';

const Topbar = ({ 
  username, 
  onLogout, 
  onDeleteAccount, 
  onSetBudget, 
  onOpenBudget,
  googleConnected, 
  sheetUrl, 
  onConnectGoogle,
  startDate,
  endDate,
  onDateChange,
  availableMonths = [],
  selectedMonth = '',
  onSelectMonth,
  currentMonthName = ''
}) => {
  const formatMonthName = (mStr) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    } catch (e) {
      return mStr;
    }
  };

  const todayMonthKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="topbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.8rem 1.8rem',
      background: '#0D0D0D',
      borderBottom: '1px solid #1E1E1E'
    }}>
      <div className="topbar-logo" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0 }}>
        expense<span style={{ color: 'var(--accent)' }}>.</span>track
      </div>
      
      {/* Center Controls: Month Filter + Date Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        {/* Month Selector Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: selectedMonth ? '#1A2209' : '#161616',
          border: selectedMonth ? '1px solid #C8F135' : '1px solid #282828',
          borderRadius: '8px',
          padding: '0.2rem 0.5rem',
          transition: 'all 0.2s ease'
        }}>
          <span style={{ fontSize: '0.75rem', marginRight: '0.3rem' }}>{selectedMonth ? '📜' : '🗓️'}</span>
          <select 
            value={selectedMonth || ''} 
            onChange={e => onSelectMonth && onSelectMonth(e.target.value)}
            style={{
              background: 'transparent',
              color: selectedMonth ? '#C8F135' : 'var(--text)',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              cursor: 'pointer',
              outline: 'none',
              paddingRight: '0.2rem'
            }}
          >
            <option value="" style={{ background: '#161616', color: '#FFF' }}>
              Active Month ({currentMonthName || 'Current'})
            </option>
            {availableMonths.filter(m => m !== todayMonthKey).map(m => (
              <option key={m} value={m} style={{ background: '#161616', color: '#FFF' }}>
                Past: {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter Bar */}
        <div className="date-filter-bar" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: '#161616', 
          border: '1px solid #282828', 
          borderRadius: '8px', 
          padding: '0.3rem 0.6rem' 
        }}>
          <span style={{ 
            fontSize: '0.62rem', 
            textTransform: 'uppercase', 
            color: 'var(--muted)', 
            letterSpacing: '0.06em', 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 700 
          }}>
            Date:
          </span>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => onDateChange(e.target.value, endDate)}
            onClick={(e) => {
              try {
                e.target.showPicker();
              } catch (err) {}
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text)', 
              fontSize: '0.72rem', 
              outline: 'none', 
              fontFamily: "'DM Mono', monospace",
              cursor: 'pointer'
            }}
          />
          <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>→</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => onDateChange(startDate, e.target.value)}
            onClick={(e) => {
              try {
                e.target.showPicker();
              } catch (err) {}
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text)', 
              fontSize: '0.72rem', 
              outline: 'none', 
              fontFamily: "'DM Mono', monospace",
              cursor: 'pointer'
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
                fontSize: '0.72rem', 
                fontWeight: 'bold', 
                padding: '0 0.2rem' 
              }}
              title="Clear date filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button 
          className="btn-sheet" 
          onClick={onSetBudget || onOpenBudget}
          style={{ 
            borderColor: 'var(--accent)', 
            color: 'var(--accent)',
            fontSize: '0.75rem',
            padding: '0.35rem 0.8rem',
            borderRadius: '6px'
          }}
        >
          Set Budget
        </button>
        
        {!googleConnected ? (
          <button 
            className="btn-sheet" 
            onClick={onConnectGoogle}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '6px' }}
          >
            🔗 Link Sheet
          </button>
        ) : (
          <a 
            className="btn-sheet" 
            href={sheetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', borderRadius: '6px' }}
          >
            📊 View Sheet
          </a>
        )}
        
        <span className="user-badge" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>@{username}</span>
        
        <button className="btn-logout" onClick={onLogout} style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem' }}>logout</button>
        
        <button 
          className="btn-logout" 
          style={{ borderColor: 'rgba(255, 79, 79, 0.4)', color: 'var(--danger)', fontSize: '0.72rem', padding: '0.35rem 0.6rem' }} 
          onClick={onDeleteAccount}
          title="Delete your account"
        >
          delete
        </button>
      </div>
    </div>
  );
};

export default Topbar;

