import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, CATEGORY_META } from '../theme/colors';

const CATEGORIES = Object.keys(CATEGORY_META);

const getTodayFormatted = () => {
  const d = new Date();
  const options = { day: 'numeric', month: 'short' };
  return `Today · ${d.toLocaleDateString('en-IN', options)}`;
};

const getTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ExpenseModal = ({ visible, onClose, onSave, onDelete, expenseToEdit }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [amountStr, setAmountStr] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState('dining');
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const noteInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (expenseToEdit) {
      setAmountStr(String(expenseToEdit.amount || '0'));
      const cat = (expenseToEdit.category || 'dining').toLowerCase();
      setSelectedCategory(cat === 'food' ? 'dining' : cat);
      setNote(expenseToEdit.description || '');
      setIsEditingNote(false);
    } else {
      setAmountStr('0');
      setSelectedCategory('dining');
      setNote('');
      setIsEditingNote(false);
    }
  }, [expenseToEdit, visible]);

  // Listen to keyboard hide
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsEditingNote(false);
    });
    return () => hideSubscription.remove();
  }, []);

  // Keypad click handler
  const handleKeyPress = (key) => {
    if (key === 'backspace') {
      if (amountStr.length <= 1 || amountStr === '0') {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (key === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    // Numbers
    if (amountStr === '0') {
      setAmountStr(String(key));
      return;
    }

    // Prevent more than 2 decimal digits
    if (amountStr.includes('.')) {
      const parts = amountStr.split('.');
      const decimal = parts[1];
      if (decimal && decimal.length >= 2) return;
    }
    if (amountStr.length < 9) {
      setAmountStr(amountStr + String(key));
    }
  };

  const handleOpenNoteInput = () => {
    setIsEditingNote(true);
    setTimeout(() => {
      noteInputRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleDoneNote = () => {
    Keyboard.dismiss();
    setIsEditingNote(false);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amountStr);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Enter Amount', 'Please enter a valid expense amount.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: numAmount,
        category: selectedCategory === 'dining' ? 'food' : selectedCategory,
        description: note ? note.trim() : (CATEGORY_META[selectedCategory]?.label || 'Expense'),
        date: expenseToEdit?.date || getTodayIso(),
      };

      if (expenseToEdit && expenseToEdit.id) {
        payload.id = expenseToEdit.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save expense:', err);
      Alert.alert('Save Failed', err.response?.data?.error || err.message || 'Unable to record expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToEdit || !expenseToEdit.id) return;
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(expenseToEdit.id);
      }
    } catch (err) {
      console.warn('Delete error:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      onClose(); // Instantly close modal and slide down
    }
  };

  const numAmount = parseFloat(amountStr) || 0;
  const isSaveReady = numAmount > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.sheetContainer}>
          {/* Drag Handle Bar */}
          <View style={styles.dragHandle} />

          {/* Clean Header */}
          <View style={styles.topHeader}>
            <Text style={styles.headerTitle}>
              {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
            </Text>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Big Amount Display */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (isEditingNote) {
                  Keyboard.dismiss();
                  setIsEditingNote(false);
                }
              }}
              style={styles.amountDisplaySection}
            >
              <Text style={styles.amountText}>
                ₹{amountStr}
              </Text>
              <Text style={styles.amountSubtext}>
                Tap the keypad to enter amount
              </Text>
            </TouchableOpacity>

            {/* Category Selector Pills */}
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((catKey) => {
                  const meta = CATEGORY_META[catKey];
                  const isSelected = selectedCategory === catKey;
                  return (
                    <TouchableOpacity
                      key={catKey}
                      onPress={() => {
                        setSelectedCategory(catKey);
                        if (isEditingNote) {
                          Keyboard.dismiss();
                          setIsEditingNote(false);
                        }
                      }}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextActive,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Detail Rows (Date and Note) */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{getTodayFormatted()}</Text>
              </View>
              <View style={styles.detailDivider} />

              <TouchableOpacity
                style={styles.detailRow}
                onPress={handleOpenNoteInput}
                activeOpacity={0.7}
              >
                <Text style={styles.detailLabel}>Note</Text>
                <Text style={[styles.detailValue, !note && { color: COLORS.muted }]}>
                  {note || 'Add a note'}
                </Text>
              </TouchableOpacity>

              {/* Text Input for Note (Revealed when tapping Note) */}
              {isEditingNote && (
                <View style={styles.noteInputWrapper}>
                  <TextInput
                    ref={noteInputRef}
                    style={styles.inlineNoteInput}
                    placeholder="e.g. Dinner with team, Groceries..."
                    placeholderTextColor={COLORS.muted}
                    value={note}
                    onChangeText={setNote}
                    returnKeyType="done"
                    onSubmitEditing={handleDoneNote}
                  />
                  <TouchableOpacity style={styles.noteDoneBtn} onPress={handleDoneNote}>
                    <Text style={styles.noteDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Conditional Keypad: Only shown when NOT typing note */}
            {!isEditingNote && (
              <View style={styles.keypadGrid}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['.', '0', 'backspace'],
                ].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((k) => (
                      <TouchableOpacity
                        key={k}
                        style={styles.keypadKey}
                        onPress={() => handleKeyPress(k)}
                        activeOpacity={0.7}
                      >
                        {k === 'backspace' ? (
                          <Text style={styles.keypadBackIcon}>⌫</Text>
                        ) : (
                          <Text style={styles.keypadDigit}>{k}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Bottom Full-Width Action Button */}
            <TouchableOpacity
              style={[
                styles.bottomActionBtn,
                !isSaveReady && styles.bottomActionBtnDisabled,
                loading && { opacity: 0.6 },
              ]}
              disabled={!isSaveReady || loading}
              onPress={handleSave}
            >
              {loading ? (
                <ActivityIndicator color="#12141A" />
              ) : (
                <Text
                  style={[
                    styles.bottomActionBtnText,
                    !isSaveReady && styles.bottomActionBtnTextDisabled,
                  ]}
                >
                  {isSaveReady ? 'Save Expense' : 'Enter an amount'}
                </Text>
              )}
            </TouchableOpacity>

            {expenseToEdit && (
              <TouchableOpacity
                style={styles.deleteLinkBtn}
                onPress={handleDeleteClick}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteLinkText}>Delete transaction</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 28 }} />
          </ScrollView>

          {/* In-App Delete Confirmation Modal (Cross-platform Web & Mobile) */}
          {showDeleteConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>Delete Transaction</Text>
                <Text style={styles.confirmSubtitle}>
                  Are you sure you want to delete this ₹{amountStr} expense? This action cannot be undone.
                </Text>

                <View style={styles.confirmBtnRow}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmDeleteBtn, deleting && { opacity: 0.6 }]}
                    onPress={handleConfirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.confirmDeleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (COLORS) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(7, 8, 11, 0.75)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginBottom: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  amountDisplaySection: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  amountText: {
    fontSize: 44,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -1,
  },
  amountSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: '#EDEEF0',
    borderColor: '#EDEEF0',
  },
  categoryPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#12141A',
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  noteInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inlineNoteInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  noteDoneBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  noteDoneBtnText: {
    color: '#12141A',
    fontWeight: '700',
    fontSize: 13,
  },
  keypadGrid: {
    gap: 8,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadKey: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 47, 58, 0.4)',
  },
  keypadDigit: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
  },
  keypadBackIcon: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  bottomActionBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bottomActionBtnDisabled: {
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottomActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#12141A',
    textAlign: 'center',
  },
  bottomActionBtnTextDisabled: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  deleteLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  deleteLinkText: {
    color: COLORS.expense,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 8, 11, 0.85)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  confirmDeleteBtn: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.expense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default ExpenseModal;
