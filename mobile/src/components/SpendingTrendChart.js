import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 36;
const CHART_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CHART_HEIGHT = 130;
const CHART_BOTTOM_PAD = 16;
const CHART_TOP_PAD = 28;

const SpendingTrendChart = ({
  expenses = [],
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  // Determine 7 days to display
  const weekDays = useMemo(() => {
    let baseDate = new Date();
    if (expenses.length > 0) {
      const dates = expenses
        .map((e) => e.date)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        const lastDateStr = dates[dates.length - 1];
        const [y, m, d] = lastDateStr.split('-').map(Number);
        baseDate = new Date(y, m - 1, d);
      }
    }

    const currentDay = baseDate.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMonday);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        total: 0,
      });
    }

    // Aggregate expenses for these 7 days
    expenses.forEach((e) => {
      const match = days.find((w) => w.dateStr === e.date);
      if (match) {
        match.total += parseFloat(e.amount) || 0;
      }
    });

    return days;
  }, [expenses]);

  // Set initial selected day to the day with the highest spending or first active day
  const defaultIdx = useMemo(() => {
    let maxIdx = 0;
    let maxVal = -1;
    weekDays.forEach((d, idx) => {
      if (d.total > maxVal) {
        maxVal = d.total;
        maxIdx = idx;
      }
    });
    return maxVal > 0 ? maxIdx : 1;
  }, [weekDays]);

  const [activeIdx, setActiveIdx] = useState(defaultIdx);

  // Y-Scale calculations
  const maxSpend = Math.max(...weekDays.map((d) => d.total), 100);
  const getY = (val) => {
    const clamped = Math.max(0, Math.min(val, maxSpend));
    const availableHeight = CHART_HEIGHT - CHART_BOTTOM_PAD - CHART_TOP_PAD;
    return CHART_HEIGHT - CHART_BOTTOM_PAD - (clamped / maxSpend) * availableHeight;
  };

  const getX = (idx) => {
    const step = CHART_WIDTH / 6;
    return idx * step;
  };

  // Points for SVG path
  const points = weekDays.map((day, idx) => ({
    x: getX(idx),
    y: getY(day.total),
    day,
    idx,
  }));

  const linePathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPathD = `${linePathD} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  const activePoint = activeIdx !== null ? points[activeIdx] : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Weekly spending trend</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Daily spending</Text>
        </View>
      </View>

      {/* Chart Canvas with SVG and floating tooltip */}
      <View style={styles.chartCanvas}>
        {/* Floating Tooltip directly above active hovered/tapped point */}
        {activePoint && (
          <View
            style={[
              styles.floatingTooltip,
              {
                left: Math.max(0, Math.min(activePoint.x - 38, CHART_WIDTH - 76)),
                top: Math.max(2, activePoint.y - 34),
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.tooltipAmount}>
              ₹{activePoint.day.total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}

        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.brand} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={COLORS.brand} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Area Gradient Under Curve */}
          <Path d={areaPathD} fill="url(#spendingGrad)" />

          {/* Solid Spending Trend Line */}
          <Path
            d={linePathD}
            fill="none"
            stroke={COLORS.brand}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isActive = activeIdx === idx;
            return (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 6 : 4}
                fill={isActive ? '#ffffff' : COLORS.brand}
                stroke={COLORS.brand}
                strokeWidth={isActive ? 3 : 1.5}
              />
            );
          })}
        </Svg>

        {/* Interactive Hover / Tap Zones over each day column */}
        <View style={styles.tapZonesRow}>
          {weekDays.map((day, idx) => (
            <TouchableOpacity
              key={day.dateStr}
              style={styles.tapZone}
              activeOpacity={0.8}
              onPress={() => setActiveIdx(idx)}
              {...(Platform.OS === 'web'
                ? {
                    onMouseEnter: () => setActiveIdx(idx),
                  }
                : {})}
            />
          ))}
        </View>
      </View>

      {/* X-Axis Day Labels */}
      <View style={styles.labelsRow}>
        {weekDays.map((day, idx) => {
          const isActive = activeIdx === idx;
          return (
            <TouchableOpacity
              key={day.dateStr}
              onPress={() => setActiveIdx(idx)}
              {...(Platform.OS === 'web'
                ? {
                    onMouseEnter: () => setActiveIdx(idx),
                  }
                : {})}
              style={styles.labelCol}
            >
              <Text style={[styles.dayName, isActive && styles.dayNameActive]}>
                {day.dayName}
              </Text>
              <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>
                {day.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brand,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  chartCanvas: {
    position: 'relative',
    height: CHART_HEIGHT,
    marginBottom: 6,
  },
  floatingTooltip: {
    position: 'absolute',
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    minWidth: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    backgroundColor: COLORS.surfaceRaised,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    transform: [{ rotate: '45deg' }],
  },
  tapZonesRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tapZone: {
    flex: 1,
    height: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  labelCol: {
    alignItems: 'center',
    width: 32,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.muted,
  },
  dayNameActive: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  dayNum: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayNumActive: {
    color: COLORS.text,
    fontWeight: '800',
  },
});

export default SpendingTrendChart;
