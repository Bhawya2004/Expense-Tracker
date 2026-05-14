import React from 'react';

const Topbar = ({ username, onLogout, onDeleteAccount, onSetBudget, googleConnected, sheetUrl, onConnectGoogle }) => {
  return (
    <div className="topbar">
      <div className="topbar-logo">expense<span>.</span>track</div>
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
