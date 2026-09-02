import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

const BudgetModal = ({
  visible,
  onClose,
  onSave,
  monthLabel,
  initialBudgetMode = 'monthly',
  initialMonthlyBudget = 0,
  initialCurrentBalance = 0,
  initialFixedDailyBudget = 0,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [mode, setMode] = useState(initialBudgetMode);
  const [monthlyBudget, setMonthlyBudget] = useState(String(initialMonthlyBudget || ''));
  const [currentBalance, setCurrentBalance] = useState(String(initialCurrentBalance || ''));
  const [fixedDailyBudget, setFixedDailyBudget] = useState(String(initialFixedDailyBudget || ''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialBudgetMode);
    setMonthlyBudget(initialMonthlyBudget > 0 ? String(initialMonthlyBudget) : '');
    setCurrentBalance(initialCurrentBalance > 0 ? String(initialCurrentBalance) : '');
    setFixedDailyBudget(initialFixedDailyBudget > 0 ? String(initialFixedDailyBudget) : '');
  }, [initialBudgetMode, initialMonthlyBudget, initialCurrentBalance, initialFixedDailyBudget, visible]);

  const handleSave = async () => {
    const payload = { budget_mode: mode };

    if (mode === 'monthly') {
      const mb = parseFloat(monthlyBudget);
      if (!mb || mb <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid monthly budget amount.');
        return;
      }
      payload.monthly_budget = mb;
    } else {
      const cb = parseFloat(currentBalance);
      const db = parseFloat(fixedDailyBudget);
      if (!cb || cb <= 0 || !db || db <= 0) {
        Alert.alert('Validation Error', 'Please enter your current balance and daily limit.');
        return;
      }
      payload.current_balance = cb;
      payload.fixed_daily_budget = db;
    }

    setLoading(true);
    try {
      await onSave(payload);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to update budget settings.');
    } finally {
      setLoading(false);
    }
  };

  const calculatedDaily = mode === 'monthly' && parseFloat(monthlyBudget) > 0
    ? (parseFloat(monthlyBudget) / 30).toFixed(0)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {monthLabel ? `Budget (${monthLabel})` : 'Budget Configuration ⚙️'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Mode Toggle Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setMode('monthly')}
                style={[styles.tabBtn, mode === 'monthly' && styles.activeTabBtn]}
              >
                <Text style={[styles.tabText, mode === 'monthly' && styles.activeTabText]}>
                  🗓️ Monthly Budget
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode('balance')}
                style={[styles.tabBtn, mode === 'balance' && styles.activeTabBtn]}
              >
                <Text style={[styles.tabText, mode === 'balance' && styles.activeTabText]}>
                  ⚖️ Balance & Limit
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'monthly' ? (
              <View style={styles.formSection}>
                <Text style={styles.helperText}>
                  Set your total spending target for the whole month. We divide it by 30 days to calculate your daily allowance automatically.
                </Text>

                <Text style={styles.inputLabel}>Monthly Budget Target (₹)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 15000"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={monthlyBudget}
                    onChangeText={setMonthlyBudget}
                  />
                </View>

                {calculatedDaily && (
                  <View style={styles.estimateCard}>
                    <Text style={styles.estimateLabel}>Estimated Daily Limit</Text>
                    <Text style={styles.estimateValue}>₹{calculatedDaily} / day</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={styles.helperText}>
                  Starting mid-month? Input your available balance in your account right now and your maximum daily limit.
                </Text>

                <Text style={styles.inputLabel}>Current Available Balance (₹)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 6500"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={currentBalance}
                    onChangeText={setCurrentBalance}
                  />
                </View>

                <Text style={styles.inputLabel}>Fixed Daily Spending Limit (₹)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 300"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={fixedDailyBudget}
                    onChangeText={setFixedDailyBudget}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>
                {loading ? 'Saving Changes...' : 'Save & Sync Sheet 💾'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(7, 8, 11, 0.8)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: COLORS.surface3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.text,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.lime,
    marginRight: 8,
  },
  inputField: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 14,
  },
  inputDisabled: {
    backgroundColor: COLORS.surfaceSunken,
    color: COLORS.muted,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  estimateCard: {
    backgroundColor: COLORS.limeAlpha,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 241, 53, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  estimateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.lime,
  },
  saveBtn: {
    backgroundColor: COLORS.lime,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.bgDark,
    textAlign: 'center',
  },
});

export default BudgetModal;
