import React from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: string;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  icon = 'alert-circle-outline',
}: ConfirmModalProps) {
  const accentColor = destructive ? Colors.danger : Colors.primary;
  const accentBg = destructive ? Colors.dangerMuted : Colors.primaryMuted;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <Ionicons name={icon as any} size={28} color={accentColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: accentColor }, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={destructive ? '#fff' : '#000'} size="small" />
                : <Text style={[styles.confirmText, { color: destructive ? '#fff' : '#000' }]}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  message: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.textSecondary },
  confirmBtn: {
    flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
