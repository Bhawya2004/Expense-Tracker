import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

const BudgetCard = ({
  budgetMode = 'monthly',
  monthlyBudget = 0,
  currentBalance = 0,
  fixedDailyBudget = 0,
  todaySpent = 0,
  monthSpent = 0,
  onPressEdit
}) => {
  const isMonthly = budgetMode === 'monthly';
  const effectiveMonthBudget = isMonthly ? monthlyBudget : currentBalance;

  // Daily limit target
  const dailyTarget = isMonthly
    ? (effectiveMonthBudget > 0 ? (effectiveMonthBudget / 30) : 0)
    : fixedDailyBudget;

  const todayRemaining = Math.max(0, dailyTarget - todaySpent);
  const isTodayExceeded = dailyTarget > 0 && todaySpent > dailyTarget;

  // Month progress
  const monthRemaining = effectiveMonthBudget - monthSpent;
  const monthSpentPercent = effectiveMonthBudget > 0
    ? Math.min((monthSpent / effectiveMonthBudget) * 100, 100)
    : 0;
  const isMonthExceeded = monthRemaining < 0;

  // Color coding status
  const getStatusColor = () => {
    if (isTodayExceeded || isMonthExceeded) return COLORS.red;
    if (todaySpent > dailyTarget * 0.8 || monthSpentPercent > 80) return COLORS.warning;
    return COLORS.lime;
  };

  const getStatusLabel = () => {
    if (isTodayExceeded || isMonthExceeded) return '🚨 Over Limit';
    if (todaySpent > dailyTarget * 0.8 || monthSpentPercent > 80) return '⚠️ Near Limit';
    return '✅ On Track';
  };

  const statusColor = getStatusColor();
  const statusLabel = getStatusLabel();

  return (
    <View style={[styles.card, { borderColor: isTodayExceeded ? 'rgba(239, 68, 68, 0.4)' : 'rgba(35, 39, 58, 0.9)' }]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>
            {isMonthly ? '🗓️ Monthly Budget' : '⚖️ Balance & Limit'}
          </Text>
        </View>

        <View style={styles.topRightRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <TouchableOpacity onPress={onPressEdit} style={styles.editBtn}>
            <Text style={styles.editText}>Edit ⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Focus: TODAY'S SPENDING vs MONTH BUDGET */}
      <View style={styles.mainMetricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Today's Spent</Text>
          <Text style={[styles.mainAmount, { color: isTodayExceeded ? COLORS.red : COLORS.text }]}>
            ₹{todaySpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.metricSub}>
            Daily Target: ₹{dailyTarget.toFixed(0)}/day
          </Text>
        </View>

        <View style={[styles.metricCol, styles.rightMetricCol]}>
          <Text style={styles.metricLabel}>Month's Budget</Text>
          <Text style={styles.secondaryAmount}>
            ₹{effectiveMonthBudget.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.metricSub}>
            Month Spent: ₹{monthSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Month Spending Progress Track */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressTitle}>Monthly Budget Consumed</Text>
          <Text style={[styles.progressPercent, { color: statusColor }]}>
            {monthSpentPercent.toFixed(1)}% Used
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(monthSpentPercent, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Footer Info Box */}
      <View style={styles.footerRow}>
        <View style={styles.footerCol}>
          <Text style={styles.footerSubLabel}>Today's Remaining</Text>
          <Text style={[styles.footerValue, { color: todayRemaining > 0 ? COLORS.lime : COLORS.red }]}>
            ₹{todayRemaining.toFixed(0)}
          </Text>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.footerCol}>
          <Text style={styles.footerSubLabel}>Month's Remaining</Text>
          <Text style={[styles.footerValue, { color: monthRemaining >= 0 ? COLORS.text : COLORS.red }]}>
            ₹{monthRemaining.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modeBadge: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  editBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  mainMetricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCol: {
    flex: 1,
  },
  rightMetricCol: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  mainAmount: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  secondaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(35, 39, 58, 0.6)',
  },
  footerCol: {
    flex: 1,
    alignItems: 'center',
  },
  footerSubLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
});

export default BudgetCard;
