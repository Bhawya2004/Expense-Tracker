import React, { useState } from 'react';

const GoogleConnectModal = ({ show, serviceAccountEmail, onConnect, onSkip }) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  const emailToUse = serviceAccountEmail || 'expense-tracker-bot@expense-tracker-496312.iam.gserviceaccount.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(emailToUse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    onConnect(sheetUrl.trim());
  };

  return (
    <div id="google-modal">
      <div className="budget-box" style={{ maxWidth: '500px' }}>
        <div className="budget-icon">🔗</div>
        <div className="budget-title">Connect <span>Google Sheet</span></div>
        <div className="budget-sub" style={{ textAlign: 'left', fontSize: '0.8rem', lineHeight: '1.4' }}>
          To sync your transactions, please follow these steps:
          <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
            <li>Create a new blank Google Sheet on your Google Drive.</li>
            <li>
              Share the sheet with: <strong style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={handleCopy} title="Click to copy">{emailToUse}</strong> as <strong style={{ color: 'var(--accent)' }}>Editor</strong>. {copied && <span style={{ color: '#34A853', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Copied!)</span>}
            </li>
            <li>Paste your Google Sheet link/URL below and click Connect.</li>
          </ol>
        </div>
        
        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem' }}>
          <div className="field">
            <label style={{ fontSize: '0.7rem' }}>Google Sheet URL / Link</label>
            <input 
              type="text" 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.6rem',
                color: 'var(--text)',
                fontSize: '0.8rem',
                fontFamily: "'DM Mono', monospace",
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-set-budget" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={!sheetUrl.trim()}
          >
            Link Google Sheet →
          </button>
        </form>
        
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
