/**
 * ExpenseTrack Design System - Dual Theme (Dark & Light)
 * Based on design.md §2 (Calm confidence, data-first, one accent at a time)
 */

export const DARK_COLORS = {
  bg: '#12141A',
  surface: '#1A1D25',
  surfaceRaised: '#232732',
  surfaceSunken: '#161920',
  
  border: '#2B2F3A',
  borderLight: '#3A404F',
  
  text: '#EDEEF0',
  textSecondary: '#A2A7B0',
  muted: '#6E7480',
  
  brand: '#5FBBA2',
  brandDark: '#2F6F5E',
  brandGlow: 'rgba(95, 187, 162, 0.16)',
  
  income: '#4FBE87',
  incomeAlpha: 'rgba(79, 190, 135, 0.14)',
  
  expense: '#E58469',
  expenseAlpha: 'rgba(229, 132, 105, 0.14)',
  
  savings: '#D9AE5B',
  savingsAlpha: 'rgba(217, 174, 91, 0.14)',
  
  warning: '#DB9A55',
  warningAlpha: 'rgba(219, 154, 85, 0.14)',
  
  info: '#7FA9CC',
  infoAlpha: 'rgba(127, 169, 204, 0.14)',
  
  lime: '#5FBBA2',
  limeAlpha: 'rgba(95, 187, 162, 0.16)',
  cyan: '#7FA9CC',
  cyanAlpha: 'rgba(127, 169, 204, 0.14)',
  red: '#E58469',
  redAlpha: 'rgba(229, 132, 105, 0.14)',
  orange: '#DB9A55',
  surface2: '#161920',
  surface3: '#232732',
  bgDark: '#12141A',

  // Mockup Tab Bar Tokens
  tabBg: '#1A1D25',
  tabBorder: '#2B2F3A',
  fabBg: '#232732',
  fabText: '#ffffff',
  activeTabIcon: '#E8A752',
  inactiveTabIcon: '#6E7480',
};

export const LIGHT_COLORS = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#EBEDF2',
  
  border: '#E2E4E9',
  borderLight: '#D0D3D9',
  
  text: '#12141A',
  textSecondary: '#5F6573',
  muted: '#8B919E',
  
  brand: '#3DA88F',
  brandDark: '#267A66',
  brandGlow: 'rgba(61, 168, 143, 0.16)',
  
  income: '#2E9D69',
  incomeAlpha: 'rgba(46, 157, 105, 0.14)',
  
  expense: '#D95338',
  expenseAlpha: 'rgba(217, 83, 56, 0.14)',
  
  savings: '#C4973B',
  savingsAlpha: 'rgba(196, 151, 59, 0.14)',
  
  warning: '#C78235',
  warningAlpha: 'rgba(199, 130, 53, 0.14)',
  
  info: '#4B88B5',
  infoAlpha: 'rgba(75, 136, 181, 0.14)',
  
  lime: '#3DA88F',
  limeAlpha: 'rgba(61, 168, 143, 0.16)',
  cyan: '#4B88B5',
  cyanAlpha: 'rgba(75, 136, 181, 0.14)',
  red: '#D95338',
  redAlpha: 'rgba(217, 83, 56, 0.14)',
  orange: '#C78235',
  surface2: '#EBEDF2',
  surface3: '#FFFFFF',
  bgDark: '#FFFFFF',

  // Mockup Tab Bar Tokens
  tabBg: '#FFFFFF',
  tabBorder: '#E2E4E9',
  fabBg: '#1A1D25',
  fabText: '#ffffff',
  activeTabIcon: '#E8A752',
  inactiveTabIcon: '#9CA3AF',
};

// Mutable active palette
export const COLORS = { ...DARK_COLORS };

export const setThemeMode = (mode) => {
  const target = mode === 'light' ? LIGHT_COLORS : DARK_COLORS;
  Object.assign(COLORS, target);
};

export const CATEGORY_META = {
  housing: {
    label: 'Housing',
    icon: 'home',
    emoji: '🏠',
    color: '#D9AE5B',
    bgColor: 'rgba(217, 174, 91, 0.14)',
  },
  dining: {
    label: 'Dining',
    icon: 'coffee',
    emoji: '☕',
    color: '#E58469',
    bgColor: 'rgba(229, 132, 105, 0.14)',
  },
  groceries: {
    label: 'Groceries',
    icon: 'shopping-cart',
    emoji: '🛒',
    color: '#4FBE87',
    bgColor: 'rgba(79, 190, 135, 0.14)',
  },
  transport: {
    label: 'Transport',
    icon: 'truck',
    emoji: '🚗',
    color: '#5FBBA2',
    bgColor: 'rgba(95, 187, 162, 0.14)',
  },
  shopping: {
    label: 'Shopping',
    icon: 'shopping-bag',
    emoji: '🛍️',
    color: '#B088D9',
    bgColor: 'rgba(176, 136, 217, 0.14)',
  },
  health: {
    label: 'Health',
    icon: 'heart',
    emoji: '💊',
    color: '#52B2CF',
    bgColor: 'rgba(82, 178, 207, 0.14)',
  },
  bills: {
    label: 'Bills',
    icon: 'file-text',
    emoji: '⚡',
    color: '#DB9A55',
    bgColor: 'rgba(219, 154, 85, 0.14)',
  },
  entertainment: {
    label: 'Entertainment',
    icon: 'film',
    emoji: '🎬',
    color: '#D96B9A',
    bgColor: 'rgba(217, 107, 154, 0.14)',
  },
  other: {
    label: 'Other',
    icon: 'tag',
    emoji: '📦',
    color: '#8A92A6',
    bgColor: 'rgba(138, 146, 166, 0.14)',
  },
};

export const getCategoryMeta = (catKey) => {
  const k = (catKey || 'other').toLowerCase();
  if (k === 'food') return CATEGORY_META.dining;
  return CATEGORY_META[k] || CATEGORY_META.other;
};
