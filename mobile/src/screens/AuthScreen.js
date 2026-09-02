import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const GOOGLE_PRESET_ACCOUNTS = [
  { name: 'Bhawya Gulati', email: 'bhawyagulati33@gmail.com', avatarBg: '#e8710a', letter: 'B' },
  { name: 'Bhawya Gulati', email: 'gulatibhawya@gmail.com', avatarBg: '#00897b', letter: 'B' },
  { name: 'bfreestorage', email: 'bfreestorage004@gmail.com', avatarBg: '#7cb342', letter: 'b' },
  { name: 'Bhawya', email: 'bfreestorge003@gmail.com', avatarBg: '#5c6bc0', letter: 'B' },
  { name: 'Bhawya', email: 'bfreestorage002@gmail.com', avatarBg: '#8e24aa', letter: 'B' },
];

const AuthScreen = () => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const { loginWithGoogleEmail, loginWithEmailPassword, registerWithEmailPassword } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setInfoMsg('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await loginWithEmailPassword(email, password);
      } else {
        await registerWithEmailPassword(email, password);
      }
    } catch (err) {
      console.error('Auth Error:', err);
      const serverMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'object'
          ? Object.values(err.response.data).flat().join(' ')
          : null);
      setError(serverMsg || err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (targetEmail, targetName = '') => {
    setError('');
    setGoogleLoading(true);
    setShowGoogleModal(false);

    try {
      await loginWithGoogleEmail(targetEmail, targetName);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      const serverMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Google Authentication failed.';
      setError(serverMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo & Header */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>
            expense<Text style={styles.logoDot}>.</Text>track
          </Text>
          <Text style={styles.tagline}>Personal finance & Google Sheets sync</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Tab Switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => {
                setTab('login');
                setError('');
                setInfoMsg('');
              }}
              style={[styles.tabBtn, tab === 'login' && styles.activeTabBtn]}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setTab('register');
                setError('');
                setInfoMsg('');
              }}
              style={[styles.tabBtn, tab === 'register' && styles.activeTabBtn]}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.activeTabText]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {infoMsg ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💡 {infoMsg}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
                setInfoMsg('');
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bgDark} />
            ) : (
              <Text style={styles.submitBtnText}>
                {tab === 'login' ? 'Sign In →' : 'Create Account →'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Google Sign In Divider & Button */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
            onPress={() => setShowGoogleModal(true)}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.googleBtnText}>
                  {tab === 'login' ? 'Sign in with Google' : 'Continue with Google'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Google Account Chooser Modal Popup */}
      <Modal
        visible={showGoogleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.googleModalContent}>
            {/* Google Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleBrandRow}>
                <GoogleIcon />
                <Text style={styles.googleBrandText}>Sign in with Google</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.googleCloseBtn}
              >
                <Text style={styles.googleCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.chooseTitle}>Choose an account</Text>
            <Text style={styles.chooseSub}>
              to continue to <Text style={styles.chooseDomain}>expense-tracker-c32b8.firebaseapp.com</Text>
            </Text>

            {/* Account List */}
            <ScrollView style={styles.accountList} showsVerticalScrollIndicator={false}>
              {GOOGLE_PRESET_ACCOUNTS.map((acc) => (
                <TouchableOpacity
                  key={acc.email}
                  style={styles.accountRow}
                  activeOpacity={0.7}
                  onPress={() => handleSelectGoogleAccount(acc.email, acc.name)}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: acc.avatarBg }]}>
                    <Text style={styles.avatarLetter}>{acc.letter}</Text>
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{acc.name}</Text>
                    <Text style={styles.accountEmail}>{acc.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add Custom Google Account Option */}
              {showCustomGoogleInput ? (
                <View style={styles.customInputBox}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Enter your Gmail address"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                  />
                  <TouchableOpacity
                    style={styles.customContinueBtn}
                    onPress={() => {
                      if (customGoogleEmail.trim().length > 0) {
                        handleSelectGoogleAccount(customGoogleEmail.trim());
                      }
                    }}
                  >
                    <Text style={styles.customContinueText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.useAnotherRow}
                  onPress={() => setShowCustomGoogleInput(true)}
                >
                  <View style={styles.addIconCircle}>
                    <Text style={styles.addIconText}>👤</Text>
                  </View>
                  <Text style={styles.useAnotherText}>Use another Google account</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.googleFooter}>
              <Text style={styles.googleFooterText}>
                To continue, Google will share your name, email address, and profile picture with ExpenseTracker.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1,
  },
  logoDot: {
    color: COLORS.lime,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(35, 39, 58, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: COLORS.surface3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.text,
  },
  infoBox: {
    backgroundColor: COLORS.cyanAlpha,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    marginBottom: 14,
  },
  infoText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: COLORS.redAlpha,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '600',
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: COLORS.lime,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.bgDark,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  /* Google Popup Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  googleModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '85%',
  },
  googleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  googleBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBrandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c4043',
  },
  googleCloseBtn: {
    padding: 6,
  },
  googleCloseText: {
    fontSize: 16,
    color: '#5f6368',
    fontWeight: '700',
  },
  chooseTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#202124',
    marginTop: 18,
    marginBottom: 4,
  },
  chooseSub: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 18,
  },
  chooseDomain: {
    color: '#1a73e8',
    fontWeight: '500',
  },
  accountList: {
    maxHeight: 280,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  accountEmail: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 1,
  },
  useAnotherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  addIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addIconText: {
    fontSize: 16,
  },
  useAnotherText: {
    fontSize: 14,
    color: '#3c4043',
    fontWeight: '500',
  },
  customInputBox: {
    paddingVertical: 10,
  },
  customInput: {
    backgroundColor: '#f1f3f4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#202124',
    fontSize: 14,
    marginBottom: 8,
  },
  customContinueBtn: {
    backgroundColor: '#1a73e8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  customContinueText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  googleFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  googleFooterText: {
    fontSize: 11,
    color: '#70757a',
    lineHeight: 15,
  },
});

export default AuthScreen;
