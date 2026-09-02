import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { COLORS } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 36;
const CHART_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CHART_HEIGHT = 110;
const PADDING_BOTTOM = 14;
const PADDING_TOP = 20;

const CashFlowTrendChart = ({ expenses = [], period = 'Month', budget = 5000 }) => {
  // Calculate real coordinates from actual expenses
  const { points, activePoint, badgeLabel } = useMemo(() => {
    let dataPoints = [];
    let badge = 'On track';

    if (period === 'Week') {
      // 7 days of current week
      const today = new Date();
      const currentDay = today.getDay();
      const distToMon = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distToMon);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        days.push(`${yStr}-${mStr}-${dStr}`);
      }

      dataPoints = days.map((dateStr) => {
        const total = expenses
          .filter((e) => e.date === dateStr)
          .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
        return { label: dateStr.slice(5), value: total };
      });
      badge = 'This week · Live';
    } else if (period === 'Year') {
      // 12 months of the year
      const now = new Date();
      const currentYear = String(now.getFullYear());
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      dataPoints = monthNames.map((mName, idx) => {
        const monthPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
        const total = expenses
          .filter((e) => e.date && e.date.startsWith(monthPrefix))
          .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
        return { label: mName, value: total };
      });
      badge = `${currentYear} · Annual`;
    } else {
      // Month: Sample across the month in 6 buckets
      const now = new Date();
      const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const sampleDays = [1, Math.round(totalDays * 0.2), Math.round(totalDays * 0.4), Math.round(totalDays * 0.6), Math.round(totalDays * 0.8), totalDays];
      const yStr = now.getFullYear();
      const mStr = String(now.getMonth() + 1).padStart(2, '0');

      dataPoints = sampleDays.map((dNum, idx) => {
        const datePrefix = `${yStr}-${mStr}`;
        const dayStr = String(dNum).padStart(2, '0');
        // Total up to that day
        const total = expenses
          .filter((e) => e.date && e.date.startsWith(datePrefix) && parseInt(e.date.slice(8, 10), 10) <= dNum)
          .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
        return { label: `Day ${dNum}`, value: total };
      });
      badge = 'Month · Spending curve';
    }

    // Map data values to SVG coordinates
    const numPoints = dataPoints.length;
    const maxVal = Math.max(...dataPoints.map((d) => d.value), 50);
    const minVal = 0;
    const range = maxVal - minVal || 1;
    const availableHeight = CHART_HEIGHT - PADDING_BOTTOM - PADDING_TOP;

    const coords = dataPoints.map((pt, i) => {
      const x = (i / (numPoints - 1)) * CHART_WIDTH;
      const normalized = (pt.value - minVal) / range;
      // Invert Y so highest value is near top
      const y = CHART_HEIGHT - PADDING_BOTTOM - normalized * availableHeight;
      return { x, y, ...pt };
    });

    // Find the latest non-zero point or current day point
    let active = coords[coords.length - 1];
    for (let i = coords.length - 1; i >= 0; i--) {
      if (coords[i].value > 0) {
        active = coords[i];
        break;
      }
    }

    return { points: coords, activePoint: active || coords[0], badgeLabel: badge };
  }, [expenses, period, budget]);

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View style={styles.container}>
      {/* Tooltip callout */}
      <View
        style={[
          styles.tooltipBadge,
          { left: Math.max(10, Math.min(activePoint.x - 36, CHART_WIDTH - 110)) },
        ]}
      >
        <Text style={styles.tooltipText}>
          {badgeLabel} {activePoint?.value > 0 ? `· ₹${activePoint.value.toFixed(0)}` : ''}
        </Text>
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#D9AE5B" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#D9AE5B" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Real Area Fill Under Curve */}
        <Path d={areaD} fill="url(#amberGrad)" />

        {/* Real Golden Trend Line */}
        <Path
          d={pathD}
          fill="none"
          stroke="#D9AE5B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Highlighted Real Data Points */}
        {points.map((pt, idx) => {
          const isActive = pt.x === activePoint.x;
          return (
            <Circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 5 : 3}
              fill={isActive ? '#ffffff' : '#D9AE5B'}
              stroke="#1A1D25"
              strokeWidth={isActive ? 2.5 : 1}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    position: 'relative',
    height: CHART_HEIGHT + 20,
  },
  tooltipBadge: {
    position: 'absolute',
    top: 0,
    backgroundColor: COLORS.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D9AE5B',
  },
});

export default CashFlowTrendChart;
