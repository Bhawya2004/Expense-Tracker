import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';
import ExpenseItem from '../components/ExpenseItem';
import ExpenseModal from '../components/ExpenseModal';
import Toast from '../components/Toast';

const CATEGORY_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'dining', label: 'Dining' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'transport', label: 'Transport' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'health', label: 'Health' },
  { key: 'housing', label: 'Housing' },
  { key: 'bills', label: 'Bills' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'other', label: 'Other' },
];

const getTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TransactionsScreen = ({ route }) => {
  const filterCatParam = route?.params?.filterCategory;
  const { refreshTrigger, addExpense, updateExpense, deleteExpense } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(
    filterCatParam ? (filterCatParam.toLowerCase() === 'food' ? 'dining' : filterCatParam.toLowerCase()) : 'All'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3500);
  };

  const isLoadingRef = useRef(false);

  const loadExpenses = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const res = await api.get('/expenses/');
      setExpenses(res.data || []);
    } catch (err) {
      console.warn('Failed to load expenses in Activity:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [refreshTrigger, loadExpenses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const handleSaveExpense = async (expenseData) => {
    try {
      if (expenseData.id) {
        await updateExpense(expenseData.id, expenseData);
        triggerToast('Transaction updated');
      } else {
        await addExpense(expenseData);
        triggerToast('Transaction recorded & synced ✨');
      }
    } catch (err) {
      triggerToast('Failed to save transaction', 'error');
      throw err;
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
      setShowExpenseModal(false);
      setEditingExpense(null);
      triggerToast('Transaction removed & synced ✨');
    } catch (err) {
      setShowExpenseModal(false);
      setEditingExpense(null);
      triggerToast('Transaction removed', 'success');
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return expenses.filter((e) => {
      // Search
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q)) return false;
      }

      // Filter by Category Chip
      if (selectedFilter !== 'All') {
        const expCat = (e.category || 'other').toLowerCase();
        const normExpCat = expCat === 'food' ? 'dining' : expCat;
        if (normExpCat !== selectedFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedFilter]);

  // Group by Date for SectionList (TODAY, YESTERDAY, [DATE])
  const sections = useMemo(() => {
    const today = getTodayIso();
    const yesterday = getYesterdayIso();

    const groups = {};
    filteredList.forEach((e) => {
      const d = e.date || 'Earlier';
      if (!groups[d]) groups[d] = [];
      groups[d].push(e);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    return sortedDates.map((dateStr) => {
      let title = dateStr;
      if (dateStr === today) {
        title = 'TODAY';
      } else if (dateStr === yesterday) {
        title = 'YESTERDAY';
      } else {
        try {
          const d = new Date(dateStr);
          title = d.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }).toUpperCase();
        } catch (err) {
          title = dateStr.toUpperCase();
        }
      }

      const subtotal = groups[dateStr].reduce(
        (acc, curr) => acc + (parseFloat(curr.amount) || 0),
        0
      );

      return {
        title,
        dateKey: dateStr,
        subtotal,
        data: groups[dateStr],
      };
    });
  }, [filteredList]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      {/* Top Header matching Screen 3 in mockup */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerCount}>
          {filteredList.length} of {expenses.length}
        </Text>
      </View>

      {/* Search Box */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants, notes, amounts"
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter Chips [ All | Dining | Groceries | Transport | ... ] */}
      <View style={styles.filterTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsList}>
          {CATEGORY_FILTERS.map((item) => {
            const isActive = selectedFilter.toLowerCase() === item.key.toLowerCase();
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSelectedFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grouped SectionList matching mockup */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
        renderSectionHeader={({ section: { title, subtotal } }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtotal}>
              -₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ExpenseItem
            expense={item}
            onPress={(exp) => {
              setEditingExpense(exp);
              setShowExpenseModal(true);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No activity found</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to log your first transaction
            </Text>
          </View>
        }
      />

      {/* Modals */}
      <ExpenseModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        expenseToEdit={editingExpense}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  filterTabsWrapper: {
    marginBottom: 12,
  },
  filterTabsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: '#EDEEF0',
    borderColor: '#EDEEF0',
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#12141A',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.6,
  },
  sectionSubtotal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default TransactionsScreen;
