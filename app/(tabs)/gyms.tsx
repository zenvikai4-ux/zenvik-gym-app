import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  useGyms, useUpdateGym, useDeleteGym, useInsertActivity,
  useMembers, useTrainers, useGymStats,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// ── Gym profile card ──────────────────────────────────────────────────
function GymCard({ gym, onEdit, onDelete, onToggle }: {
  gym: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { data: stats } = useGymStats(expanded ? gym.id : null);

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={() => setExpanded(e => !e)}>
        <View style={styles.gymAvatar}>
          <Text style={styles.gymAvatarText}>{(gym.name || 'G')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.gymInfo}>
          <Text style={styles.gymName}>{gym.name}</Text>
          <Text style={styles.gymEmail}>{gym.email || 'No email'}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: gym.is_active ? Colors.primary + '22' : Colors.danger + '22' }]}>
            <Text style={[styles.statusText, { color: gym.is_active ? Colors.primary : Colors.danger }]}>
              {gym.is_active ? 'Active' : 'Suspended'}
            </Text>
          </View>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn} hitSlop={10}>
            <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats?.trainerCount ?? '—'}</Text>
              <Text style={styles.statLabel}>Trainers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats?.memberCount ?? '—'}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{gym.plan || 'base'}</Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
          </View>
          {gym.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.detailText}>{gym.phone}</Text>
            </View>
          )}
          {gym.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.detailText}>{gym.address}</Text>
            </View>
          )}
          <Text style={styles.detailSub}>
            Created {new Date(gym.created_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Three-dot menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{gym.name}</Text>
            {[
              { label: 'Edit Gym', icon: 'pencil-outline', color: Colors.text, action: () => { setMenuVisible(false); onEdit(); } },
              { label: gym.is_active ? 'Suspend Gym' : 'Reactivate Gym', icon: gym.is_active ? 'pause-circle-outline' : 'play-circle-outline', color: Colors.warning, action: () => { setMenuVisible(false); onToggle(); } },
              { label: 'Delete Gym', icon: 'trash-outline', color: Colors.danger, action: () => { setMenuVisible(false); onDelete(); } },
            ].map(item => (
              <Pressable key={item.label} style={styles.menuItem} onPress={item.action}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
                <Text style={[styles.menuItemText, { color: item.color }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export default function GymsScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const { data: gyms = [], isLoading } = useGyms();
  const updateGym = useUpdateGym();
  const deleteGym = useDeleteGym();
  const insertActivity = useInsertActivity();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', owner_name: '', email: '', phone: '', password: '', address: '', whatsapp_number: '', instagram_handle: '', capacity: '' });
  const [formError, setFormError] = useState('');
  const [editGym, setEditGym] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [pendingToggle, setPendingToggle] = useState<any>(null);

  const filtered = gyms.filter((g: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });

  const handleAdd = async () => {
    setFormError('');
    if (!form.name || !form.owner_name || !form.email || !form.password) {
      setFormError('Gym name, owner name, email and password are required');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setAdding(true);

    try {
      // Step 1: Save the current admin session token so we can restore it
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const adminAccessToken = adminSession?.access_token;
      const adminRefreshToken = adminSession?.refresh_token;

      // Step 2: Create the gym record
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          address: form.address || null,
          whatsapp_number: form.whatsapp_number || null,
          instagram_handle: form.instagram_handle || null,
          capacity: form.capacity ? parseInt(form.capacity) : 50,
        })
        .select()
        .single();

      if (gymError) {
        setFormError(gymError.message);
        setAdding(false);
        return;
      }

      // Step 3: Sign up the new owner (this may switch the session)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.owner_name } },
      });

      if (signUpError && !signUpError.message.toLowerCase().includes('already')) {
        await supabase.from('gyms').delete().eq('id', gymData.id);
        setFormError(signUpError.message);
        setAdding(false);
        return;
      }

      const newUserId = signUpData?.user?.id;

      // Step 4: Immediately restore the admin session before doing anything else
      if (adminAccessToken && adminRefreshToken) {
        await supabase.auth.setSession({
          access_token: adminAccessToken,
          refresh_token: adminRefreshToken,
        });
      }

      // Step 4b: Auto-confirm the new user's email so they can login immediately
      await supabase.rpc('confirm_user_email' as any, { user_email: form.email });

      // Step 5: Create owner profile using the admin session
      if (newUserId) {
        await supabase.from('profiles').upsert({
          id: newUserId,
          name: form.owner_name,
          email: form.email,
          role: 'gym_owner',
          gym_id: gymData.id,
        });
      } else {
        // User already existed — find and update their profile
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', form.email)
          .maybeSingle();
        if (existing) {
          await supabase.from('profiles').update({
            gym_id: gymData.id,
            role: 'gym_owner',
          }).eq('id', existing.id);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['gyms'] });
      insertActivity.mutate({
        gym_id: gymData.id,
        actor_name: user?.name || 'Admin',
        action: 'Created gym account',
        details: `${form.name} (owner: ${form.owner_name})`,
      });
      setShowAdd(false);
      setForm({ name: '', owner_name: '', email: '', phone: '', password: '', address: '', whatsapp_number: '', instagram_handle: '', capacity: '' });
    } catch (e: any) {
      setFormError(e.message || 'Failed to create gym');
    }
    setAdding(false);
  };

  const handleEdit = () => {
    if (!editGym) return;
    updateGym.mutate(
      { id: editGym.id, name: editForm.name, email: editForm.email, phone: editForm.phone, address: editForm.address },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditGym(null);
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteGym.mutate(pendingDelete.id, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        insertActivity.mutate({ gym_id: null, actor_name: user?.name || 'Admin', action: 'Deleted gym', details: pendingDelete.name });
        setPendingDelete(null);
      },
      onError: (e: any) => { Alert.alert('Error', e.message); setPendingDelete(null); },
    });
  };

  const confirmToggle = () => {
    if (!pendingToggle) return;
    updateGym.mutate(
      { id: pendingToggle.id, is_active: !pendingToggle.is_active },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          insertActivity.mutate({
            gym_id: pendingToggle.id,
            actor_name: user?.name || 'Admin',
            action: pendingToggle.is_active ? 'Suspended gym' : 'Reactivated gym',
            details: pendingToggle.name,
          });
          setPendingToggle(null);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Gyms" subtitle={`${gyms.length} gym${gyms.length !== 1 ? 's' : ''}`} />

      {/* Add gym button at top */}
      <Pressable style={styles.addBar} onPress={() => setShowAdd(true)}>
        <Ionicons name="add-circle" size={18} color={Colors.primary} />
        <Text style={styles.addBarText}>Add New Gym</Text>
      </Pressable>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search gyms..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No gyms yet</Text>
              <Text style={styles.emptySub}>Tap "Add New Gym" to get started</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <GymCard
              gym={item}
              onEdit={() => { setEditGym(item); setEditForm({ name: item.name, email: item.email || '', phone: item.phone || '', address: item.address || '' }); }}
              onDelete={() => setPendingDelete(item)}
              onToggle={() => setPendingToggle(item)}
            />
          )}
        />
      )}

      {/* Add gym modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add New Gym</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Gym Name *', key: 'name', placeholder: 'FitZone Gym' },
                { label: 'Owner Name *', key: 'owner_name', placeholder: 'Rahul Sharma' },
                { label: 'Owner Email *', key: 'email', placeholder: 'owner@gym.com' },
                { label: 'Phone', key: 'phone', placeholder: '+91 98765 43210' },
                { label: 'Address', key: 'address', placeholder: 'Hyderabad, TS' },
                { label: 'WhatsApp Business No.', key: 'whatsapp_number', placeholder: '+91 98765 43210' },
                { label: 'Instagram Handle', key: 'instagram_handle', placeholder: '@gymname' },
                { label: 'Gym Capacity (members)', key: 'capacity', placeholder: '100' },
              ].map(f => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                    keyboardType={f.key === 'email' ? 'email-address' : f.key === 'phone' ? 'phone-pad' : 'default'}
                  />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password *</Text>
                <View style={styles.passWrap}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={Colors.textMuted}
                    value={form.password}
                    onChangeText={v => setForm(p => ({ ...p, password: v }))}
                    secureTextEntry={!showPass}
                  />
                  <Pressable onPress={() => setShowPass(s => !s)} style={{ padding: 10 }}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </Pressable>
                </View>
              </View>
              {!!formError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}
              <Text style={styles.infoText}>
                The email and password will be the login credentials for the gym owner.
              </Text>
              <Pressable
                style={[styles.submitBtn, adding && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? <ActivityIndicator color="#000" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
                    <Text style={styles.submitBtnText}>Create Gym & Owner Account</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit gym modal */}
      <Modal visible={!!editGym} animationType="slide" transparent onRequestClose={() => setEditGym(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Gym</Text>
              <Pressable onPress={() => setEditGym(null)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            {[
              { label: 'Gym Name', key: 'name' },
              { label: 'Email', key: 'email' },
              { label: 'Phone', key: 'phone' },
              { label: 'Address', key: 'address' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(editForm as any)[f.key]}
                  onChangeText={v => setEditForm(p => ({ ...p, [f.key]: v }))}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
            <Pressable
              style={[styles.submitBtn, updateGym.isPending && { opacity: 0.6 }]}
              onPress={handleEdit}
              disabled={updateGym.isPending}
            >
              {updateGym.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!pendingDelete}
        title="Delete Gym"
        message={`Delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmModal
        visible={!!pendingToggle}
        title={pendingToggle?.is_active ? 'Suspend Gym' : 'Reactivate Gym'}
        message={`${pendingToggle?.is_active ? 'Suspend' : 'Reactivate'} "${pendingToggle?.name}"?`}
        confirmLabel={pendingToggle?.is_active ? 'Suspend' : 'Reactivate'}
        destructive={pendingToggle?.is_active}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  addBarText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary, flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 8,
    backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  gymAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  gymAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.primary },
  gymInfo: { flex: 1 },
  gymName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  gymEmail: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  menuBtn: { padding: 4 },
  expandedBody: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 14, gap: 10 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.secondary, borderRadius: 10, overflow: 'hidden' },
  statBox: { flex: 1, alignItems: 'center', padding: 12 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  detailSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  menuOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  menuTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuItemText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  sheetOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%', paddingBottom: 36 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  fieldGroup: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 10, height: 44,
    paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  passWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, height: 44 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, marginBottom: 14, lineHeight: 18 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, marginTop: 4,
  },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
});
