import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  TextInput, ActivityIndicator, Modal, Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useClientProfiles, useWeightHistory, useUpdateClientProfile, useBroadcast,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

type SessionFilter = 'all' | 'morning' | 'evening';

export default function ClientsScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const { data: profiles = [], isLoading } = useClientProfiles(
    user?.gym_id,  // always pass gym_id for isolation
    user?.role === 'trainer' ? user?.id : null,
  );
  const [search, setSearch] = useState('');
  const [session, setSession] = useState<SessionFilter>('all');
  const [selected, setSelected] = useState<any>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const broadcast = useBroadcast();

  const filtered = useMemo(() => {
    return profiles.filter((p: any) => {
      const nameMatch = !search || p.member?.name?.toLowerCase().includes(search.toLowerCase());
      const sessionMatch =
        session === 'all' ||
        (session === 'morning' && p.session_time === 'morning') ||
        (session === 'evening' && p.session_time === 'evening');
      return nameMatch && sessionMatch;
    });
  }, [profiles, search, session]);

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    if (!user?.gym_id) return;
    broadcast.mutate(
      {
        gym_id: user.gym_id,
        sender_name: user.name,
        message: broadcastMsg.trim(),
        recipient_type: 'my_clients',
        trainer_id: user.id,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBroadcastMsg('');
          setShowBroadcast(false);
          Alert.alert('Sent', 'Message broadcast to your clients.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="My Clients" />
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="My Clients" />
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No clients assigned</Text>
          <Text style={styles.emptySub}>Ask your gym owner to assign members to you</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Clients"
        subtitle={`${profiles.length} client${profiles.length !== 1 ? 's' : ''} assigned`}
      />

      {/* Broadcast bar */}
      <Pressable style={styles.broadcastBar} onPress={() => setShowBroadcast(true)}>
        <Ionicons name="megaphone-outline" size={16} color={Colors.primary} />
        <Text style={styles.broadcastText}>Send message to all clients</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </Pressable>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Session filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'morning', 'evening'] as SessionFilter[]).map(s => (
          <Pressable
            key={s}
            style={[styles.filterChip, session === s && styles.filterChipActive]}
            onPress={() => { setSession(s); Haptics.selectionAsync(); }}
          >
            <Ionicons
              name={s === 'morning' ? 'sunny-outline' : s === 'evening' ? 'moon-outline' : 'people-outline'}
              size={13}
              color={session === s ? '#000' : Colors.textSecondary}
            />
            <Text style={[styles.filterChipText, session === s && styles.filterChipTextActive]}>
              {s === 'all' ? 'All' : s === 'morning' ? 'Morning' : 'Evening'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyInline}>
            <Text style={styles.emptyText}>No clients match your filter</Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          const member = item.member;
          const daysLeft = member?.expiry_date
            ? Math.ceil((new Date(member.expiry_date).getTime() - Date.now()) / 86400000)
            : null;
          const statusColor =
            daysLeft === null ? Colors.textMuted
            : daysLeft < 0 ? Colors.danger
            : daysLeft <= 7 ? Colors.warning
            : Colors.primary;
          const statusLabel =
            daysLeft === null ? 'No expiry'
            : daysLeft < 0 ? 'Expired'
            : daysLeft <= 7 ? `Expires in ${daysLeft}d`
            : 'Active';

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              onPress={() => { Haptics.selectionAsync(); setSelected(item); }}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(member?.name || '?')[0]}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.clientName}>{member?.name || 'Unknown'}</Text>
                  {member?.phone && <Text style={styles.clientPhone}>{member.phone}</Text>}
                  {item.session_time && (
                    <View style={styles.sessionTag}>
                      <Ionicons
                        name={item.session_time === 'morning' ? 'sunny-outline' : 'moon-outline'}
                        size={10}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.sessionTagText}>
                        {item.session_time.charAt(0).toUpperCase() + item.session_time.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '50' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                {[
                  { label: 'Weight', value: item.weight_kg ? `${item.weight_kg} kg` : '—' },
                  { label: 'Target', value: item.target_weight ? `${item.target_weight} kg` : '—' },
                  { label: 'Height', value: item.height_cm ? `${item.height_cm} cm` : '—' },
                  { label: 'Goal', value: item.goal || '—' },
                ].map(s => (
                  <View key={s.label} style={styles.stat}>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <Text style={styles.statValue}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        }}
      />

      {/* Client detail modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && <ClientDetailModal profile={selected} onClose={() => setSelected(null)} />}
      </Modal>

      {/* Broadcast modal */}
      <Modal visible={showBroadcast} animationType="slide" transparent onRequestClose={() => setShowBroadcast(false)}>
        <View style={styles.overlay}>
          <View style={styles.broadcastModal}>
            <View style={styles.broadcastHeader}>
              <Text style={styles.broadcastTitle}>Broadcast to My Clients</Text>
              <Pressable onPress={() => setShowBroadcast(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.broadcastSub}>
              This message will be sent to all {profiles.length} of your assigned clients.
            </Text>
            <TextInput
              style={styles.broadcastInput}
              placeholder="Type your message..."
              placeholderTextColor={Colors.textMuted}
              value={broadcastMsg}
              onChangeText={setBroadcastMsg}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.sendBtn, (!broadcastMsg.trim() || broadcast.isPending) && { opacity: 0.5 }]}
              onPress={handleBroadcast}
              disabled={!broadcastMsg.trim() || broadcast.isPending}
            >
              {broadcast.isPending
                ? <ActivityIndicator color="#000" />
                : <>
                    <Ionicons name="send-outline" size={16} color="#000" />
                    <Text style={styles.sendBtnText}>Send to All Clients</Text>
                  </>
              }
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ClientDetailModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const updateProfile = useUpdateClientProfile();
  const { data: weightHistory = [] } = useWeightHistory(profile.id);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editForm, setEditForm] = useState({
    weight_kg: String(profile.weight_kg || ''),
    target_weight: String(profile.target_weight || ''),
    height_cm: String(profile.height_cm || ''),
    goal: profile.goal || '',
    dietary: profile.dietary || '',
    medical: profile.medical || '',
    trainer_notes: profile.trainer_notes || '',
    session_time: profile.session_time || 'morning',
  });

  const member = profile.member;
  const daysLeft = member?.expiry_date
    ? Math.ceil((new Date(member.expiry_date).getTime() - Date.now()) / 86400000)
    : null;
  const statusColor = daysLeft === null ? Colors.textMuted : daysLeft < 0 ? Colors.danger : daysLeft <= 7 ? Colors.warning : Colors.primary;
  const statusLabel = daysLeft === null ? 'No expiry' : daysLeft < 0 ? 'Expired' : daysLeft <= 7 ? `Expires in ${daysLeft}d` : `Active · ${daysLeft}d left`;

  const handleSave = () => {
    setSaveError('');
    updateProfile.mutate({
      id: profile.id,
      member_id: profile.member_id,
      gym_id: profile.member?.gym_id,
      trainer_id: profile.trainer_id,
      weight_kg: parseFloat(editForm.weight_kg) || null,
      target_weight: parseFloat(editForm.target_weight) || null,
      height_cm: parseFloat(editForm.height_cm) || null,
      goal: editForm.goal || null,
      dietary: editForm.dietary || null,
      medical: editForm.medical || null,
      trainer_notes: editForm.trainer_notes || null,
      session_time: editForm.session_time || null,
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditing(false);
      },
      onError: (e: any) => setSaveError(e.message),
    });
  };

  return (
    <View style={[modal.container, { paddingTop: insets.top }]}>
      <View style={modal.header}>
        <View style={modal.titleRow}>
          <View style={modal.avatar}>
            <Text style={modal.avatarText}>{(member?.name || '?')[0]}</Text>
          </View>
          <View>
            <Text style={modal.clientName}>{member?.name}</Text>
            <Text style={[modal.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={modal.headerActions}>
          <Pressable onPress={() => setEditing(!editing)} style={modal.editBtn}>
            <Ionicons name={editing ? 'close-outline' : 'pencil-outline'} size={18} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={onClose} style={modal.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={modal.content} showsVerticalScrollIndicator={false}>
        <View style={modal.card}>
          <Text style={modal.cardTitle}>Stats & Profile</Text>
          {editing ? (
            <>
              {[
                { label: 'Weight (kg)', field: 'weight_kg', keyboard: 'decimal-pad' },
                { label: 'Target Weight (kg)', field: 'target_weight', keyboard: 'decimal-pad' },
                { label: 'Height (cm)', field: 'height_cm', keyboard: 'decimal-pad' },
                { label: 'Goal', field: 'goal', keyboard: 'default' },
                { label: 'Dietary Restrictions', field: 'dietary', keyboard: 'default' },
                { label: 'Medical Notes', field: 'medical', keyboard: 'default' },
                { label: 'Trainer Notes', field: 'trainer_notes', keyboard: 'default' },
              ].map(({ label, field, keyboard }) => (
                <View key={field} style={modal.fieldGroup}>
                  <Text style={modal.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[modal.input, (field === 'trainer_notes' || field === 'medical') && { minHeight: 70 }]}
                    value={(editForm as any)[field]}
                    onChangeText={v => setEditForm(f => ({ ...f, [field]: v }))}
                    keyboardType={keyboard as any}
                    placeholderTextColor={Colors.textMuted}
                    multiline={field === 'trainer_notes' || field === 'medical'}
                  />
                </View>
              ))}
              {/* Session time picker */}
              <View style={modal.fieldGroup}>
                <Text style={modal.fieldLabel}>Session Time</Text>
                <View style={modal.sessionRow}>
                  {(['morning', 'evening', 'both'] as const).map(s => (
                    <Pressable
                      key={s}
                      style={[modal.sessionBtn, editForm.session_time === s && modal.sessionBtnActive]}
                      onPress={() => setEditForm(f => ({ ...f, session_time: s }))}
                    >
                      <Text style={[modal.sessionBtnText, editForm.session_time === s && modal.sessionBtnTextActive]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {!!saveError && (
                <View style={modal.errorBox}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={modal.errorText}>{saveError}</Text>
                </View>
              )}
              <Pressable
                style={[modal.saveBtn, updateProfile.isPending && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending
                  ? <ActivityIndicator color="#000" />
                  : <Text style={modal.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <View style={modal.statsGrid}>
                {[
                  { label: 'Weight', value: profile.weight_kg ? `${profile.weight_kg} kg` : '—' },
                  { label: 'Target', value: profile.target_weight ? `${profile.target_weight} kg` : '—' },
                  { label: 'Height', value: profile.height_cm ? `${profile.height_cm} cm` : '—' },
                  { label: 'BMI', value: profile.bmi ? String(profile.bmi) : '—' },
                  { label: 'Goal', value: profile.goal || '—' },
                  { label: 'Session', value: profile.session_time ? (profile.session_time.charAt(0).toUpperCase() + profile.session_time.slice(1)) : '—' },
                ].map(row => (
                  <View key={row.label} style={modal.statCell}>
                    <Text style={modal.statLabel}>{row.label}</Text>
                    <Text style={modal.statValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
              {profile.medical && (
                <View style={modal.noteBox}>
                  <Ionicons name="medical-outline" size={13} color={Colors.warning} />
                  <Text style={modal.noteText}>{profile.medical}</Text>
                </View>
              )}
              {profile.trainer_notes && (
                <View style={[modal.noteBox, { backgroundColor: Colors.primaryMuted }]}>
                  <Ionicons name="document-text-outline" size={13} color={Colors.primary} />
                  <Text style={[modal.noteText, { color: Colors.text }]}>{profile.trainer_notes}</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={modal.card}>
          <Text style={modal.cardTitle}>Weight History</Text>
          {weightHistory.length === 0 ? (
            <Text style={modal.emptyMini}>No weight entries yet</Text>
          ) : (
            weightHistory.slice(-8).map((w: any, i: number) => (
              <View key={w.id || i} style={modal.weightRow}>
                <Text style={modal.weightDate}>{new Date(w.recorded_at || w.date).toLocaleDateString()}</Text>
                <Text style={modal.weightVal}>{w.weight_kg || w.weight} kg</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  broadcastBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  broadcastText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary, flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  filterChipTextActive: { color: '#000' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.primary },
  info: { flex: 1 },
  clientName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  clientPhone: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sessionTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sessionTagText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '47%', backgroundColor: Colors.secondary, borderRadius: 8, padding: 8 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  emptyInline: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  broadcastModal: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  broadcastHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  broadcastTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  broadcastSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
  broadcastInput: {
    backgroundColor: Colors.secondary, borderRadius: 12, padding: 14,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, minHeight: 120,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, marginTop: 14,
  },
  sendBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.primary },
  clientName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primary + '40',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCell: { width: '47%', backgroundColor: Colors.secondary, borderRadius: 10, padding: 10 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.warningMuted, padding: 10, borderRadius: 8 },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  fieldGroup: { gap: 4, marginBottom: 8 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 10, height: 44,
    paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  sessionRow: { flexDirection: 'row', gap: 8 },
  sessionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  sessionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sessionBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  sessionBtnTextActive: { color: '#000' },
  saveBtn: {
    height: 44, backgroundColor: Colors.primary, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + '40',
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  weightRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  weightDate: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  weightVal: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  emptyMini: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
});
