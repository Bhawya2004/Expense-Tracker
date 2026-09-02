import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

const GoogleConnectModal = ({
  visible,
  onClose,
  sheetUrl,
  googleConnected,
  serviceAccountEmail,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const handleOpenSheet = async () => {
    if (!sheetUrl) {
      Alert.alert('No Sheet Found', 'Your Google Sheet is being created or not available yet.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(sheetUrl);
      if (supported) {
        await Linking.openURL(sheetUrl);
      } else {
        Alert.alert('Error', 'Unable to open Google Sheet URL.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open sheet in browser.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Google Sheets Sync 📊</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: googleConnected ? COLORS.lime : COLORS.orange }]} />
                <Text style={styles.statusText}>
                  {googleConnected ? 'Live Cloud Sync Connected' : 'Sync Active via Service Account'}
                </Text>
              </View>
              <Text style={styles.description}>
                Every transaction and budget update is automatically calculated and mirrored to your private Google Spreadsheet.
              </Text>
            </View>

            {/* Service Account Email Info */}
            {serviceAccountEmail ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Bot Service Account</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {serviceAccountEmail}
                </Text>
                <Text style={styles.infoSub}>
                  Has editor access to update your spreadsheet in background threads.
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            {sheetUrl ? (
              <TouchableOpacity style={styles.openBtn} onPress={handleOpenSheet}>
                <Text style={styles.openBtnText}>Open in Google Sheets ↗</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.disabledBtn}>
                <Text style={styles.disabledBtnText}>Google Sheet Initializing...</Text>
              </View>
            )}

            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(7, 8, 11, 0.8)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(53, 212, 241, 0.3)',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.cyan,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  openBtn: {
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.bgDark,
    textAlign: 'center',
  },
  disabledBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  disabledBtnText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default GoogleConnectModal;
