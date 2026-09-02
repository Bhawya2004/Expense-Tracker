import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getCategoryMeta } from '../theme/colors';

const ExpenseItem = ({ expense, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const meta = getCategoryMeta(expense.category);
  const amountNum = parseFloat(expense.amount) || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(expense)}
      activeOpacity={0.7}
    >
      {/* 40px Tinted Category Icon */}
      <View style={[styles.iconCircle, { backgroundColor: meta.bgColor }]}>
        <Text style={[styles.iconSymbol, { color: meta.color }]}>
          {meta.emoji}
        </Text>
      </View>

      {/* Title & Metadata */}
      <View style={styles.detailsCol}>
        <Text style={styles.title} numberOfLines={1}>
          {expense.description || meta.label}
        </Text>
        <Text style={styles.metaSubtext}>
          {meta.label}
        </Text>
      </View>

      {/* Right-aligned Amount */}
      <View style={styles.amountCol}>
        <Text style={styles.amountText}>
          -₹{amountNum.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    iconSymbol: {
      fontSize: 18,
    },
    detailsCol: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '500',
      color: COLORS.text,
    },
    metaSubtext: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    amountCol: {
      alignItems: 'flex-end',
    },
    amountText: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.expense,
    },
  });

export default ExpenseItem;
