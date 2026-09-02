import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme/colors';

const Toast = ({ visible, message, type = 'success' }) => {
  if (!visible || !message) return null;

  const getBorderColor = () => {
    switch (type) {
      case 'error': return COLORS.red;
      case 'warning': return COLORS.orange;
      case 'info': return COLORS.cyan;
      default: return COLORS.lime;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return '⚠️';
      case 'warning': return '⚡';
      case 'info': return 'ℹ️';
      default: return '✓';
    }
  };

  return (
    <View style={[styles.container, { borderColor: getBorderColor() }]}>
      <Text style={styles.icon}>{getIcon()}</Text>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
  },
  message: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default Toast;
