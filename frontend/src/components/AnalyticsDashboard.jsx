import React, { useState } from 'react';

const AnalyticsDashboard = ({ expenses, monthlyBudget }) => {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

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

  const getEmoji = (cat) => {
    return {
      food: '🍔',
      transport: '🚗',
      shopping: '🛍',
      health: '💊',
      entertainment: '🎮',
      bills: '🧾',
      other: '📦'
    }[cat] || '📦';
  };

  // 1. Calculate Category breakdown
  const categoryTotals = {};
  let grandTotal = 0;
  expenses.forEach(e => {
    const amt = parseFloat(e.amount) || 0;
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
    grandTotal += amt;
  });

  const categoryStats = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      color: getColor(category),
      emoji: getEmoji(category)
    }))
    .sort((a, b) => b.amount - a.amount);

  // Compute SVG segments for Doughnut Chart
  let accumulatedPercent = 0;
  const doughnutRadius = 50;
  const circumference = 2 * Math.PI * doughnutRadius; // ~314.15

  const segments = categoryStats.map(stat => {
    const strokeOffset = circumference - (accumulatedPercent / 100) * circumference;
    const strokeLength = (stat.percentage / 100) * circumference;
    accumulatedPercent += stat.percentage;
    return { ...stat, strokeLength, strokeOffset };
  });

  // 2. Calculate Daily Trend (last 7 days of expenses)
  const getPastNDays = (n) => {
    const list = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  };

  const past7Days = getPastNDays(7);
  const dailyTotals = {};
  past7Days.forEach(date => {
    dailyTotals[date] = 0;
  });

  expenses.forEach(e => {
    if (dailyTotals[e.date] !== undefined) {
      dailyTotals[e.date] += parseFloat(e.amount) || 0;
    }
  });

  const trendData = past7Days.map(date => ({
    date,
    amount: dailyTotals[date],
    formattedDate: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }));

  const maxDailyAmount = Math.max(...trendData.map(d => d.amount), 1);

  return (
    <div className="analytics-dashboard" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* Category Breakdown (Doughnut Chart) */}
      <div className="analytics-card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--text)'
        }}>Category Distribution</h3>

        {expenses.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.85rem', height: '180px' }}>
            No expense data to analyze.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
              <svg width="150" height="150" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={doughnutRadius} fill="transparent" stroke="var(--surface2)" strokeWidth="10" />
                {segments.map((seg, idx) => {
                  const isHovered = hoveredCategory === seg.category;
                  return (
                    <circle
                      key={idx}
                      cx="60"
                      cy="60"
                      r={doughnutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 14 : 10}
                      strokeDasharray={`${seg.strokeLength} ${circumference}`}
                      strokeDashoffset={seg.strokeOffset}
                      transform="rotate(-90 60 60)"
                      onMouseEnter={() => setHoveredCategory(seg.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      style={{
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        transformOrigin: 'center'
                      }}
                    />
                  );
                })}
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>Total Spent</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', fontFamily: "'Syne', sans-serif" }}>
                  ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {categoryStats.map((stat) => (
                <div 
                  key={stat.category} 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    background: hoveredCategory === stat.category ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredCategory(stat.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>{stat.emoji}</span>
                    <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text)', fontWeight: 500 }}>{stat.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: stat.color }}>₹{stat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{stat.percentage.toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily Trend (Bar Chart) */}
      <div className="analytics-card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--text)'
        }}>Weekly Spending Trend</h3>

        <div style={{
          height: '150px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0.5rem 0.2rem',
          position: 'relative'
        }}>
          {trendData.map((d, index) => {
            const heightPercent = (d.amount / maxDailyAmount) * 100;
            const isHovered = hoveredBar === index;
            return (
              <div 
                key={d.date} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Bar */}
                <div style={{
                  width: '60%',
                  maxWidth: '30px',
                  height: `${Math.max(heightPercent, 2)}px`,
                  background: isHovered ? 'var(--accent)' : 'rgba(200, 241, 53, 0.25)',
                  border: isHovered ? '1px solid var(--accent)' : '1px solid rgba(200, 241, 53, 0.4)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}>
                  {/* Tooltip */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      bottom: '105%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.5rem',
                      zIndex: 10,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)' }}>₹{d.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{d.formattedDate}</div>
                    </div>
                  )}
                </div>

                {/* Date Label */}
                <span style={{
                  fontSize: '0.62rem',
                  color: 'var(--muted)',
                  marginTop: '0.5rem',
                  letterSpacing: '0.02em'
                }}>
                  {d.formattedDate}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
