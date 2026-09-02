import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExpenseModal from './src/components/ExpenseModal';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Pixel-perfect tab icons matching uploaded mockup
const TabIcon = ({ name, isFocused, activeColor = '#E8A752', inactiveColor = '#8A92A6' }) => {
  const color = isFocused ? activeColor : inactiveColor;
  const size = 23;

  if (name === 'Dashboard') {
    // House shape
    return isFocused ? (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </Svg>
    ) : (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <Path d="M9 22V12h6v10" />
      </Svg>
    );
  }

  if (name === 'Transactions') {
    // Envelope / Activity shape
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="5" width="18" height="14" rx="3" />
        <Path d="M3 7l9 6 9-6" />
      </Svg>
    );
  }

  if (name === 'Analytics') {
    // Calendar with dot grid matching mockup
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="4" width="18" height="17" rx="3" />
        <Path d="M16 2v4M8 2v4M3 9h18" />
        <Circle cx="8" cy="13" r="1.1" fill={color} />
        <Circle cx="12" cy="13" r="1.1" fill={color} />
        <Circle cx="16" cy="13" r="1.1" fill={color} />
        <Circle cx="8" cy="17" r="1.1" fill={color} />
        <Circle cx="12" cy="17" r="1.1" fill={color} />
        <Circle cx="16" cy="17" r="1.1" fill={color} />
      </Svg>
    );
  }

  if (name === 'Profile') {
    // User outline matching mockup
    return isFocused ? (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </Svg>
    ) : (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
      </Svg>
    );
  }

  return null;
};

const CustomTabBar = ({ state, descriptors, navigation, onOpenAdd }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.tabBarContainer}>
      <View
        style={[
          styles.tabBarInner,
          {
            backgroundColor: colors.tabBg,
            borderTopColor: colors.tabBorder,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <React.Fragment key={route.key}>
              {/* Elevated Round Dark Plus Button */}
              {index === 2 && (
                <TouchableOpacity
                  style={[
                    styles.centerFabBtn,
                    {
                      backgroundColor: isDark ? '#5FBBA2' : '#1A1D25',
                      borderColor: isDark ? '#4EAE95' : 'rgba(0,0,0,0.06)',
                      shadowColor: isDark ? '#5FBBA2' : '#000000',
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={onOpenAdd}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 5v14M5 12h14"
                      stroke={isDark ? '#12141A' : '#ffffff'}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <TabIcon
                  name={route.name}
                  isFocused={isFocused}
                  activeColor="#E8A752"
                  inactiveColor={colors.inactiveTabIcon}
                />
                {isFocused && (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: isDark ? '#EDEEF0' : '#12141A' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const { addExpense, updateExpense } = useAuth();

  const handleQuickSaveExpense = async (payload) => {
    if (payload.id) {
      await updateExpense(payload.id, payload);
    } else {
      await addExpense(payload);
    }
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomTabBar {...props} onOpenAdd={() => setShowAddModal(true)} />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      <ExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleQuickSaveExpense}
      />
    </>
  );
};

const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const { theme, colors, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.loadingLogo, { color: colors.text }]}>ExpenseTrack</Text>
        <ActivityIndicator size="small" color={colors.brand} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.brand,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    height: Platform.OS === 'ios' ? 84 : 70,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  centerFabBtn: {
    top: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  centerFabText: {
    fontSize: 26,
    fontWeight: '400',
    color: '#ffffff',
    lineHeight: 28,
  },
});
