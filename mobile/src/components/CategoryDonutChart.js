import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { COLORS, getCategoryMeta } from '../theme/colors';

const DONUT_SIZE = 120;
const STROKE_WIDTH = 14;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CategoryDonutChart = ({ expenses = [], onSelectCategory, selectedCategory }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const totalSpent = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  // Group by category
  const categoryTotals = {};
  expenses.forEach((e) => {
    const rawCat = (e.category || 'other').toLowerCase();
    const cat = rawCat === 'food' ? 'dining' : rawCat;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([cat, amt]) => ({
      key: cat,
      meta: getCategoryMeta(cat),
      amount: amt,
      percentage: totalSpent > 0 ? (amt / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top 4 categories + Everything else
  const top4 = sortedCategories.slice(0, 4);
  const others = sortedCategories.slice(4);
  const otherTotal = others.reduce((acc, curr) => acc + curr.amount, 0);

  const displayList = [...top4];
  if (otherTotal > 0) {
    displayList.push({
      key: 'other',
      meta: { label: 'Everything else', color: '#6E7480' },
      amount: otherTotal,
      percentage: totalSpent > 0 ? (otherTotal / totalSpent) * 100 : 0,
    });
  }

  // Calculate SVG stroke dashes
  let currentOffset = 0;
  const segments = (displayList.length > 0 ? displayList : [{ key: 'none', meta: { color: COLORS.border }, percentage: 100 }]).map((item) => {
    const strokeDash = (item.percentage / 100) * CIRCUMFERENCE;
    const strokeDashoffset = -currentOffset;
    currentOffset += strokeDash;
    return {
      ...item,
      strokeDash,
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.card}>
      {/* Left Donut Section */}
      <View style={styles.donutWrapper}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          <G rotation="-90" origin={`${DONUT_SIZE / 2}, ${DONUT_SIZE / 2}`}>
            {/* Background ring */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={RADIUS}
              stroke={COLORS.surfaceSunken}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {totalSpent > 0 &&
              segments.map((seg, idx) => (
                <Circle
                  key={idx}
                  cx={DONUT_SIZE / 2}
                  cy={DONUT_SIZE / 2}
                  r={RADIUS}
                  stroke={seg.meta.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${seg.strokeDash} ${CIRCUMFERENCE}`}
                  strokeDashoffset={seg.strokeDashoffset}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
          </G>
        </Svg>

        {/* Center Text inside Donut */}
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterLabel}>SPENT</Text>
          <Text style={styles.donutCenterValue}>
            ₹{totalSpent > 999 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Right Legend Section matching mockup */}
      <View style={styles.legendContainer}>
        {displayList.length === 0 ? (
          <Text style={styles.emptyLegendText}>No expenses recorded yet</Text>
        ) : (
          displayList.map((item) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.legendRow, isSelected && styles.legendRowSelected]}
                onPress={() => onSelectCategory && onSelectCategory(item.key)}
                activeOpacity={0.7}
              >
                <View style={styles.legendLeft}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.meta.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {item.meta.label}
                  </Text>
                </View>
                <Text style={styles.legendPercent}>
                  {item.percentage.toFixed(0)}%
                </Text>
              </TouchableOpacity>
            );
          })
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
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutWrapper: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 20,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.8,
  },
  donutCenterValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  legendRowSelected: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyLegendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});

export default CategoryDonutChart;
