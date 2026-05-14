import React, { useState } from 'react';

const SheetView = ({ sheetUrl, googleConnected, onConnectGoogle }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sheet-dropdown-container" style={{ marginBottom: '2rem' }}>
      <div 
        className="sheet-header-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.8rem 1.2rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem', opacity: 0.8 }}>📊</span>
          <span style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontSize: '0.9rem', 
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: 'var(--muted)'
          }}>
            GOOGLE SHEET VIEW
          </span>
          {isOpen && (
            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginLeft: '0.5rem', fontWeight: 600 }}>
              • LIVE SYNC ACTIVE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{isOpen ? 'Close' : 'Expand'}</span>
          <span 
            style={{ 
              fontSize: '0.8rem', 
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              color: isOpen ? 'var(--accent)' : 'var(--muted)'
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <div 
        className="sheet-dropdown-content"
        style={{
          maxHeight: isOpen ? '800px' : '0',
          overflow: 'hidden',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          marginTop: isOpen ? '1rem' : '0',
          opacity: isOpen ? 1 : 0
        }}
      >
        {googleConnected && sheetUrl ? (
          <div style={{ 
            height: '550px', 
            width: '100%', 
            border: '1px solid var(--border)', 
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
          }}>
            <iframe 
              key={sheetUrl}
              src={`${sheetUrl}/edit?widget=true&headers=false`}
              title="Google Sheet"
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            ></iframe>
          </div>
        ) : (
          <div style={{ 
            padding: '2.5rem', 
            background: 'var(--surface)', 
            borderRadius: '12px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--muted)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>🔗</div>
            <div style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Connect your Google account to enable real-time sheet sync and view your data here.</div>
            <button className="btn-sheet" onClick={onConnectGoogle}>🔗 Connect Google Account</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SheetView;
