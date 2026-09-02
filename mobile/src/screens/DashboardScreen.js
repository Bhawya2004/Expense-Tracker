import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

import Header from '../components/Header';
import CategoryDonutChart from '../components/CategoryDonutChart';
import ExpenseItem from '../components/ExpenseItem';
import ExpenseModal from '../components/ExpenseModal';
import BudgetModal from '../components/BudgetModal';
import GoogleConnectModal from '../components/GoogleConnectModal';
import Toast from '../components/Toast';

const formatMonthYear = (dateObj) => {
  return dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const getTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DashboardScreen = ({ navigation }) => {
  const { user, refreshTrigger, addExpense } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [activeDate, setActiveDate] = useState(new Date());

  // Budget & App State
  const [budgetMode, setBudgetMode] = useState('monthly');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [fixedDailyBudget, setFixedDailyBudget] = useState(0);
  const [monthlyHistories, setMonthlyHistories] = useState({});
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [expenses, setExpenses] = useState([]);

  // UI States
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const isLoadingRef = useRef(false);

  const triggerToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3500);
  };

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const [budgetRes, expRes] = await Promise.all([
        api.get('/budget/'),
        api.get('/expenses/'),
      ]);

      const bData = budgetRes.data;
      setBudgetMode(bData.budget_mode || 'monthly');
      setMonthlyBudget(parseFloat(bData.monthly_budget) || 0);
      setCurrentBalance(parseFloat(bData.current_balance) || 0);
      setFixedDailyBudget(parseFloat(bData.fixed_daily_budget) || 0);
      setMonthlyHistories(bData.monthly_histories || {});
      setGoogleConnected(bData.google_connected);
      setSheetUrl(bData.sheet_url);
      setServiceAccountEmail(bData.service_account_email || '');
      setExpenses(expRes.data || []);
    } catch (err) {
      console.warn('Dashboard loadData error:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [refreshTrigger, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    triggerToast('Data synchronized');
  };

  const handlePrevMonth = () => {
    setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const activeMonthKey = useMemo(() => {
    const y = activeDate.getFullYear();
    const m = String(activeDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [activeDate]);

  const todayIso = getTodayIso();
  const currentMonthKey = todayIso.slice(0, 7);
  const isCurrentMonth = activeMonthKey === currentMonthKey;

  // Filter expenses strictly for the active month
  const activeMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(activeMonthKey));
  }, [expenses, activeMonthKey]);

  const totalSpent = useMemo(() => {
    return activeMonthExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  }, [activeMonthExpenses]);

  // Resolve budget for active month:
  const startingBudget = useMemo(() => {
    const hist = monthlyHistories[activeMonthKey];
    if (hist && !isCurrentMonth) {
      return hist.budget_mode === 'monthly'
        ? (hist.monthly_budget || 0)
        : (hist.starting_balance || hist.monthly_budget || 0);
    }
    const isBhawya = user?.username?.toLowerCase() === 'bhawya' || user?.email?.includes('bfreestorage');
    if (activeMonthKey === '2026-08' && isBhawya) {
      return 5478;
    }
    return budgetMode === 'monthly' ? monthlyBudget : currentBalance;
  }, [activeMonthKey, isCurrentMonth, monthlyHistories, budgetMode, monthlyBudget, currentBalance, user]);

  const remainingBalance = Math.max(0, startingBudget - totalSpent);
  const spentPercent = startingBudget > 0 ? Math.min(100, (totalSpent / startingBudget) * 100) : 0;

  // Daily Allowance Calculation
  const dailyTarget = useMemo(() => {
    const hist = monthlyHistories[activeMonthKey];
    if (hist && !isCurrentMonth) return hist.fixed_daily_budget || 200;
    const isBhawya = user?.username?.toLowerCase() === 'bhawya' || user?.email?.includes('bfreestorage');
    if (activeMonthKey === '2026-08' && isBhawya) return 200;
    return fixedDailyBudget > 0 ? fixedDailyBudget : (budgetMode === 'monthly' && monthlyBudget > 0 ? Math.round(monthlyBudget / 30) : 200);
  }, [activeMonthKey, isCurrentMonth, monthlyHistories, fixedDailyBudget, budgetMode, monthlyBudget, user]);

  const todaySpent = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayIso)
      .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
  }, [expenses, todayIso]);

  const todayRemaining = Math.max(0, dailyTarget - todaySpent);
  const isTodayOver = todaySpent > dailyTarget;
  const todayUsagePercent = Math.min(100, (todaySpent / dailyTarget) * 100);

  // Days left in current month
  const daysLeftInMonth = useMemo(() => {
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, totalDays - now.getDate());
  }, []);

  // Recent 3 transactions
  const recentTransactions = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
      .slice(0, 3);
  }, [expenses]);

  const monthLabel = formatMonthYear(activeDate);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      {/* Clean Header */}
      <Header username={user?.username} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        {/* 1. Main Hero Card: Available Balance & Budget Status */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSubHeader}>AVAILABLE BALANCE</Text>
              <Text style={styles.heroBalanceAmount}>
                ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
            </View>

            {/* Month Switcher Pill */}
            <View style={styles.monthPill}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
                <Text style={styles.monthArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthPillText}>{monthLabel}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                <Text style={styles.monthArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Utilization Progress Bar */}
          <View style={styles.budgetProgressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabelLeft}>
                Spent: ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({spentPercent.toFixed(0)}%)
              </Text>
              <Text style={styles.progressLabelRight}>
                Budget: ₹{startingBudget.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBarFill, { width: `${spentPercent}%` }]} />
            </View>
          </View>

          {/* Quick Metrics Sub-row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Starting Budget</Text>
              <Text style={styles.metricVal}>
                ₹{startingBudget.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>Total Spent</Text>
              <Text style={[styles.metricVal, { color: COLORS.expense }]}>
                ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricSub}>{isCurrentMonth ? 'Days Left' : 'Status'}</Text>
              <Text style={[styles.metricVal, { color: COLORS.brand }]}>
                {isCurrentMonth ? `${daysLeftInMonth} days` : 'Archived'}
              </Text>
            </View>
          </View>

          {/* Action Quick Shortcuts */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtnPrimary}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickActionBtnPrimaryText}>+ Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtnSecondary}
              onPress={() => setShowBudgetModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickActionBtnSecondaryText}>⚖️ Set Budget</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtnSecondary}
              onPress={() => setShowGoogleModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickActionBtnSecondaryText}>📊 Sheet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Today's Safe Spend & Daily Allowance Card */}
        {isCurrentMonth && (
          <View style={styles.allowanceCard}>
            <View style={styles.allowanceHeaderRow}>
              <View>
                <Text style={styles.allowanceLabel}>DAILY ALLOWANCE</Text>
                <Text style={[styles.allowanceAmount, { color: isTodayOver ? COLORS.expense : COLORS.income }]}>
                  ₹{todayRemaining.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.allowanceSub}>
                  {isTodayOver ? 'Exceeded daily target' : 'Safe to spend today'}
                </Text>
              </View>
              <View
                style={[
                  styles.allowanceBadge,
                  { backgroundColor: isTodayOver ? COLORS.expenseAlpha : COLORS.incomeAlpha },
                ]}
              >
                <Text
                  style={[
                    styles.allowanceBadgeText,
                    { color: isTodayOver ? COLORS.expense : COLORS.income },
                  ]}
                >
                  {isTodayOver ? '⚠️ Over Target' : '✨ On Track'}
                </Text>
              </View>
            </View>

            {/* Daily Allowance Progress Track */}
            <View style={styles.allowanceTrack}>
              <View
                style={[
                  styles.allowanceFill,
                  {
                    width: `${todayUsagePercent}%`,
                    backgroundColor: isTodayOver ? COLORS.expense : COLORS.brand,
                  },
                ]}
              />
            </View>

            <View style={styles.allowanceFooterRow}>
              <Text style={styles.allowanceFooterText}>
                Spent today: <Text style={styles.boldWhite}>₹{todaySpent.toFixed(0)}</Text>
              </Text>
              <Text style={styles.allowanceFooterText}>
                Target: <Text style={styles.boldWhite}>₹{dailyTarget.toFixed(0)}/day</Text>
              </Text>
            </View>
          </View>
        )}

        {/* 3. Category Breakdown Donut */}
        <CategoryDonutChart
          expenses={activeMonthExpenses}
          onSelectCategory={(cat) => {
            navigation.navigate('Activity', { filterCategory: cat });
          }}
        />

        {/* 4. Recent Transactions Feed */}
        {recentTransactions.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentTitle}>Recent Activity</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Activity')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllLink}>View all ›</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.map((item) => (
              <ExpenseItem
                key={item.id}
                expense={item}
                onPress={() => navigation.navigate('Activity')}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Expense Modal */}
      <ExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (payload) => {
          await addExpense(payload);
          await loadData();
        }}
      />

      {/* Budget Modal */}
      <BudgetModal
        visible={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false);
          loadData();
        }}
        onSave={async (bData) => {
          await api.post('/budget/update/', { ...bData, target_month: activeMonthKey });
          loadData();
        }}
        monthLabel={monthLabel}
        initialBudgetMode={
          (!isCurrentMonth && monthlyHistories[activeMonthKey])
            ? (monthlyHistories[activeMonthKey].budget_mode || budgetMode)
            : budgetMode
        }
        initialMonthlyBudget={
          (!isCurrentMonth && monthlyHistories[activeMonthKey])
            ? monthlyHistories[activeMonthKey].monthly_budget
            : monthlyBudget
        }
        initialCurrentBalance={
          (!isCurrentMonth && monthlyHistories[activeMonthKey])
            ? monthlyHistories[activeMonthKey].starting_balance
            : currentBalance
        }
        initialFixedDailyBudget={
          (!isCurrentMonth && monthlyHistories[activeMonthKey])
            ? monthlyHistories[activeMonthKey].fixed_daily_budget
            : fixedDailyBudget
        }
      />

      {/* Google Connect Modal */}
      <GoogleConnectModal
        visible={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          loadData();
        }}
        sheetUrl={sheetUrl}
        googleConnected={googleConnected}
        serviceAccountEmail={serviceAccountEmail}
      />
    </SafeAreaView>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroSubHeader: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroBalanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -1,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthArrow: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  monthArrowText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: 4,
  },
  budgetProgressSection: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabelLeft: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressLabelRight: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.brand,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 47, 58, 0.4)',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtnPrimary: {
    flex: 1.2,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12141A',
    textAlign: 'center',
  },
  quickActionBtnSecondary: {
    flex: 1,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  allowanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  allowanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  allowanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  allowanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  allowanceSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  allowanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  allowanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  allowanceTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  allowanceFill: {
    height: '100%',
    borderRadius: 4,
  },
  allowanceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allowanceFooterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  boldWhite: {
    color: COLORS.text,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brand,
  },
});

export default DashboardScreen;
