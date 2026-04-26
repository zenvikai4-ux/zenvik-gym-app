import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useTrainers, useMembers, useInsertActivity,
  useEnabledModules, useInsertTrainer,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export default function TrainersScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { data: trainers = [], isLoading } = useTrainers(user?.gym_id);
  const { data: members = [] } = useMembers(user?.gym_id);
  const { data: enabledModules } = useEnabledModules(user?.gym_id);
  const insertTrainer = useInsertTrainer();
  const insertActivity = useInsertActivity();
  const qc = useQueryClient();

  // Check if Trainer Login module is active
  const trainerLoginEnabled = enabledModules?.has('trainer login') ?? false;

  const [showAdd, setShowAdd] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', specialization: '' });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', specialization: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setFormError('');
    if (!form.name || !form.phone) { setFormError('Name and phone are required'); return; }
    if (trainerLoginEnabled) {
      if (!form.email) { setFormError('Email is required for trainer login'); return; }
      if (!form.password || form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    }

    if (trainerLoginEnabled && form.email && form.password) {
      // Create with login account
      insertTrainer.mutate({
        gym_id: user?.gym_id || '',
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        specialization: form.specialization || undefined,
      }, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Added trainer', details: `${form.name} (login created)` });
          setShowAdd(false);
          setForm({ name: '', email: '', phone: '', password: '', specialization: '' });
        },
        onError: (e: any) => setFormError(e.message),
      });
    } else {
      // No login module — create auth user with system password (view-only)
      // This satisfies the FK constraint. Trainer can't login with this password.
      const systemEmail = form.email || `trainer_${Date.now()}@${user?.gym_id?.slice(0,8)}.gymapp.local`;
      const systemPassword = `sys_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      insertTrainer.mutate({
        gym_id: user?.gym_id || '',
        name: form.name,
        email: systemEmail,
        password: systemPassword,
        phone: form.phone || undefined,
        specialization: form.specialization || undefined,
      }, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Added trainer', details: form.name });
          setShowAdd(false);
          setForm({ name: '', email: '', phone: '', password: '', specialization: '' });
        },
        onError: (e: any) => setFormError(e.message),
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    await supabase.from('profiles').delete().eq('id', pendingDelete.profile_id || pendingDelete.id);
    qc.invalidateQueries({ queryKey: ['trainers'] });
    insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Removed trainer', details: pendingDelete.name });
    setDeleteLoading(false);
    setPendingDelete(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEdit = async () => {
    if (!editingTrainer) return;
    setSaving(true);
    await supabase.from('profiles').update({ name: editForm.name, }).eq('id', editingTrainer.profile_id || editingTrainer.id);
    qc.invalidateQueries({ queryKey: ['trainers'] });
    setSaving(false);
    setEditingTrainer(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Trainers"
        subtitle={`${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}`}
        rightAction={{
          icon: <Ionicons name="add" size={22} color={Colors.primary} />,
          onPress: () => { Haptics.selectionAsync(); setShowAdd(true); },
        }}
      />

      {/* Module notice */}
      <View style={styles.moduleBar}>
        <Ionicons
          name={trainerLoginEnabled ? 'checkmark-circle' : 'information-circle-outline'}
          size={14}
          color={trainerLoginEnabled ? Colors.primary : Colors.textMuted}
        />
        <Text style={[styles.moduleBarText, { color: trainerLoginEnabled ? Colors.primary : Colors.textMuted }]}>
          {trainerLoginEnabled ? 'Trainer Login module active — trainers can log in to the app' : 'Trainer Login module not active — trainers are view-only'}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item: any) => item.id || item.profile_id}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 20, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trainers yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first trainer</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const clientCount = members.filter((m: any) => m.trainer_id === (item.profile_id || item.id)).length;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.specialization && <Text style={styles.spec}>{item.specialization}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={styles.clientBadge}>
                      <Ionicons name="people-outline" size={12} color={Colors.info} />
                      <Text style={styles.clientBadgeText}>{clientCount} clients</Text>
                    </View>
                    {trainerLoginEnabled && (
                      <Ionicons name="phone-portrait-outline" size={14} color={Colors.primary} />
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => {
                      setEditingTrainer(item);
                      setEditForm({ name: item.name, phone: item.phone || '', specialization: item.specialization || '' });
                    }}
                  >
                    <Ionicons name="pencil-outline" size={15} color={Colors.info} />
                    <Text style={[styles.actionBtnText, { color: Colors.info }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => setPendingDelete(item)}>
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Trainer Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Trainer</Text>
            <Pressable onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Trainer Name', keyboard: 'default' },
              { key: 'phone', label: 'Phone *', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
              { key: 'specialization', label: 'Specialization', placeholder: 'Weight training, Yoga...', keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.formField}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}

            {/* Login credentials - only if Trainer Login module enabled */}
            {trainerLoginEnabled && (
              <View style={styles.loginSection}>
                <View style={styles.loginHeader}>
                  <Ionicons name="phone-portrait-outline" size={16} color={Colors.primary} />
                  <Text style={styles.loginTitle}>App Login Credentials</Text>
                  <View style={styles.moduleTag}>
                    <Text style={styles.moduleTagText}>Trainer Login module</Text>
                  </View>
                </View>
                <Text style={styles.loginSub}>Trainer will use these to log in to the app</Text>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="trainer@gym.com"
                    placeholderTextColor={Colors.textMuted}
                    value={form.email}
                    onChangeText={v => setForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Password *</Text>
                  <View style={styles.passRow}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, borderWidth: 0 }]}
                      placeholder="Min 6 characters"
                      placeholderTextColor={Colors.textMuted}
                      value={form.password}
                      onChangeText={v => setForm(f => ({ ...f, password: v }))}
                      secureTextEntry={!showPass}
                    />
                    <Pressable onPress={() => setShowPass(s => !s)} style={{ padding: 10 }}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {!!formError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Pressable
              style={[styles.submitBtn, (insertTrainer.isPending) && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={insertTrainer.isPending}
            >
              {insertTrainer.isPending
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.submitBtnText}>
                    {trainerLoginEnabled ? 'Add Trainer + Create Login' : 'Add Trainer'}
                  </Text>
              }
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editingTrainer} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditingTrainer(null)}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Trainer</Text>
            <Pressable onPress={() => setEditingTrainer(null)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          {[
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'specialization', label: 'Specialization' },
          ].map(f => (
            <View key={f.key} style={styles.formField}>
              <Text style={styles.formLabel}>{f.label}</Text>
              <TextInput
                style={styles.formInput}
                value={(editForm as any)[f.key]}
                onChangeText={v => setEditForm(p => ({ ...p, [f.key]: v }))}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          ))}
          <Pressable style={[styles.submitBtn, saving && { opacity: 0.6 }]} onPress={handleEdit} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
          </Pressable>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!pendingDelete}
        title="Remove Trainer"
        message={`Remove ${pendingDelete?.name}? Their clients will be unassigned.`}
        confirmLabel="Remove"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  moduleBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, backgroundColor: Colors.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border },
  moduleBarText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.primary },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  email: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  spec: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, marginTop: 2 },
  clientBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.info + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.info + '30' },
  clientBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.info },
  cardActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  formField: { gap: 6, marginBottom: 16 },
  formLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: Colors.card, borderRadius: 12, height: 46, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  loginSection: { backgroundColor: Colors.primary + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: 16 },
  loginHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  loginTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary, flex: 1 },
  loginSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  moduleTag: { backgroundColor: Colors.primary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  moduleTagText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.primary },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, height: 46 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  submitBtn: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
});
