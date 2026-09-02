import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Header = ({ username }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Left: Clean App title */}
      <View style={styles.leftCol}>
        <Text style={styles.appTitle}>ExpenseTrack</Text>
      </View>

      {/* Right: User Avatar for display only */}
      <View style={styles.rightRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {username ? username.charAt(0).toUpperCase() : 'B'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      backgroundColor: COLORS.bg,
    },
    leftCol: {
      flex: 1,
    },
    appTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.text,
      letterSpacing: -0.4,
    },
    rightRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#E8A752',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#12141A',
    },
  });

export default Header;
