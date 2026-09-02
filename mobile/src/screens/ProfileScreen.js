import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  StatusBar,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator
} from 'react-native';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';
import GoogleConnectModal from '../components/GoogleConnectModal';
import BudgetModal from '../components/BudgetModal';
import Toast from '../components/Toast';

const ProfileScreen = () => {
  const { user, logout, deleteAccount, updateUserName } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [profile, setProfile] = useState(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Edit Name Modal State
  const [showNameModal, setShowNameModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Confirm Action Modal State (Sign Out / Delete Account)
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    actionType: null, // 'logout' | 'delete'
    loading: false,
  });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/budget/');
      setProfile(res.data);
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }
  };

  const handleOpenEditName = () => {
    setNewNameInput(user?.username || '');
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    if (!newNameInput || !newNameInput.trim()) {
      triggerToast('Please enter a valid name', 'error');
      return;
    }

    setSavingName(true);
    try {
      await updateUserName(newNameInput.trim());
      setShowNameModal(false);
      triggerToast('Name updated successfully ✨');
    } catch (e) {
      triggerToast('Failed to update name', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleOpenSheet = async () => {
    if (!profile?.sheet_url) {
      setShowGoogleModal(true);
      return;
    }
    try {
      const supported = await Linking.canOpenURL(profile.sheet_url);
      if (supported) {
        await Linking.openURL(profile.sheet_url);
      } else {
        setShowGoogleModal(true);
      }
    } catch (e) {
      setShowGoogleModal(true);
    }
  };

  const promptLogout = () => {
    setConfirmModal({
      visible: true,
      title: 'Sign Out',
      message: 'Do you want to sign out of your account?',
      confirmText: 'Sign Out',
      actionType: 'logout',
      loading: false,
    });
  };

  const promptDeleteAccount = () => {
    setConfirmModal({
      visible: true,
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? All your transactions and budget history will be permanently erased.',
      confirmText: 'Delete Permanently',
      actionType: 'delete',
      loading: false,
    });
  };

  const handleExecuteConfirm = async () => {
    setConfirmModal((prev) => ({ ...prev, loading: true }));
    try {
      if (confirmModal.actionType === 'logout') {
        await logout();
      } else if (confirmModal.actionType === 'delete') {
        await deleteAccount();
      }
      setConfirmModal((prev) => ({ ...prev, visible: false, loading: false }));
    } catch (e) {
      setConfirmModal((prev) => ({ ...prev, loading: false }));
      triggerToast('Action failed. Please try again.', 'error');
    }
  };

  const isGoogleConnected = Boolean(profile?.google_connected || profile?.google_sheet_id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Card matching mockup */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'B'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || 'ExpenseTrack User'}</Text>
            <Text style={styles.userEmail}>
              {user?.username ? `${user.username.toLowerCase()}@gmail.com` : 'user@gmail.com'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.userEditBtn}
            onPress={handleOpenEditName}
            activeOpacity={0.7}
          >
            <Text style={styles.userEditIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* List Menu Section matching Screen 5 in mockup */}
        <View style={styles.menuSection}>
          {/* Item 1: Sync with Google Sheets */}
          <TouchableOpacity style={styles.menuItem} onPress={handleOpenSheet} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(95, 187, 162, 0.12)' }]}>
                <Text style={styles.menuEmoji}>📊</Text>
              </View>
              <View>
                <Text style={styles.menuTitle}>Sync with Google Sheets</Text>
                <Text style={styles.menuSubtitle}>
                  {isGoogleConnected ? 'Live synced with Google Drive' : 'Tap to connect your spreadsheet'}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Item 2: Budget Preferences */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowBudgetModal(true)} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(217, 174, 91, 0.12)' }]}>
                <Text style={styles.menuEmoji}>⚖️</Text>
              </View>
              <View>
                <Text style={styles.menuTitle}>Budget Preferences</Text>
                <Text style={styles.menuSubtitle}>Monthly limits & safe daily allowance</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Item 3: Dark Mode Switch */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(95, 187, 162, 0.12)' : 'rgba(232, 167, 82, 0.14)' }]}>
                <Text style={styles.menuEmoji}>{isDark ? '🌙' : '☀️'}</Text>
              </View>
              <View>
                <Text style={styles.menuTitle}>Dark Mode</Text>
                <Text style={styles.menuSubtitle}>{isDark ? 'Dark theme enabled' : 'Light theme enabled'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D0D3D9', true: COLORS.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Item 4: Help & Support */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => triggerToast('Developer support: bhawya2004@gmail.com')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(176, 136, 217, 0.12)' }]}>
                <Text style={styles.menuEmoji}>💬</Text>
              </View>
              <View>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuSubtitle}>FAQs and developer assistance</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Destructive Actions Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={promptLogout} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(229, 132, 105, 0.12)' }]}>
                <Text style={styles.menuEmoji}>🚪</Text>
              </View>
              <Text style={[styles.menuTitle, { color: COLORS.expense }]}>Sign Out</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={promptDeleteAccount} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(229, 132, 105, 0.12)' }]}>
                <Text style={styles.menuEmoji}>🗑️</Text>
              </View>
              <Text style={[styles.menuTitle, { color: COLORS.expense }]}>Delete Account</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal (Sign Out / Delete Account) */}
      <Modal
        visible={confirmModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={styles.modalSubtitle}>{confirmModal.message}</Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                disabled={confirmModal.loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.destructiveConfirmBtn, confirmModal.loading && { opacity: 0.6 }]}
                onPress={handleExecuteConfirm}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.destructiveConfirmText}>{confirmModal.confirmText}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showNameModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Profile</Text>
            <Text style={styles.modalSubtitle}>Enter your new display name</Text>

            <TextInput
              style={styles.nameInput}
              value={newNameInput}
              onChangeText={setNewNameInput}
              placeholder="Your name"
              placeholderTextColor={COLORS.muted}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNameModal(false)}
                disabled={savingName}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, savingName && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName ? (
                  <ActivityIndicator color="#12141A" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Name</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <GoogleConnectModal
        visible={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          loadProfile();
        }}
        sheetUrl={profile?.sheet_url}
        googleConnected={isGoogleConnected}
        serviceAccountEmail={profile?.service_account_email}
      />

      <BudgetModal
        visible={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false);
          loadProfile();
        }}
        onSave={async (bData) => {
          await api.post('/budget/update/', bData);
          loadProfile();
        }}
        initialBudgetMode={profile?.budget_mode || 'monthly'}
        initialMonthlyBudget={profile?.monthly_budget || 0}
        initialCurrentBalance={profile?.current_balance || 0}
        initialFixedDailyBudget={profile?.fixed_daily_budget || 0}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8A752',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12141A',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userEditIcon: {
    fontSize: 15,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(43, 47, 58, 0.4)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuEmoji: {
    fontSize: 16,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: COLORS.muted,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 18,
  },
  nameInput: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.brand,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12141A',
  },
  destructiveConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.expense,
  },
  destructiveConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default ProfileScreen;
