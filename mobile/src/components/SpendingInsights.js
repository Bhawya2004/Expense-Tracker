import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, getCategoryMeta } from '../theme/colors';

const SpendingInsights = ({
  expenses = [],
  monthlyBudget = 0,
  currentBalance = 0,
  budgetMode = 'monthly',
  todaySpent = 0,
  isCurrentMonth = true,
  monthName = 'This Month',
  fixedDailyBudget = 200,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const isMonthly = budgetMode === 'monthly';
  const effectiveBudget = isMonthly ? monthlyBudget : currentBalance;
  const totalMonthSpent = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const dailyLimit = isMonthly
    ? (effectiveBudget > 0 ? effectiveBudget / 30 : fixedDailyBudget)
    : fixedDailyBudget;

  const todayRemaining = Math.max(0, dailyLimit - todaySpent);
  const isTodayOver = dailyLimit > 0 && todaySpent > dailyLimit;

  // 1. Top Category
  const categoryTotals = {};
  expenses.forEach((e) => {
    const rawCat = (e.category || 'other').toLowerCase();
    const cat = rawCat === 'food' ? 'dining' : rawCat;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const [topCat, topCatAmount] = sortedCategories[0] || ['other', 0];
  const topCatMeta = getCategoryMeta(topCat);
  const topCatPercent = totalMonthSpent > 0 ? ((topCatAmount / totalMonthSpent) * 100).toFixed(0) : 0;

  // Past Month vs Current Month Logic
  const netSavings = Math.max(0, effectiveBudget - totalMonthSpent);
  const avgDailySpent = totalMonthSpent / 31;

  if (!isCurrentMonth) {
    // Completed historical month review (e.g. August 2026)
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💡</Text>
          <Text style={styles.headerTitle}>Financial Insights · {monthName}</Text>
        </View>

        <View style={styles.insightsList}>
          {/* Insight 1: Final Savings Summary */}
          <View style={styles.insightItem}>
            <View style={[styles.itemDot, { backgroundColor: COLORS.income }]} />
            <Text style={styles.itemText}>
              In {monthName}, you stayed within budget and saved{' '}
              <Text style={[styles.boldText, { color: COLORS.income }]}>
                ₹{netSavings.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>{' '}
              out of your ₹{effectiveBudget.toLocaleString('en-IN')} starting balance.
            </Text>
          </View>

          {/* Insight 2: Top Category */}
          {sortedCategories.length > 0 && totalMonthSpent > 0 && (
            <View style={styles.insightItem}>
              <View style={[styles.itemDot, { backgroundColor: topCatMeta.color }]} />
              <Text style={styles.itemText}>
                <Text style={styles.boldText}>{topCatMeta.emoji} {topCatMeta.label}</Text> was your highest spending area, taking{' '}
                <Text style={[styles.boldText, { color: topCatMeta.color }]}>{topCatPercent}%</Text> (₹{topCatAmount.toLocaleString('en-IN')}) of total expenses.
              </Text>
            </View>
          )}

          {/* Insight 3: Daily Limit Performance */}
          <View style={styles.insightItem}>
            <View style={[styles.itemDot, { backgroundColor: COLORS.brand }]} />
            <Text style={styles.itemText}>
              Your average daily spending was{' '}
              <Text style={styles.boldText}>₹{avgDailySpent.toFixed(0)}/day</Text>, remaining safely below your{' '}
              <Text style={[styles.boldText, { color: COLORS.brand }]}>₹{dailyLimit.toFixed(0)}/day</Text> daily limit target.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Current Active Month (September 2026)
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);
  const currentAvgDaily = totalMonthSpent / Math.max(1, dayOfMonth);
  const projectedEndMonthSpent = currentAvgDaily * daysInMonth;
  const projectedSavings = effectiveBudget > 0 ? Math.max(0, effectiveBudget - projectedEndMonthSpent) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💡</Text>
        <Text style={styles.headerTitle}>Smart Financial Insights</Text>
      </View>

      <View style={styles.insightsList}>
        {/* Insight 1: Today's Real-time Burn Rate */}
        <View style={styles.insightItem}>
          <View style={[styles.itemDot, { backgroundColor: isTodayOver ? COLORS.expense : COLORS.income }]} />
          <Text style={styles.itemText}>
            {isTodayOver ? (
              <>
                You have spent <Text style={[styles.boldText, { color: COLORS.expense }]}>₹{todaySpent.toFixed(0)}</Text> today, which is <Text style={[styles.boldText, { color: COLORS.expense }]}>₹{(todaySpent - dailyLimit).toFixed(0)} over</Text> your daily target (₹{dailyLimit.toFixed(0)}).
              </>
            ) : (
              <>
                Today's spending is <Text style={[styles.boldText, { color: COLORS.income }]}>₹{todaySpent.toFixed(0)}</Text>. You have <Text style={[styles.boldText, { color: COLORS.income }]}>₹{todayRemaining.toFixed(0)} remaining</Text> for today.
              </>
            )}
          </Text>
        </View>

        {/* Insight 2: Top Spending Category */}
        {sortedCategories.length > 0 && totalMonthSpent > 0 && (
          <View style={styles.insightItem}>
            <View style={[styles.itemDot, { backgroundColor: topCatMeta.color }]} />
            <Text style={styles.itemText}>
              <Text style={styles.boldText}>{topCatMeta.emoji} {topCatMeta.label}</Text> is your highest spending category, taking <Text style={[styles.boldText, { color: topCatMeta.color }]}>{topCatPercent}%</Text> (₹{topCatAmount.toLocaleString('en-IN')}) of total expenses this month.
            </Text>
          </View>
        )}

        {/* Insight 3: Month End Savings Forecast */}
        {effectiveBudget > 0 && (
          <View style={styles.insightItem}>
            <View style={[styles.itemDot, { backgroundColor: COLORS.info }]} />
            <Text style={styles.itemText}>
              At your current pace of <Text style={styles.boldText}>₹{currentAvgDaily.toFixed(0)}/day</Text>, your projected savings at month-end is <Text style={[styles.boldText, { color: COLORS.income }]}>₹{projectedSavings.toFixed(0)}</Text> ({daysRemaining} days left).
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 8,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  boldText: {
    color: COLORS.text,
    fontWeight: '700',
  },
});

export default SpendingInsights;
