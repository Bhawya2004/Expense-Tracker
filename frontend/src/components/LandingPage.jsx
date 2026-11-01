import React, { useState } from 'react';
import './LandingPage.css';

// ── DEFAULT GOOGLE DRIVE APK DOWNLOAD LINK ──
// Replace this with your Google Drive shareable link for the ExpenseTrack APK!
export const DEFAULT_DRIVE_APK_URL = 'https://drive.google.com/file/d/YOUR_GOOGLE_DRIVE_APK_ID/view?usp=sharing';

const LandingPage = ({ onLogin, onSignUp, onLaunchApp, isLoggedIn = false, username = '' }) => {
  const [activeFaq, setActiveFaq] = useState(0);
  const [driveUrl] = useState(() => {
    return localStorage.getItem('custom_apk_drive_url') || DEFAULT_DRIVE_APK_URL;
  });

  const faqs = [
    {
      q: 'Why should I use ExpenseTrack over regular budgeting apps?',
      a: 'Most finance apps lock your transactions inside their closed database or charge a monthly subscription. ExpenseTrack mirrors every single transaction directly to your personal Google Sheet in real-time. You own your raw data forever, complete with automatic formulas, category highlighting, and daily surplus tracking.'
    },
    {
      q: 'How does the Google Sheets integration work?',
      a: 'When you sign in with Google, ExpenseTrack automatically creates and authorizes a private Google Sheet in your personal Google Drive. Every time you log an expense from the web or the Android app, our background engine updates your sheet formulas instantly without blocking the UI.'
    },
    {
      q: 'What are the two budget modes?',
      a: 'ExpenseTrack supports: (1) Standard Monthly Budget — dividing your total allowance into 30 daily goals, and (2) Balance Onboarding Mode — designed for starting mid-month with your exact current bank balance and a fixed daily burn target.'
    },
    {
      q: 'Is the Android Mobile App included and synced with the Web?',
      a: 'Yes! Our native mobile app (built with React Native & Expo) connects to the same backend. Any expense added while you are outdoors immediately reflects on your web dashboard and your Google Sheet.'
    },
    {
      q: 'How do I install the Android APK on my phone?',
      a: 'Click "Download Android APK", open the file in your Google Drive or Downloads folder on your Android phone, tap "Install", and grant "Install Unknown Apps" permission. Once installed, log in with your account to start tracking!'
    }
  ];

  return (
    <div className="landing-page">
      <div className="landing-bg-glow" />

      {/* ── TOPBAR / NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            expense<span>.</span>track
          </div>

          <ul className="landing-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#why-us">Why Us</a></li>
            <li><a href="#mobile-app">Mobile APK</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>

          <div className="landing-nav-actions">
            <a 
              className="btn-apk-outline" 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Download Android APK"
            >
              <span>🤖</span>
              <span>Download APK</span>
            </a>

            {isLoggedIn ? (
              <button className="btn-launch-nav" onClick={onLaunchApp}>
                Dashboard ({username}) →
              </button>
            ) : (
              <>
                <button className="btn-nav-login" onClick={onLogin}>
                  Login
                </button>
                <button className="btn-launch-nav" onClick={onSignUp}>
                  Sign Up →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="landing-container">
        {/* ── HERO SECTION ── */}
        <section className="landing-hero">
          <div className="hero-pill">
            <span className="hero-pill-badge">NEW</span>
            <span>Real-Time Google Sheets Sync & Android APK Available</span>
          </div>

          <h1 className="hero-headline">
            Master Your Money.<br />
            <span className="highlight-accent">Synced Live to Google Sheets.</span>
          </h1>

          <p className="hero-subheadline">
            The high-performance expense tracker built with dual budgeting modes, intelligent daily savings calculations, and full cross-platform access via Web and Android.
          </p>

          <div className="hero-cta-group">
            {isLoggedIn ? (
              <button className="btn-hero-primary" onClick={onLaunchApp}>
                <span>Go to Dashboard</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button className="btn-hero-primary" onClick={onSignUp}>
                  <span>Sign Up Free</span>
                  <span>→</span>
                </button>
                <button className="btn-hero-secondary" onClick={onLogin}>
                  <span>Login</span>
                </button>
              </>
            )}

            <a 
              className="btn-hero-secondary" 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span style={{ fontSize: '1.2rem' }}>📱</span>
              <span>Download Android APK</span>
            </a>
          </div>

          <div className="hero-trust-bar">
            <div className="hero-trust-item">
              <span style={{ color: 'var(--accent)' }}>✓</span>
              <span>Two-Way Google Sheets Mirror</span>
            </div>
            <div className="hero-trust-item">
              <span style={{ color: 'var(--accent)' }}>✓</span>
              <span>100% Private (Your Google Drive)</span>
            </div>
            <div className="hero-trust-item">
              <span style={{ color: 'var(--accent)' }}>✓</span>
              <span>Dual Budget Pacing Engine</span>
            </div>
            <div className="hero-trust-item">
              <span style={{ color: 'var(--accent)' }}>✓</span>
              <span>Zero Subscription Fees</span>
            </div>
          </div>

          {/* ── LIVE INTERACTIVE DASHBOARD SHOWCASE ── */}
          <div className="mockup-wrapper">
            <div className="mockup-header">
              <div className="mockup-dots">
                <div className="mockup-dot red" />
                <div className="mockup-dot yellow" />
                <div className="mockup-dot green" />
              </div>
              <div className="mockup-badge-live">
                <div className="mockup-pulse" />
                <span>Google Sheet: Real-Time Synced</span>
              </div>
            </div>

            <div className="mockup-grid">
              <div className="mockup-card">
                <div className="mockup-card-title">Monthly Budget Pacing</div>
                <div className="mockup-card-value">₹28,450 <span style={{ fontSize: '0.9rem', color: '#777' }}>/ ₹45,000</span></div>
                <div className="mockup-progress-bar">
                  <div className="mockup-progress-fill" style={{ width: '63%' }} />
                </div>
                <div className="mockup-subtext">₹16,550 safe to spend • ₹1,500/day target</div>
              </div>

              <div className="mockup-card">
                <div className="mockup-card-title">Total Daily Savings</div>
                <div className="mockup-card-value" style={{ color: 'var(--accent)' }}>+₹3,820</div>
                <div className="mockup-subtext">You stayed under daily budget on 18 out of 22 days 🎉</div>
              </div>

              <div className="mockup-card">
                <div className="mockup-card-title">Top Expense Category</div>
                <div className="mockup-card-value">Food & Dining</div>
                <div className="mockup-subtext">₹11,200 (39% of total spending)</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY US / VALUE PROPOSITION SECTION ── */}
        <section id="why-us" className="landing-section">
          <span className="section-tag">Why Choose ExpenseTrack</span>
          <h2 className="section-title">Built for People Who Want True Ownership of Their Money</h2>
          <p className="section-desc">
            Most expense tracking apps trap your data in their cloud so you can never leave. We built ExpenseTrack with radical data transparency:
          </p>

          <div className="compare-grid">
            <div className="compare-card others">
              <div className="compare-header">
                <h3 style={{ fontFamily: 'Syne', fontSize: '1.25rem', fontWeight: 800 }}>Standard Apps</h3>
                <span className="compare-badge others">The Old Way</span>
              </div>
              <ul className="compare-list">
                <li className="compare-item">
                  <span className="icon-bad">✕</span>
                  <span>Your financial data is locked in their proprietary servers.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-bad">✕</span>
                  <span>Charge \$5–\$12/month just for basic chart breakdowns.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-bad">✕</span>
                  <span>No integration with spreadsheets you already use and love.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-bad">✕</span>
                  <span>Rigid 1st-of-the-month cycles that fail if you start mid-month.</span>
                </li>
              </ul>
            </div>

            <div className="compare-card us">
              <div className="compare-header">
                <h3 style={{ fontFamily: 'Syne', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>ExpenseTrack</h3>
                <span className="compare-badge us">The Smart Way</span>
              </div>
              <ul className="compare-list">
                <li className="compare-item">
                  <span className="icon-good">✓</span>
                  <span><strong>Private Google Sheet Sync:</strong> Transactions are written to your personal Google Drive in real-time.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-good">✓</span>
                  <span><strong>100% Free & Open:</strong> Full analytics, interactive charts, and zero paywalls.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-good">✓</span>
                  <span><strong>Dual Budget Modes:</strong> Standard monthly or custom starting balance for mid-month onboarding.</span>
                </li>
                <li className="compare-item">
                  <span className="icon-good">✓</span>
                  <span><strong>Cross-Platform Parity:</strong> Premium web dashboard + Native Android APK for seamless logging anywhere.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── CORE FEATURES GRID ── */}
        <section id="features" className="landing-section">
          <span className="section-tag">Core Features</span>
          <h2 className="section-title">Everything You Need to Take Control of Your Expenses</h2>
          <p className="section-desc">
            Engineered with Django REST Framework, modern React, and Google APIs for speed, security, and precision.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">📊</div>
              <h3 className="feature-title">Live Google Sheets Sync</h3>
              <p className="feature-desc">
                Never manually export CSVs again. Every addition, deletion, and edit mirrors straight into your custom spreadsheet with auto-calculated formulas.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🎯</div>
              <h3 className="feature-title">Daily Budget Pacing</h3>
              <p className="feature-desc">
                Know exactly how much you can spend today. Dynamic daily budget alerts turn soft-red when you exceed today's target and reward under-spending.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">⚖️</div>
              <h3 className="feature-title">Dual Budget Modes</h3>
              <p className="feature-desc">
                Pick standard monthly budgeting with 30-day divisions or use custom balance tracking with a fixed daily limit when onboarding midway through a month.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">📈</div>
              <h3 className="feature-title">Interactive Charts</h3>
              <p className="feature-desc">
                Explore your spending habits with interactive category doughnut charts, cash flow bars, and date-range filters to spot spending leaks.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">🔒</div>
              <h3 className="feature-title">Unified Google OAuth</h3>
              <p className="feature-desc">
                Sign in with one click via Google. Your Google Drive spreadsheet authorization and user account are established simultaneously.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">📱</div>
              <h3 className="feature-title">Mobile App Included</h3>
              <p className="feature-desc">
                Log expenses on the street in less than 3 taps. Download the native Android APK and keep your budget in your pocket.
              </p>
            </div>
          </div>
        </section>

        {/* ── DEDICATED MOBILE APK SECTION ── */}
        <section id="mobile-app" className="landing-section">
          <div className="mobile-section-card">
            <div>
              <div className="mobile-badge">
                <span>🤖</span>
                <span>Native Android Build (APK)</span>
              </div>

              <h2 className="mobile-title">
                Keep ExpenseTrack in Your Pocket.
              </h2>

              <p className="mobile-desc">
                Log transactions on the go in 3 seconds. Built with React Native & Expo, our Android APK connects to the exact same cloud database and Google Sheet.
              </p>

              <div className="mobile-steps">
                <div className="mobile-step">
                  <div className="mobile-step-num">1</div>
                  <span>Download the APK file directly to your Android device.</span>
                </div>
                <div className="mobile-step">
                  <div className="mobile-step-num">2</div>
                  <span>Open your notification or Downloads and tap <strong>Install</strong>.</span>
                </div>
                <div className="mobile-step">
                  <div className="mobile-step-num">3</div>
                  <span>Log in with your existing account — all your past data & Google Sheet appear instantly!</span>
                </div>
              </div>

              <div className="mobile-cta-box">
                <a 
                  className="btn-apk-download" 
                  href={driveUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <span style={{ fontSize: '1.4rem' }}>⬇️</span>
                  <span>Download Android APK (v1.0)</span>
                </a>
                <div className="apk-meta-info">
                  Version 1.0.0 • Android 8.0+ • Direct Google Drive Link
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup Frame */}
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="phone-notch" />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'Syne', color: 'var(--accent)' }}>expense.track</span>
                    <span style={{ fontSize: '0.65rem', background: '#222', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Active</span>
                  </div>
                  <div style={{ background: '#1c1c1c', borderRadius: '10px', padding: '0.9rem', marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#888' }}>TODAY'S SPENT</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Syne', color: '#fff' }}>₹420</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>Daily Limit: ₹1,500</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ background: '#181818', padding: '0.6rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span>☕ Coffee & Snacks</span>
                      <strong>₹120</strong>
                    </div>
                    <div style={{ background: '#181818', padding: '0.6rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span>🚕 Uber Ride</span>
                      <strong>₹300</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', background: 'var(--accent)', color: '#000', padding: '0.55rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem', fontFamily: 'Syne' }}>
                  + Quick Add Expense
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section id="faq" className="landing-section">
          <span className="section-tag">Frequently Asked Questions</span>
          <h2 className="section-title">Got Questions? We Have Answers.</h2>
          <p className="section-desc">
            Everything you need to know about ExpenseTrack, Google Sheets sync, and the mobile APK.
          </p>

          <div className="faq-grid">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="faq-item"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                >
                  <div className="faq-question">
                    <span>{faq.q}</span>
                    <span className="faq-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                      ▾
                    </span>
                  </div>
                  {isOpen && (
                    <div className="faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FINAL CTA BANNER ── */}
        <section className="landing-section" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>
            Ready to Take Control of Your Financial Freedom?
          </h2>
          <p className="section-desc" style={{ margin: '0 auto 2.5rem' }}>
            Start logging your expenses with real-time Google Sheets sync and daily pacing today.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isLoggedIn ? (
              <button className="btn-hero-primary" onClick={onLaunchApp}>
                <span>Go to Dashboard</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button className="btn-hero-primary" onClick={onSignUp}>
                  <span>Sign Up Free</span>
                  <span>→</span>
                </button>
                <button className="btn-hero-secondary" onClick={onLogin}>
                  <span>Login</span>
                </button>
              </>
            )}
            <a 
              className="btn-hero-secondary" 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span>📱</span>
              <span>Download Android APK</span>
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="landing-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              expense<span>.</span>track
            </div>

            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#why-us">Why Us</a></li>
              <li><a href="#mobile-app">Mobile APK</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>

            <div style={{ color: '#777', fontSize: '0.78rem' }}>
              Built with React, Django REST Framework, and Google Sheets API.
            </div>
          </div>
          <div>
            © {new Date().getFullYear()} ExpenseTrack. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
