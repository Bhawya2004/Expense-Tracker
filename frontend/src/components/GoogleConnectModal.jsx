import React from 'react';

const GoogleConnectModal = ({ show, onConnect, onSkip }) => {
  if (!show) return null;

  return (
    <div id="google-modal">
      <div className="budget-box">
        <div className="budget-icon">🔗</div>
        <div className="budget-title">Connect <span>Google<br/>Account</span></div>
        <div className="budget-sub">
          To create your personal expense sheet, we need access to your Google Drive. 
          Click below to sign in with Google — your sheet will be created automatically in your own Drive.
        </div>
        
        <button className="btn-set-budget" onClick={onConnect}>
          🔑 Sign in with Google →
        </button>
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button 
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleConnectModal;
