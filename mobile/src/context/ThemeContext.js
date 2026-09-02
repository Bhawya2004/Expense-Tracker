import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeMode, DARK_COLORS, LIGHT_COLORS, COLORS } from '../theme/colors';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  colors: COLORS,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_theme_mode');
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
        setThemeMode(saved);
      } else {
        setThemeMode('dark');
      }
    } catch (e) {
      console.warn('Failed to load saved theme:', e);
    }
  };

  const setTheme = async (newTheme) => {
    try {
      await AsyncStorage.setItem('app_theme_mode', newTheme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
    setThemeMode(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const activeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: activeColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
