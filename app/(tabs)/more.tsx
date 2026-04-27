import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Switch,
  ActivityIndicator, TextInput, Modal, Alert, Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  useLeads, useMembers, useTrainers, useBranches, useInsertBranch, useUpdateBranch,
  useDeleteBranch, useInsertActivity, useGyms,
  useInvoices, useInsertInvoice, useUpdateInvoice,
  useGymSubscriptions, useInsertGymSubscription, useUpdateGymSubscription, useDeleteGymSubscription,
  useModules, useGymModules, useUpsertGymModule,
  useWhatsappLogs, useInsertWhatsappLog,
  useWhatsappTemplates, useUpdateWhatsappTemplate,
  useGymSubscriptionByGym,
  useBroadcast, useInsertQuery,
  useInsertModule, useUpdateModule, useDeleteModule,
  useAutoInvoice, useGymModulePrice,
  useLatestInvoice, useUpsertGymSubscription,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const doSignOut = async () => {
    setShowSignOutConfirm(false);
    setLoggingOut(true);
    try {
      await logout();
    } catch (_) {}
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/login');
  };

  const handleLogout = () => {
    setShowSignOutConfirm(true);
  };

  const isAdmin = user?.role === 'super_admin';
  const isOwner = user?.role === 'gym_owner';
  const isTrainer = user?.role === 'trainer';
  const isMember = user?.role === 'member';

  const sections: { key: string; label: string; icon: string; color: string }[] = [];

  if (isAdmin) {
    sections.push(
      { key: 'gym_analytics', label: 'Gym Analytics', icon: 'bar-chart-outline', color: Colors.info },
      { key: 'branches', label: 'Gym Branches', icon: 'map-outline', color: Colors.primary },
      { key: 'modules', label: 'Modules & Pricing', icon: 'grid-outline', color: Colors.warning },
      { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
      { key: 'billing', label: 'Billing', icon: 'card-outline', color: Colors.info },
    );
  }

  if (isOwner) {
    sections.push(
      { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', color: Colors.info },
      { key: 'broadcast_owner', label: 'Broadcast Message', icon: 'megaphone-outline', color: '#25D366' },
      { key: 'my_modules', label: 'My Modules', icon: 'grid-outline', color: Colors.purple },
    );
  }

  if (isTrainer) {
    sections.push(
      { key: 'send_query', label: 'Send a Query', icon: 'help-circle-outline', color: Colors.info },
    );
  }

  if (isMember) {
    sections.push(
      { key: 'send_query', label: 'Send a Query', icon: 'help-circle-outline', color: Colors.info },
    );
  }

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'gym_owner' ? 'Gym Owner'
    : user?.role === 'trainer' ? 'Trainer'
    : 'Member';

  const roleColor =
    user?.role === 'super_admin' ? Colors.purple
    : user?.role === 'gym_owner' ? Colors.primary
    : user?.role === 'trainer' ? Colors.warning
    : Colors.info;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="More" subtitle={user?.name} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={[styles.userAvatar, { backgroundColor: roleColor + '22' }]}>
            <Text style={[styles.userAvatarText, { color: roleColor }]}>{(user?.name || 'U')[0]}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '15', borderColor: roleColor + '40' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {sections.map(section => (
          <Pressable
            key={section.key}
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.75 }]}
            onPress={() => { Haptics.selectionAsync(); setActiveSection(section.key); }}
          >
            <View style={[styles.menuIcon, { backgroundColor: section.color + '20' }]}>
              <Ionicons name={section.icon as any} size={20} color={section.color} />
            </View>
            <Text style={styles.menuLabel}>{section.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        ))}

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.75 }, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.dangerMuted }]}>
            {loggingOut
              ? <ActivityIndicator size="small" color={Colors.danger} />
              : <Ionicons name="log-out-outline" size={20} color={Colors.danger} />}
          </View>
          <Text style={[styles.menuLabel, { color: Colors.danger }]}>
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={activeSection === 'branches'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <BranchesSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'analytics'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <AnalyticsSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'gym_analytics'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <GymAnalyticsSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'modules'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <ModulesSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'whatsapp'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <WhatsAppSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'billing'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <BillingSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'broadcast_owner'} animationType="slide" transparent onRequestClose={() => setActiveSection(null)}>
        <BroadcastOwnerModal onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'send_query'} animationType="slide" transparent onRequestClose={() => setActiveSection(null)}>
        <SendQueryModal onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'my_modules'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <MyModulesSection onClose={() => setActiveSection(null)} />
      </Modal>

      {/* Custom sign-out confirmation (replaces Alert.alert which is blocked in iframes on web) */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <View style={signOutModal.overlay}>
          <View style={signOutModal.card}>
            <View style={signOutModal.iconWrap}>
              <Ionicons name="log-out-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={signOutModal.title}>Sign Out</Text>
            <Text style={signOutModal.message}>Are you sure you want to sign out of your account?</Text>
            <View style={signOutModal.buttons}>
              <Pressable style={signOutModal.cancelBtn} onPress={() => setShowSignOutConfirm(false)}>
                <Text style={signOutModal.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={signOutModal.confirmBtn} onPress={doSignOut} disabled={loggingOut}>
                {loggingOut
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={signOutModal.confirmText}>Sign Out</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[section.header, { paddingTop: insets.top + 12 }]}>
      <Text style={section.headerTitle}>{title}</Text>
      <Pressable onPress={onClose} style={section.closeBtn}>
        <Ionicons name="close" size={22} color={Colors.text} />
      </Pressable>
    </View>
  );
}

function BranchesSection({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const isAdmin = user?.role === 'super_admin';

  // Admin picks a gym; owner uses their own gym_id
  const [selectedGymId, setSelectedGymId] = useState(isAdmin ? '' : (user?.gym_id ?? ''));
  const { data: branches = [], isLoading } = useBranches(selectedGymId || null);
  const insertBranch = useInsertBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });
  const [formError, setFormError] = useState('');
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '' });
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const handleAdd = () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Branch name is required'); return; }
    if (!selectedGymId) { setFormError('Select a gym first'); return; }
    insertBranch.mutate(
      { name: form.name, location: form.location || null, gym_id: selectedGymId },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAdd(false); setForm({ name: '', location: '' });
        },
        onError: (e: any) => setFormError(e.message),
      }
    );
  };

  const handleEdit = () => {
    if (!editingBranch) return;
    updateBranch.mutate(
      { id: editingBranch.id, name: editForm.name, location: editForm.location || null },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditingBranch(null);
        },
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Gym Branches" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {/* Gym selector for admin */}
        {isAdmin && (
          <View style={section.formCard}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 }}>
              Select a gym to manage its branches
            </Text>
            <GymPicker gyms={gyms} value={selectedGymId} onChange={setSelectedGymId} />
          </View>
        )}

        {selectedGymId && (
          <>
            <Pressable
              style={[section.addBtn, showAdd && { backgroundColor: Colors.secondary }]}
              onPress={() => setShowAdd(s => !s)}
            >
              <Ionicons name={showAdd ? 'close-outline' : 'add'} size={18} color={Colors.primary} />
              <Text style={section.addBtnText}>{showAdd ? 'Cancel' : 'Add Branch'}</Text>
            </Pressable>

            {showAdd && (
              <View style={section.formCard}>
                <TextInput style={section.input} placeholder="Branch name *" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
                <TextInput style={[section.input, { marginTop: 8 }]} placeholder="Location / Area" placeholderTextColor={Colors.textMuted} value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />
                {!!formError && <Text style={{ color: Colors.danger, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 }}>{formError}</Text>}
                <Pressable style={[section.submitBtn, { marginTop: 10 }]} onPress={handleAdd} disabled={insertBranch.isPending}>
                  {insertBranch.isPending ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>Add Branch</Text>}
                </Pressable>
              </View>
            )}

            {isLoading && <ActivityIndicator color={Colors.primary} />}

            {branches.map((b: any) => (
              <View key={b.id} style={section.card}>
                {editingBranch?.id === b.id ? (
                  <>
                    <TextInput style={section.input} value={editForm.name} onChangeText={v => setEditForm(f => ({ ...f, name: v }))} placeholderTextColor={Colors.textMuted} />
                    <TextInput style={[section.input, { marginTop: 8 }]} value={editForm.location} onChangeText={v => setEditForm(f => ({ ...f, location: v }))} placeholder="Location" placeholderTextColor={Colors.textMuted} />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <Pressable style={[section.submitBtn, { flex: 1 }]} onPress={handleEdit} disabled={updateBranch.isPending}>
                        {updateBranch.isPending ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>Save</Text>}
                      </Pressable>
                      <Pressable style={[section.cancelBtn, { flex: 1 }]} onPress={() => setEditingBranch(null)}>
                        <Text style={section.cancelBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={section.name}>{b.name}</Text>
                      {b.location && <Text style={section.sub}>{b.location}</Text>}
                    </View>
                    <Pressable onPress={() => { setEditingBranch(b); setEditForm({ name: b.name, location: b.location || '' }); }} style={{ padding: 8 }}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.info} />
                    </Pressable>
                    <Pressable onPress={() => setPendingDelete(b)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {branches.length === 0 && !isLoading && (
              <Text style={section.empty}>No branches yet for this gym</Text>
            )}
          </>
        )}

        {!selectedGymId && isAdmin && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.textMuted, marginTop: 10 }}>Select a gym to manage branches</Text>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!pendingDelete}
        title="Delete Branch"
        message={`Delete branch "${pendingDelete?.name}"?`}
        confirmLabel="Delete"
        destructive={true}
        onConfirm={() => {
          deleteBranch.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}
function AnalyticsSection({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: leads = [] } = useLeads(user?.gym_id);
  const { data: members = [] } = useMembers(user?.gym_id);
  const { data: trainers = [] } = useTrainers(user?.gym_id);

  const activeMembers = members.filter((m: any) => m.status === 'active').length;
  const convCount = leads.filter((l: any) => l.status === 'member').length;
  const convRate = leads.length ? Math.round((convCount / leads.length) * 100) : 0;

  const funnelData = [
    { stage: 'Enquiry', count: leads.filter((l: any) => l.status === 'enquiry').length, color: Colors.info },
    { stage: 'Trial', count: leads.filter((l: any) => l.status === 'trial_booked').length, color: Colors.warning },
    { stage: 'Visited', count: leads.filter((l: any) => l.status === 'visited').length, color: Colors.purple },
    { stage: 'Member', count: leads.filter((l: any) => l.status === 'member').length, color: Colors.primary },
    { stage: 'Churned', count: leads.filter((l: any) => l.status === 'churned').length, color: Colors.danger },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Analytics" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>
        <View style={analytics.grid}>
          {[
            { label: 'Total Leads', value: leads.length, color: Colors.info },
            { label: 'Active Members', value: activeMembers, color: Colors.primary },
            { label: 'Conversion', value: `${convRate}%`, color: Colors.warning },
            { label: 'Trainers', value: trainers.length, color: Colors.purple },
          ].map(item => (
            <View key={item.label} style={[analytics.card, { borderTopColor: item.color }]}>
              <Text style={analytics.cardLabel}>{item.label}</Text>
              <Text style={[analytics.cardValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Lead Funnel</Text>
          {funnelData.map(item => (
            <View key={item.stage} style={analytics.funnelRow}>
              <Text style={analytics.funnelLabel}>{item.stage}</Text>
              <View style={analytics.barWrapper}>
                <View style={[analytics.bar, {
                  width: `${leads.length ? (item.count / leads.length) * 100 : 0}%`,
                  backgroundColor: item.color,
                }]} />
              </View>
              <Text style={[analytics.funnelCount, { color: item.color }]}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Member Status</Text>
          {[
            { label: 'Active', value: activeMembers, color: Colors.primary },
            { label: 'Expiring', value: members.filter((m: any) => m.status === 'expiring').length, color: Colors.warning },
            { label: 'Expired', value: members.filter((m: any) => m.status === 'expired').length, color: Colors.danger },
          ].map(item => (
            <View key={item.label} style={analytics.funnelRow}>
              <Text style={analytics.funnelLabel}>{item.label}</Text>
              <View style={analytics.barWrapper}>
                <View style={[analytics.bar, {
                  width: `${members.length ? (item.value / members.length) * 100 : 0}%`,
                  backgroundColor: item.color,
                }]} />
              </View>
              <Text style={[analytics.funnelCount, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function GymAnalyticsSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const { data: allMembers = [] } = useMembers();
  const { data: allLeads = [] } = useLeads();
  const { data: allTrainers = [] } = useTrainers();

  const activeGyms = gyms.filter((g: any) => g.is_active).length;
  const planCounts: Record<string, number> = {};
  gyms.forEach((g: any) => { planCounts[g.plan] = (planCounts[g.plan] || 0) + 1; });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Gym Analytics" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>
        <View style={analytics.grid}>
          {[
            { label: 'Total Gyms', value: gyms.length, color: Colors.primary },
            { label: 'Active Gyms', value: activeGyms, color: Colors.info },
            { label: 'Total Members', value: allMembers.length, color: Colors.warning },
            { label: 'Total Leads', value: allLeads.length, color: Colors.purple },
          ].map(item => (
            <View key={item.label} style={[analytics.card, { borderTopColor: item.color }]}>
              <Text style={analytics.cardLabel}>{item.label}</Text>
              <Text style={[analytics.cardValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Gyms by Plan</Text>
          {Object.entries(planCounts).map(([plan, count]) => (
            <View key={plan} style={analytics.funnelRow}>
              <Text style={[analytics.funnelLabel, { textTransform: 'capitalize' }]}>{plan}</Text>
              <View style={analytics.barWrapper}>
                <View style={[analytics.bar, {
                  width: `${gyms.length ? (count / gyms.length) * 100 : 0}%`,
                  backgroundColor: Colors.primary,
                }]} />
              </View>
              <Text style={[analytics.funnelCount, { color: Colors.primary }]}>{count}</Text>
            </View>
          ))}
          {Object.keys(planCounts).length === 0 && (
            <Text style={section.empty}>No gyms yet</Text>
          )}
        </View>

        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Members per Gym</Text>
          {gyms.slice(0, 10).map((g: any) => {
            const cnt = allMembers.filter((m: any) => m.gym_id === g.id).length;
            const max = Math.max(...gyms.map((gym: any) => allMembers.filter((m: any) => m.gym_id === gym.id).length), 1);
            return (
              <View key={g.id} style={analytics.funnelRow}>
                <Text style={analytics.funnelLabel} numberOfLines={1}>{g.name}</Text>
                <View style={analytics.barWrapper}>
                  <View style={[analytics.bar, { width: `${(cnt / max) * 100}%`, backgroundColor: Colors.info }]} />
                </View>
                <Text style={[analytics.funnelCount, { color: Colors.info }]}>{cnt}</Text>
              </View>
            );
          })}
          {gyms.length === 0 && <Text style={section.empty}>No gyms yet</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── helper ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] ?? { label: status, color: Colors.textMuted };
  return (
    <View style={{ backgroundColor: s.color + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: s.color + '55' }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: s.color, textTransform: 'capitalize' }}>{s.label}</Text>
    </View>
  );
}

function GymPicker({ gyms, value, onChange }: { gyms: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = gyms.find(g => g.id === value);
  return (
    <View>
      <Pressable
        style={[section.input, { justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', height: 44 }]}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: selected ? Colors.text : Colors.textMuted }}>
          {selected ? selected.name : 'Select Gym *'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </Pressable>
      {open && (
        <View style={{ backgroundColor: Colors.secondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 4, maxHeight: 180 }}>
          <ScrollView nestedScrollEnabled>
            {gyms.map(g => (
              <Pressable
                key={g.id}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}
                onPress={() => { onChange(g.id); setOpen(false); }}
              >
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: g.id === value ? Colors.primary : Colors.text }}>{g.name}</Text>
              </Pressable>
            ))}
            {gyms.length === 0 && <Text style={{ padding: 12, color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 13 }}>No gyms found</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── PLANS SECTION ────────────────────────────────────────────────────────────
const PLAN_OPTIONS = [
  { value: 'base', label: 'Base', price: '₹999/mo', color: Colors.info },
  { value: 'classic', label: 'Classic', price: '₹1,299/mo', color: Colors.purple },
  { value: 'pro', label: 'Pro', price: '₹1,999/mo', color: Colors.warning },
];

const SUB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: Colors.primary },
  expired: { label: 'Expired', color: Colors.danger },
  pending: { label: 'Pending', color: Colors.warning },
  cancelled: { label: 'Cancelled', color: Colors.textMuted },
};

function PlansSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const { data: subs = [], isLoading } = useGymSubscriptions();
  const insertSub = useInsertGymSubscription();
  const updateSub = useUpdateGymSubscription();
  const deleteSub = useDeleteGymSubscription();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ gym_id: '', plan_id: 'base', start_date: '', end_date: '', status: 'active' });
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ plan_id: '', start_date: '', end_date: '', status: '' });
  const [editError, setEditError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const planCounts = PLAN_OPTIONS.reduce<Record<string, number>>((acc, p) => {
    acc[p.value] = subs.filter((s: any) => s.plan_id === p.value).length;
    return acc;
  }, {});

  const filtered = statusFilter === 'all' ? subs : subs.filter((s: any) => s.status === statusFilter);

  const handleAdd = () => {
    setFormError('');
    if (!form.gym_id) { setFormError('Please select a gym'); return; }
    if (!form.start_date || !form.end_date) { setFormError('Start and end dates are required (YYYY-MM-DD)'); return; }
    insertSub.mutate(
      { gym_id: form.gym_id, plan_id: form.plan_id, start_date: form.start_date, end_date: form.end_date, status: form.status },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAdd(false);
          setForm({ gym_id: '', plan_id: 'base', start_date: '', end_date: '', status: 'active' });
        },
        onError: (e: any) => setFormError(e.message),
      }
    );
  };

  const handleUpdate = () => {
    setEditError('');
    if (!editingId) return;
    updateSub.mutate(
      { id: editingId, plan_id: editForm.plan_id, start_date: editForm.start_date, end_date: editForm.end_date, status: editForm.status },
      {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setEditingId(null); },
        onError: (e: any) => setEditError(e.message),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Plans" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PLAN_OPTIONS.map(p => (
            <View key={p.value} style={[planSt.planCard, { borderTopColor: p.color, flex: 1 }]}>
              <Text style={[planSt.planLabel, { color: p.color }]}>{p.label}</Text>
              <Text style={planSt.planPrice}>{p.price}</Text>
              <Text style={planSt.planCount}>{planCounts[p.value] ?? 0} gyms</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[section.addBtn, showAdd && { backgroundColor: Colors.secondary }]}
          onPress={() => setShowAdd(!showAdd)}
        >
          <Ionicons name={showAdd ? 'close-outline' : 'add'} size={18} color={Colors.purple} />
          <Text style={[section.addBtnText, { color: Colors.purple }]}>{showAdd ? 'Cancel' : 'Add Subscription'}</Text>
        </Pressable>

        {showAdd && (
          <View style={section.formCard}>
            <GymPicker gyms={gyms} value={form.gym_id} onChange={id => setForm(f => ({ ...f, gym_id: id }))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PLAN_OPTIONS.map(p => (
                <Pressable
                  key={p.value}
                  style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: form.plan_id === p.value ? p.color + '22' : Colors.secondary,
                    borderColor: form.plan_id === p.value ? p.color : Colors.border }}
                  onPress={() => setForm(f => ({ ...f, plan_id: p.value }))}
                >
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: form.plan_id === p.value ? p.color : Colors.textSecondary }}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={section.input} placeholder="Start Date (YYYY-MM-DD) *" placeholderTextColor={Colors.textMuted} value={form.start_date} onChangeText={v => setForm(f => ({ ...f, start_date: v }))} />
            <TextInput style={section.input} placeholder="End Date (YYYY-MM-DD) *" placeholderTextColor={Colors.textMuted} value={form.end_date} onChangeText={v => setForm(f => ({ ...f, end_date: v }))} />
            {!!formError && (
              <View style={section.errorBox}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                <Text style={section.errorText}>{formError}</Text>
              </View>
            )}
            <Pressable style={section.submitBtn} onPress={handleAdd} disabled={insertSub.isPending}>
              {insertSub.isPending ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>Add Subscription</Text>}
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'active', 'expired', 'pending', 'cancelled'].map(s => (
            <Pressable
              key={s}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                backgroundColor: statusFilter === s ? Colors.purple + '22' : Colors.secondary,
                borderColor: statusFilter === s ? Colors.purple : Colors.border }}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: statusFilter === s ? Colors.purple : Colors.textSecondary, textTransform: 'capitalize' }}>{s}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={Colors.purple} />}
        {filtered.map((sub: any) => {
          const gymName = sub.gym?.name ?? 'Unknown Gym';
          const plan = PLAN_OPTIONS.find(p => p.value === sub.plan_id);
          const isEditing = editingId === sub.id;
          return (
            <View key={sub.id} style={section.card}>
              {isEditing ? (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PLAN_OPTIONS.map(p => (
                      <Pressable
                        key={p.value}
                        style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: editForm.plan_id === p.value ? p.color + '22' : Colors.secondary,
                          borderColor: editForm.plan_id === p.value ? p.color : Colors.border }}
                        onPress={() => setEditForm(f => ({ ...f, plan_id: p.value }))}
                      >
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: editForm.plan_id === p.value ? p.color : Colors.textSecondary }}>{p.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput style={section.input} value={editForm.start_date} onChangeText={v => setEditForm(f => ({ ...f, start_date: v }))} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={section.input} value={editForm.end_date} onChangeText={v => setEditForm(f => ({ ...f, end_date: v }))} placeholder="End Date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} />
                  {!!editError && (
                    <View style={section.errorBox}>
                      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                      <Text style={section.errorText}>{editError}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[section.submitBtn, { flex: 1 }]} onPress={handleUpdate} disabled={updateSub.isPending}>
                      {updateSub.isPending ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>Update</Text>}
                    </Pressable>
                    <Pressable style={[section.cancelBtn, { flex: 1 }]} onPress={() => setEditingId(null)}>
                      <Text style={section.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name="layers-outline" size={18} color={plan?.color ?? Colors.purple} />
                    <Text style={[section.name, { flex: 1 }]} numberOfLines={1}>{gymName}</Text>
                    <StatusBadge status={sub.status ?? 'active'} map={SUB_STATUS_MAP} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: plan?.color ?? Colors.purple }}>{plan?.label ?? sub.plan_id ?? '—'} {plan?.price ? `· ${plan.price}` : ''}</Text>
                      <Text style={section.sub}>{fmtDate(sub.start_date)} → {fmtDate(sub.end_date)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable onPress={() => { setEditingId(sub.id); setEditForm({ plan_id: sub.plan_id ?? 'base', start_date: sub.start_date ?? '', end_date: sub.end_date ?? '', status: sub.status ?? 'active' }); }}>
                        <Ionicons name="pencil-outline" size={17} color={Colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => setPendingDelete(sub)}>
                        <Ionicons name="trash-outline" size={17} color={Colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {filtered.length === 0 && !isLoading && <Text style={section.empty}>No subscriptions found</Text>}
      </ScrollView>

      <ConfirmModal
        visible={!!pendingDelete}
        title="Delete Subscription"
        message={`Remove subscription for ${pendingDelete?.gym?.name ?? 'this gym'}?`}
        confirmLabel="Delete"
        destructive
        icon="trash-outline"
        loading={deleteSub.isPending}
        onConfirm={() => pendingDelete && deleteSub.mutate(pendingDelete.id, { onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setPendingDelete(null); } })}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

// ─── MODULES SECTION ──────────────────────────────────────────────────────────
function ModulesSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const { data: allModules = [], isLoading: loadingModules } = useModules();
  const insertModule = useInsertModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const [selectedGymId, setSelectedGymId] = useState("");
  const { data: gymModules = [], isLoading: loadingGymModules } = useGymModules(selectedGymId || null);
  const upsertModule = useUpsertGymModule();
  const autoInvoice = useAutoInvoice();
  const upsertSubscription = useUpsertGymSubscription();
  const { data: gymPrice = 0 } = useGymModulePrice(selectedGymId || null);

  const [activeTab, setActiveTab] = useState<"manage" | "assign">("manage");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [modForm, setModForm] = useState({ name: "", description: "", price: "" });
  const [modError, setModError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const enabledIds = new Set(
    gymModules.filter((gm: any) => gm.is_enabled).map((gm: any) => gm.module_id)
  );

  const openAddForm = () => {
    setEditingModId(null);
    setModForm({ name: "", description: "", price: "" });
    setModError("");
    setShowAddForm(true);
  };

  const openEditForm = (mod: any) => {
    setShowAddForm(false);
    setEditingModId(mod.id);
    setModForm({ name: mod.name, description: mod.description || "", price: String(mod.price || 0) });
    setModError("");
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingModId(null);
    setModForm({ name: "", description: "", price: "" });
    setModError("");
  };

  const handleSave = () => {
    setModError("");
    if (!modForm.name.trim()) { setModError("Module name is required"); return; }
    const price = parseFloat(modForm.price) || 0;
    if (editingModId) {
      updateModule.mutate(
        { id: editingModId, name: modForm.name.trim(), description: modForm.description.trim() || undefined, price },
        {
          onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); closeForm(); },
          onError: (e: any) => setModError(e.message),
        }
      );
    } else {
      insertModule.mutate(
        { name: modForm.name.trim(), description: modForm.description.trim() || undefined, price },
        {
          onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); closeForm(); },
          onError: (e: any) => setModError(e.message),
        }
      );
    }
  };

  const handleToggle = (moduleId: string, currentEnabled: boolean) => {
    if (!selectedGymId) return;
    setToggling(moduleId);
    upsertModule.mutate(
      { gym_id: selectedGymId, module_id: moduleId, is_enabled: !currentEnabled },
      { onSuccess: () => setToggling(null), onError: () => setToggling(null) }
    );
  };

  const handleGenerateInvoice = () => {
    if (!selectedGymId || (gymPrice as number) === 0) return;
    const gym = gyms.find((g: any) => g.id === selectedGymId);
    const today2 = new Date().toISOString().split('T')[0];
    const nextMonth2 = new Date();
    nextMonth2.setMonth(nextMonth2.getMonth() + 1);
    const endDate2 = nextMonth2.toISOString().split('T')[0];

    autoInvoice.mutate(
      {
        gym_id: selectedGymId,
        amount: gymPrice as number,
        description: `Monthly subscription — ${enabledIds.size} module${enabledIds.size !== 1 ? "s" : ""} for ${gym?.name}`,
      },
      {
        onSuccess: () => {
          upsertSubscription.mutate({
            gym_id: selectedGymId, plan: 'modules',
            amount: gymPrice as number, start_date: today2, end_date: endDate2,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Invoice Generated", `Rs.${(gymPrice as number).toLocaleString("en-IN")} invoice created for ${gym?.name}`);
        },
        onError: (e: any) => Alert.alert("Error", e.message),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Modules & Pricing" onClose={onClose} />

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: Colors.secondary, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: Colors.border }}>
        {(["manage", "assign"] as const).map(t => (
          <Pressable
            key={t}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: activeTab === t ? Colors.primary : "transparent" }}
            onPress={() => { setActiveTab(t); closeForm(); }}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: activeTab === t ? "#000" : Colors.textSecondary }}>
              {t === "manage" ? "Manage Modules" : "Assign to Gym"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {activeTab === "manage" && (
          <>
            {!showAddForm && !editingModId && (
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 13, borderWidth: 1, borderColor: Colors.primary + "40" }}
                onPress={openAddForm}
              >
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary, flex: 1 }}>Add New Module</Text>
              </Pressable>
            )}

            {(showAddForm || !!editingModId) && (
              <View style={section.formCard}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 12 }}>
                  {editingModId ? "Edit Module" : "New Module"}
                </Text>
                <TextInput style={section.input} placeholder="Module name *" placeholderTextColor={Colors.textMuted} value={modForm.name} onChangeText={v => setModForm(f => ({ ...f, name: v }))} />
                <TextInput style={[section.input, { marginTop: 8 }]} placeholder="Description (optional)" placeholderTextColor={Colors.textMuted} value={modForm.description} onChangeText={v => setModForm(f => ({ ...f, description: v }))} />
                <TextInput style={[section.input, { marginTop: 8 }]} placeholder="Price per month in rupees" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={modForm.price} onChangeText={v => setModForm(f => ({ ...f, price: v }))} />
                {!!modError && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.danger, marginTop: 6 }}>{modError}</Text>}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable style={[section.submitBtn, { flex: 1, opacity: (insertModule.isPending || updateModule.isPending) ? 0.6 : 1 }]} onPress={handleSave} disabled={insertModule.isPending || updateModule.isPending}>
                    {(insertModule.isPending || updateModule.isPending) ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>{editingModId ? "Save Changes" : "Add Module"}</Text>}
                  </Pressable>
                  <Pressable style={[section.cancelBtn, { flex: 1 }]} onPress={closeForm}>
                    <Text style={section.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {loadingModules ? <ActivityIndicator color={Colors.warning} /> : allModules.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <Ionicons name="grid-outline" size={40} color={Colors.textMuted} />
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted, marginTop: 10 }}>No modules yet. Add one above.</Text>
              </View>
            ) : (
              <View style={section.card}>
                <Text style={analytics.sectionTitle}>{allModules.length} module{allModules.length !== 1 ? "s" : ""} configured</Text>
                {allModules.map((mod: any) => (
                  <View key={mod.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text }}>{mod.name}</Text>
                      {!!mod.description && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>{mod.description}</Text>}
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary, marginTop: 3 }}>Rs.{(mod.price || 0).toLocaleString("en-IN")}/mo</Text>
                    </View>
                    <Pressable
                      onPress={() => editingModId === mod.id ? closeForm() : openEditForm(mod)}
                      style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: editingModId === mod.id ? Colors.primaryMuted : Colors.secondary, borderWidth: 1, borderColor: editingModId === mod.id ? Colors.primary + "40" : Colors.border }}
                    >
                      <Ionicons name={editingModId === mod.id ? "close-outline" : "pencil-outline"} size={16} color={editingModId === mod.id ? Colors.primary : Colors.info} />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteModule.mutate(mod.id)}
                      style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Colors.dangerMuted, borderWidth: 1, borderColor: Colors.danger + "40" }}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === "assign" && (
          <>
            <View style={section.formCard}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>Select a gym to assign modules</Text>
              <GymPicker gyms={gyms} value={selectedGymId} onChange={setSelectedGymId} />
            </View>

            {!selectedGymId ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="business-outline" size={40} color={Colors.textMuted} />
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted, marginTop: 10 }}>Select a gym above</Text>
              </View>
            ) : allModules.length === 0 ? (
              <Text style={section.empty}>No modules configured. Go to Manage Modules tab first.</Text>
            ) : loadingGymModules ? <ActivityIndicator color={Colors.primary} /> : (
              <View style={section.card}>
                <Text style={analytics.sectionTitle}>Toggle modules for this gym</Text>
                {allModules.map((mod: any) => {
                  const isEnabled = enabledIds.has(mod.id);
                  const isTogglingThis = toggling === mod.id;
                  return (
                    <Pressable
                      key={mod.id}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, opacity: isTogglingThis ? 0.6 : 1 }}
                      onPress={() => handleToggle(mod.id, isEnabled)}
                      disabled={isTogglingThis}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isEnabled ? Colors.primaryMuted : Colors.secondary, borderWidth: 1.5, borderColor: isEnabled ? Colors.primary : Colors.border }}>
                        {isTogglingThis ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={isEnabled ? "checkmark-circle" : "ellipse-outline"} size={20} color={isEnabled ? Colors.primary : Colors.textMuted} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text }}>{mod.name}</Text>
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: isEnabled ? Colors.primary : Colors.textMuted }}>
                          Rs.{(mod.price || 0).toLocaleString("en-IN")}/mo — {isEnabled ? "Enabled" : "Disabled"}
                        </Text>
                      </View>
                      <Ionicons name={isEnabled ? "toggle" : "toggle-outline"} size={28} color={isEnabled ? Colors.primary : Colors.textMuted} />
                    </Pressable>
                  );
                })}
                <View style={{ marginTop: 14, backgroundColor: enabledIds.size > 0 ? Colors.primaryMuted : Colors.secondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: enabledIds.size > 0 ? Colors.primary + "40" : Colors.border }}>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary }}>{enabledIds.size} of {allModules.length} modules enabled</Text>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 26, color: enabledIds.size > 0 ? Colors.primary : Colors.textMuted, marginVertical: 4 }}>
                    Rs.{(gymPrice as number).toLocaleString("en-IN")}<Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary }}>/month</Text>
                  </Text>
                  <Pressable
                    style={[section.submitBtn, { opacity: (gymPrice as number) === 0 || autoInvoice.isPending ? 0.5 : 1 }]}
                    onPress={handleGenerateInvoice}
                    disabled={(gymPrice as number) === 0 || autoInvoice.isPending}
                  >
                    {autoInvoice.isPending ? <ActivityIndicator color="#000" /> : <><Ionicons name="receipt-outline" size={16} color="#000" /><Text style={section.submitBtnText}>Generate Invoice</Text></>}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── WHATSAPP SECTION ─────────────────────────────────────────────────────────
const WA_STATUS_MAP: Record<string, { label: string; color: string }> = {
  sent: { label: 'Sent', color: Colors.primary },
  delivered: { label: 'Delivered', color: Colors.info },
  failed: { label: 'Failed', color: Colors.danger },
  pending: { label: 'Pending', color: Colors.warning },
  processing: { label: 'Processing', color: Colors.info },
};

const WA_CONN_MAP: Record<string, { label: string; color: string }> = {
  connected: { label: 'Connected', color: Colors.primary },
  connecting: { label: 'Connecting', color: Colors.warning },
  disconnected: { label: 'Disconnected', color: Colors.danger },
};


function WhatsAppSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: gyms = [] } = useGyms();
  const { data: logs = [], isLoading: loadingLogs } = useWhatsappLogs();
  const [tab, setTab] = useState<'setup' | 'logs'>('setup');
  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const [waForm, setWaForm] = useState({ whatsapp_number: '', whatsapp_phone_id: '', auto_reply_message: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSaveWA = async (gymId: string) => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('gyms').update({
      whatsapp_number: waForm.whatsapp_number || null,
      whatsapp_phone_id: waForm.whatsapp_phone_id || null,
      auto_reply_message: waForm.auto_reply_message || null,
    }).eq('id', gymId);
    setSaving(false);
    if (error) { setSaveMsg('Error: ' + error.message); }
    else { setSaveMsg('✅ Saved successfully!'); setEditingGymId(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="WhatsApp Setup" onClose={onClose} />

      {/* Tab selector */}
      <View style={{ flexDirection: 'row', margin: 16, backgroundColor: Colors.secondary, borderRadius: 12, padding: 4 }}>
        {(['setup', 'logs'] as const).map(t => (
          <Pressable
            key={t}
            style={[{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
              tab === t && { backgroundColor: Colors.card }]}
            onPress={() => setTab(t)}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13,
              color: tab === t ? Colors.primary : Colors.textMuted }}>
              {t === 'setup' ? 'Setup' : 'Message Logs'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'setup' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Info box */}
          <View style={{ backgroundColor: Colors.info + '15', borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: Colors.info + '40', flexDirection: 'row', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.info }}>
                Meta WhatsApp API Setup
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                Each gym needs a WhatsApp Business number added to your Meta account. Contact Zenvik AI to add a number.
              </Text>
            </View>
          </View>

          {gyms.map((gym: any) => (
            <View key={gym.id} style={{ backgroundColor: Colors.card, borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: Colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text }}>{gym.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4,
                      backgroundColor: gym.whatsapp_phone_id ? Colors.primary : Colors.danger }} />
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12,
                      color: gym.whatsapp_phone_id ? Colors.primary : Colors.danger }}>
                      {gym.whatsapp_phone_id ? 'Connected' : 'Not configured'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    setEditingGymId(editingGymId === gym.id ? null : gym.id);
                    setWaForm({
                      whatsapp_number: gym.whatsapp_number || '',
                      whatsapp_phone_id: gym.whatsapp_phone_id || '',
                      auto_reply_message: gym.auto_reply_message || '',
                    });
                    setSaveMsg('');
                  }}
                  style={{ backgroundColor: Colors.primaryMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary }}>
                    {editingGymId === gym.id ? 'Cancel' : 'Configure'}
                  </Text>
                </Pressable>
              </View>

              {gym.whatsapp_phone_id && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted }}>
                    Number: {gym.whatsapp_number || 'Not set'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted }}>
                    Phone ID: {gym.whatsapp_phone_id}
                  </Text>
                </View>
              )}

              {editingGymId === gym.id && (
                <View style={{ marginTop: 12, gap: 10 }}>
                  {[
                    { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+91 98765 43210' },
                    { key: 'whatsapp_phone_id', label: 'Phone Number ID (from Meta)', placeholder: '1234567890' },
                    { key: 'auto_reply_message', label: 'Auto-reply Message (optional)', placeholder: 'Hi! Thanks for contacting us...' },
                  ].map(f => (
                    <View key={f.key}>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</Text>
                      <TextInput
                        style={{ backgroundColor: Colors.secondary, borderRadius: 10, height: 44,
                          paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14,
                          color: Colors.text, borderWidth: 1, borderColor: Colors.border }}
                        placeholder={f.placeholder}
                        placeholderTextColor={Colors.textMuted}
                        value={(waForm as any)[f.key]}
                        onChangeText={v => setWaForm(p => ({ ...p, [f.key]: v }))}
                      />
                    </View>
                  ))}
                  {!!saveMsg && (
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13,
                      color: saveMsg.startsWith('✅') ? Colors.primary : Colors.danger }}>{saveMsg}</Text>
                  )}
                  <Pressable
                    style={{ backgroundColor: Colors.primary, borderRadius: 10, height: 44,
                      alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
                    onPress={() => handleSaveWA(gym.id)}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#000" /> :
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Save Configuration</Text>
                    }
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'logs' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {loadingLogs ? <ActivityIndicator color={Colors.primary} /> :
            logs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.textMuted, marginTop: 12 }}>
                  No message logs yet
                </Text>
              </View>
            ) : logs.map((log: any) => (
              <View key={log.id} style={{ backgroundColor: Colors.card, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: Colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text }}>
                    {log.sender_name || 'System'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>
                    {new Date(log.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>
                  {log.message}
                </Text>
              </View>
            ))
          }
        </ScrollView>
      )}
    </View>
  );
}


function BillingSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const { data: invoices = [], isLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();
  const autoInvoice = useAutoInvoice();
  const upsertSubscription = useUpsertGymSubscription();

  const [statusFilter, setStatusFilter] = useState('all');
  const [filterGym, setFilterGym] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const totalPaid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
  const totalPending = invoices.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;

  const filtered = invoices
    .filter((i: any) => statusFilter === 'all' || i.status === statusFilter)
    .filter((i: any) => !filterGym || i.gym_id === filterGym);

  const togglePaid = (inv: any) => {
    const newStatus = inv.status === 'paid' ? 'pending' : 'paid';
    const updates: any = { status: newStatus };
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString();
    else updates.paid_at = null;
    updateInvoice.mutate({ id: inv.id, ...updates }, {
      onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    });
  };

  const handleAutoGenerate = async (gym: any) => {
    setGenerating(gym.id);
    // Get enabled modules price for this gym
    const { data: gymMods } = await supabase
      .from('gym_modules')
      .select('is_enabled, module:modules(price)')
      .eq('gym_id', gym.id)
      .eq('is_enabled', true);
    const total = (gymMods ?? []).reduce((sum: number, gm: any) => sum + (gm.module?.price ?? 0), 0);
    if (total === 0) {
      Alert.alert('No Modules', `${gym.name} has no enabled modules. Enable modules first to auto-generate an invoice.`);
      setGenerating(null);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];

    autoInvoice.mutate(
      { gym_id: gym.id, amount: total, description: `Monthly subscription — enabled modules` },
      {
        onSuccess: () => {
          // Also record subscription dates
          upsertSubscription.mutate({
            gym_id: gym.id, plan: 'modules',
            amount: total, start_date: today, end_date: endDate,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Invoice Created', `Rs.${total.toLocaleString('en-IN')} invoice for ${gym.name}\nSubscription: ${today} → ${endDate}`);
          setGenerating(null);
        },
        onError: (e: any) => { Alert.alert('Error', e.message); setGenerating(null); },
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Billing" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {/* Summary cards */}
        <View style={analytics.grid}>
          {[
            { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: Colors.primary },
            { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: Colors.warning },
            { label: 'Overdue', value: overdueCount, color: Colors.danger },
            { label: 'Total Invoices', value: invoices.length, color: Colors.info },
          ].map(item => (
            <View key={item.label} style={[analytics.card, { borderTopColor: item.color }]}>
              <Text style={analytics.cardLabel}>{item.label}</Text>
              <Text style={[analytics.cardValue, { color: item.color, fontSize: typeof item.value === 'string' ? 16 : 24 }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Auto-generate invoices per gym */}
        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Auto-Generate Invoices</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginBottom: 10 }}>
            Generates invoice based on enabled modules and their prices for each gym.
          </Text>
          {gyms.map((gym: any) => (
            <View key={gym.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text }}>{gym.name}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>
                  Started: {new Date(gym.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: Colors.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary + '40', opacity: generating === gym.id ? 0.6 : 1 }}
                onPress={() => handleAutoGenerate(gym)}
                disabled={generating === gym.id}
              >
                {generating === gym.id
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Ionicons name="receipt-outline" size={14} color={Colors.primary} />
                }
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary }}>Generate</Text>
              </Pressable>
            </View>
          ))}
          {gyms.length === 0 && <Text style={section.empty}>No gyms yet</Text>}
        </View>

        {/* Filters */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'paid', 'pending', 'overdue'].map(s => (
            <Pressable
              key={s}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                backgroundColor: statusFilter === s ? Colors.info + '22' : Colors.secondary,
                borderColor: statusFilter === s ? Colors.info : Colors.border }}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: statusFilter === s ? Colors.info : Colors.textSecondary, textTransform: 'capitalize' }}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <GymPicker gyms={[{ id: '', name: 'All Gyms' }, ...gyms]} value={filterGym} onChange={setFilterGym} />

        {isLoading && <ActivityIndicator color={Colors.info} />}

        {filtered.map((inv: any) => {
          const gymName = inv.gym?.name ?? gyms.find((g: any) => g.id === inv.gym_id)?.name ?? 'Unknown Gym';
          const isPaid = inv.status === 'paid';
          return (
            <View key={inv.id} style={section.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="card-outline" size={18} color={INV_STATUS_MAP[inv.status ?? 'pending']?.color ?? Colors.info} />
                <Text style={[section.name, { flex: 1 }]} numberOfLines={1}>{gymName}</Text>
                <StatusBadge status={inv.status ?? 'pending'} map={INV_STATUS_MAP} />
              </View>
              {!!inv.description && <Text style={section.sub}>{inv.description}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <View>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text }}>₹{(inv.amount ?? 0).toLocaleString('en-IN')}</Text>
                  <Text style={section.sub}>Due: {fmtDate(inv.due_date)}{isPaid && inv.paid_at ? ` · Paid: ${fmtDate(inv.paid_at)}` : ''}</Text>
                </View>
                <Pressable
                  style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
                    backgroundColor: isPaid ? Colors.secondary : Colors.primaryMuted,
                    borderColor: isPaid ? Colors.border : Colors.primary }}
                  onPress={() => togglePaid(inv)}
                  disabled={updateInvoice.isPending}
                >
                  <Ionicons name={isPaid ? 'arrow-undo-outline' : 'checkmark-circle-outline'} size={15} color={isPaid ? Colors.textMuted : Colors.primary} />
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: isPaid ? Colors.textMuted : Colors.primary }}>
                    {isPaid ? 'Undo' : 'Mark Paid'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {filtered.length === 0 && !isLoading && <Text style={section.empty}>No invoices found</Text>}
      </ScrollView>
    </View>
  );
}
// ─── WHATSAPP OWNER SECTION ───────────────────────────────────────────────────
const TRIGGER_LABEL: Record<string, { label: string; desc: string; tag: string; tagColor: string }> = {
  '3_days_before': { label: '3 Days Before Expiry', desc: 'Sent automatically at 9 AM, 3 days before membership expires', tag: 'Day -3', tagColor: Colors.info },
  '1_day_before': { label: '1 Day Before Expiry', desc: 'Sent automatically at 9 AM, 1 day before membership expires', tag: 'Day -1', tagColor: Colors.warning },
  'expiry_day': { label: 'On Expiry Day', desc: 'Sent automatically at 9 AM on the expiry date', tag: 'Day 0', tagColor: Colors.danger },
  'day_-3': { label: '3 Days Before Expiry', desc: 'Sent 3 days before membership expires', tag: 'Day -3', tagColor: Colors.info },
  'day_-1': { label: '1 Day Before Expiry', desc: 'Sent 1 day before membership expires', tag: 'Day -1', tagColor: Colors.warning },
  'day_0': { label: 'On Expiry Day', desc: 'Sent on the expiry date', tag: 'Day 0', tagColor: Colors.danger },
};

function getTriggerMeta(type: string) {
  return TRIGGER_LABEL[type] ?? { label: type, desc: 'Automated trigger', tag: type.toUpperCase(), tagColor: Colors.textMuted };
}

function WhatsAppOwnerSection({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const gymId = user?.gym_id;
  const { data: members = [] } = useMembers(gymId);
  const { data: templates = [], isLoading: loadingTemplates } = useWhatsappTemplates();
  const { data: logs = [], isLoading: loadingLogs } = useWhatsappLogs();
  const updateTemplate = useUpdateWhatsappTemplate();
  const insertLog = useInsertWhatsappLog();

  const [tab, setTab] = useState<'triggers' | 'broadcast' | 'log'>('triggers');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [editError, setEditError] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPhone, setBroadcastPhone] = useState('');
  const [broadcastError, setBroadcastError] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const gymLogs = logs.filter((l: any) => l.gym_id === gymId);

  const handleToggle = (t: any) => {
    updateTemplate.mutate({ id: t.id, is_enabled: !t.is_enabled }, {
      onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    });
  };

  const handleSaveEdit = () => {
    setEditError('');
    if (!editMsg.trim()) { setEditError('Message cannot be empty'); return; }
    updateTemplate.mutate({ id: editingId!, message: editMsg.trim() }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setEditingId(null); },
      onError: (e: any) => setEditError(e.message),
    });
  };

  const handleBroadcast = () => {
    setBroadcastError('');
    setBroadcastSuccess(false);
    if (!broadcastMsg.trim()) { setBroadcastError('Message is required'); return; }
    if (!gymId) { setBroadcastError('Gym not found'); return; }
    insertLog.mutate(
      { gym_id: gymId, message: broadcastMsg.trim(), phone: broadcastPhone.trim() || undefined, status: 'pending' },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBroadcastMsg('');
          setBroadcastPhone('');
          setBroadcastSuccess(true);
        },
        onError: (e: any) => setBroadcastError(e.message),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="WhatsApp" onClose={onClose} />

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
        {([
          { key: 'triggers', label: 'Triggers' },
          { key: 'broadcast', label: 'Broadcast' },
          { key: 'log', label: 'Message Log' },
        ] as const).map(t => (
          <Pressable
            key={t.key}
            style={{ flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
              backgroundColor: tab === t.key ? '#25D36622' : Colors.secondary,
              borderColor: tab === t.key ? '#25D366' : Colors.border }}
            onPress={() => setTab(t.key)}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: tab === t.key ? '#25D366' : Colors.textSecondary }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'triggers' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>
          <View style={[section.card, { backgroundColor: Colors.secondary, borderColor: Colors.border }]}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.info} style={{ marginTop: 1 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 18 }}>
                These messages are sent <Text style={{ fontFamily: 'Inter_600SemiBold', color: Colors.text }}>automatically</Text> via WhatsApp to members before their membership expires. Use variables like <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#25D366' }}>{'{member_name}'}</Text> which are replaced with real data when sent.
              </Text>
            </View>
          </View>

          {loadingTemplates && <ActivityIndicator color="#25D366" />}

          {templates.map((t: any) => {
            const meta = getTriggerMeta(t.trigger_type ?? '');
            const isEditing = editingId === t.id;
            return (
              <View key={t.id} style={section.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: meta.tagColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: meta.tagColor + '55' }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: meta.tagColor }}>{meta.tag}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={section.name}>{meta.label}</Text>
                    <Text style={[section.sub, { fontSize: 11 }]}>{meta.desc}</Text>
                  </View>
                  {!isEditing && (
                    <Pressable onPress={() => { setEditingId(t.id); setEditMsg(t.message ?? ''); setEditError(''); }}>
                      <Ionicons name="pencil-outline" size={17} color={Colors.primary} style={{ marginRight: 8 }} />
                    </Pressable>
                  )}
                  {updateTemplate.isPending && editingId === null ? (
                    <ActivityIndicator size="small" color="#25D366" />
                  ) : (
                    <Pressable
                      style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: t.is_enabled ? '#25D366' : Colors.secondary, borderWidth: 1, borderColor: t.is_enabled ? '#25D366' : Colors.border, justifyContent: 'center', paddingHorizontal: 2 }}
                      onPress={() => handleToggle(t)}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: t.is_enabled ? '#000' : Colors.textMuted, alignSelf: t.is_enabled ? 'flex-end' : 'flex-start' }} />
                    </Pressable>
                  )}
                </View>

                {isEditing ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={[section.input, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                      value={editMsg}
                      onChangeText={setEditMsg}
                      multiline
                      placeholder="Enter message template..."
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>
                      Variables: {'{member_name}'}, {'{gym_name}'}, {'{expiry_date}'}
                    </Text>
                    {!!editError && (
                      <View style={section.errorBox}>
                        <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                        <Text style={section.errorText}>{editError}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={[section.submitBtn, { flex: 1, backgroundColor: '#25D366' }]} onPress={handleSaveEdit} disabled={updateTemplate.isPending}>
                        {updateTemplate.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[section.submitBtnText, { color: '#fff' }]}>Save</Text>}
                      </Pressable>
                      <Pressable style={[section.cancelBtn, { flex: 1 }]} onPress={() => setEditingId(null)}>
                        <Text style={section.cancelBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: Colors.secondary, borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, lineHeight: 18 }}>{t.message || '(No message set)'}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {templates.length === 0 && !loadingTemplates && (
            <Text style={section.empty}>No triggers configured for this gym</Text>
          )}
        </ScrollView>
      )}

      {tab === 'broadcast' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}>
          <View style={[section.card, { gap: 10 }]}>
            <Text style={analytics.sectionTitle}>Send Broadcast Message</Text>
            <TextInput
              style={section.input}
              placeholder="Phone Number (optional)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={broadcastPhone}
              onChangeText={setBroadcastPhone}
            />
            <TextInput
              style={[section.input, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder={`Message * (use {member_name}, {gym_name}, {expiry_date})`}
              placeholderTextColor={Colors.textMuted}
              multiline
              value={broadcastMsg}
              onChangeText={setBroadcastMsg}
            />
            {!!broadcastError && (
              <View style={section.errorBox}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                <Text style={section.errorText}>{broadcastError}</Text>
              </View>
            )}
            {broadcastSuccess && (
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.primary + '40' }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary }}>Message queued for delivery!</Text>
              </View>
            )}
            <Pressable
              style={[section.submitBtn, { backgroundColor: '#25D366' }]}
              onPress={handleBroadcast}
              disabled={insertLog.isPending}
            >
              {insertLog.isPending
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                    <Text style={[section.submitBtnText, { color: '#fff' }]}>Send Broadcast</Text>
                  </View>
                )}
            </Pressable>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center' }}>
              {members.length} members in this gym
            </Text>
          </View>
        </ScrollView>
      )}

      {tab === 'log' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 20 }}>
          {loadingLogs && <ActivityIndicator color="#25D366" />}
          {gymLogs.map((log: any) => (
            <View key={log.id} style={section.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={[section.name, { flex: 1 }]}>
                  {log.phone ? log.phone : 'Broadcast'}
                </Text>
                <StatusBadge status={log.status ?? 'pending'} map={WA_STATUS_MAP} />
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }} numberOfLines={3}>{log.message}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>{fmtDate(log.created_at)}</Text>
            </View>
          ))}
          {gymLogs.length === 0 && !loadingLogs && <Text style={section.empty}>No messages sent yet</Text>}
        </ScrollView>
      )}
    </View>
  );
}

// ─── MY PLAN SECTION ──────────────────────────────────────────────────────────
const ALL_PLANS = [
  {
    value: 'base',
    label: 'Base',
    price: '₹999',
    period: '/mo',
    yearlyPrice: '₹9,990/year',
    tagline: 'WhatsApp lead management, trial booking, fee reminders, website replies',
    features: [
      'WhatsApp Lead Management',
      'Trial Booking (3-step)',
      'Fee Reminder Automation',
      'Website Replies Setup',
      'Lead Pipeline (Kanban)',
      'Member Management',
      'Trainer Login',
      'Basic Analytics',
    ],
    color: Colors.info,
  },
  {
    value: 'classic',
    label: 'Classic',
    price: '₹1,299',
    period: '/mo',
    yearlyPrice: '₹12,990/year',
    tagline: 'Everything in Base plus Instagram DM lead capture',
    features: [
      'Everything in Base',
      'Instagram DM Lead Capture',
      'Instagram Auto-Reply',
    ],
    color: Colors.purple,
  },
  {
    value: 'pro',
    label: 'Pro',
    price: '₹1,999',
    period: '/mo',
    yearlyPrice: '₹19,990/year',
    tagline: 'Everything in Classic plus diet, client tracking and WhatsApp bot',
    features: [
      'Everything in Classic',
      'Diet Plan Automation (daily 7 AM)',
      'Client Progress Tracking',
      'Bot WhatsApp Integration',
      'Message limit applies',
    ],
    color: Colors.warning,
  },
];

function MyModulesSection({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: gymModules = [], isLoading } = useGymModules(user?.gym_id || null);
  const { data: latestInvoice } = useLatestInvoice(user?.gym_id || null);
  const { data: subscription } = useGymSubscriptionByGym(user?.gym_id || null);

  const enabledModules = gymModules.filter((gm: any) => gm.is_enabled);

  const invoiceAmount = latestInvoice?.amount ?? 0;
  const startDate = subscription?.start_date ?? latestInvoice?.created_at?.split('T')[0] ?? null;
  const endDate = subscription?.end_date ?? latestInvoice?.due_date ?? null;
  const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null;
  const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="My Modules" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {/* Subscription status */}
        {(isExpiring || isExpired) && (
          <View style={{ flexDirection: "row", gap: 10, backgroundColor: Colors.warningMuted, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.warning + "55" }}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.warning, flex: 1, lineHeight: 18 }}>
              {isExpired ? "Your subscription has expired. Contact the platform admin to renew." : `Subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : enabledModules.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="grid-outline" size={40} color={Colors.textMuted} />
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textMuted, marginTop: 12 }}>No modules assigned</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 6, textAlign: "center" }}>
              Contact the platform admin to enable modules for your gym.
            </Text>
          </View>
        ) : (
          <>
            <View style={[section.card, { borderTopWidth: 2, borderTopColor: Colors.primary }]}>
              <Text style={analytics.sectionTitle}>Active Modules ({enabledModules.length})</Text>
              {enabledModules.map((gm: any) => (
                <View key={gm.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryMuted, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.primary + "40" }}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text }}>{gm.module?.name || "Unknown"}</Text>
                    {!!gm.module?.description && (
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>{gm.module.description}</Text>
                    )}
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary, marginTop: 2 }}>
                      Rs.{(gm.module?.price || 0).toLocaleString("en-IN")}/mo
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Billing card */}
            <View style={{ backgroundColor: Colors.primaryMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.primary + "40", gap: 8 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Subscription</Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.primary }}>
                Rs.{invoiceAmount.toLocaleString("en-IN")}
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary }}>/month</Text>
              </Text>
              <View style={{ gap: 4 }}>
                {startDate && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted, width: 60 }}>Started</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text }}>{startDate}</Text>
                  </View>
                )}
                {endDate && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted, width: 60 }}>Renews</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: isExpiring || isExpired ? Colors.warning : Colors.text }}>
                      {endDate}{daysLeft !== null && daysLeft > 0 ? ` (${daysLeft}d left)` : isExpired ? " (Expired)" : ""}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted }}>
                Contact the platform admin to add or change modules.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function BroadcastOwnerModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const broadcast = useBroadcast();
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<'clients' | 'trainers' | 'both'>('both');

  const handleSend = () => {
    if (!message.trim() || !user?.gym_id) return;
    broadcast.mutate(
      { gym_id: user.gym_id, sender_name: user.name, message: message.trim(), recipient_type: recipient },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Sent!', `Message broadcast to ${recipient}.`);
          onClose();
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[broadcastStyles.overlay]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={broadcastStyles.header}>
          <Text style={broadcastStyles.title}>Broadcast Message</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <Text style={broadcastStyles.label}>Recipients</Text>
        <View style={broadcastStyles.recipientRow}>
          {(['clients', 'trainers', 'both'] as const).map(r => (
            <Pressable
              key={r}
              style={[broadcastStyles.recipientBtn, recipient === r && broadcastStyles.recipientBtnActive]}
              onPress={() => setRecipient(r)}
            >
              <Text style={[broadcastStyles.recipientText, recipient === r && broadcastStyles.recipientTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={broadcastStyles.label}>Message</Text>
        <TextInput
          style={broadcastStyles.input}
          placeholder="Type your message..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Pressable
          style={[broadcastStyles.sendBtn, (!message.trim() || broadcast.isPending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!message.trim() || broadcast.isPending}
        >
          {broadcast.isPending
            ? <ActivityIndicator color="#000" />
            : <>
                <Ionicons name="megaphone-outline" size={16} color="#000" />
                <Text style={broadcastStyles.sendBtnText}>Send Broadcast</Text>
              </>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const broadcastStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  recipientRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  recipientBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  recipientBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  recipientText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  recipientTextActive: { color: '#000' },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 12, padding: 14, minHeight: 120,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14,
  },
  sendBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
});

// ── Send Query Modal (all roles) ───────────────────────────────────────
function SendQueryModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const insertQuery = useInsertQuery();
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('Admin');
  const [sent, setSent] = useState(false);

  const recipientOptions =
    user?.role === 'member' ? ['Trainer', 'Gym Admin', 'Support']
    : user?.role === 'trainer' ? ['Gym Admin', 'Support']
    : ['Support'];

  const handleSend = () => {
    if (!message.trim()) return;
    insertQuery.mutate(
      {
        gym_id: user?.gym_id,
        sender_name: user?.name || 'Unknown',
        sender_role: user?.role || 'unknown',
        message: message.trim(),
        recipient,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSent(true);
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[broadcastStyles.overlay]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={broadcastStyles.header}>
          <Text style={broadcastStyles.title}>Send a Query</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>
        {sent ? (
          <View style={queryStyles.sentBox}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.primary} />
            <Text style={queryStyles.sentTitle}>Query Sent!</Text>
            <Text style={queryStyles.sentSub}>Your message has been sent. We'll get back to you shortly.</Text>
            <Pressable style={queryStyles.doneBtn} onPress={onClose}>
              <Text style={queryStyles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={broadcastStyles.label}>Send To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {recipientOptions.map(r => (
                  <Pressable
                    key={r}
                    style={[broadcastStyles.recipientBtn, { flex: 0, paddingHorizontal: 16 }, recipient === r && broadcastStyles.recipientBtnActive]}
                    onPress={() => setRecipient(r)}
                  >
                    <Text style={[broadcastStyles.recipientText, recipient === r && broadcastStyles.recipientTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={broadcastStyles.label}>Your Message</Text>
            <TextInput
              style={broadcastStyles.input}
              placeholder="Describe your issue or question..."
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {insertQuery.isError && (
              <Text style={{ color: Colors.danger, fontSize: 13, marginBottom: 8, fontFamily: 'Inter_400Regular' }}>
                Failed to send. Please try again.
              </Text>
            )}
            <Pressable
              style={[broadcastStyles.sendBtn, (!message.trim() || insertQuery.isPending) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!message.trim() || insertQuery.isPending}
            >
              {insertQuery.isPending
                ? <ActivityIndicator color="#000" />
                : <>
                    <Ionicons name="send-outline" size={16} color="#000" />
                    <Text style={broadcastStyles.sendBtnText}>Submit Query</Text>
                  </>
              }
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const queryStyles = StyleSheet.create({
  sentBox: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  sentTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  sentSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8,
  },
  doneBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
});

const signOutModal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.dangerMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
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
    backgroundColor: Colors.danger,
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});

const analytics = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%', backgroundColor: Colors.card, borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 2,
  },
  cardLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardValue: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text, marginBottom: 8 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  funnelLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, width: 60 },
  barWrapper: { flex: 1, height: 8, backgroundColor: Colors.secondary, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, minWidth: 4 },
  funnelCount: { fontFamily: 'Inter_600SemiBold', fontSize: 12, width: 28, textAlign: 'right' },
});

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  roleText: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'capitalize' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
});

const section = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  formCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  addBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary, flex: 1 },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 10, height: 44,
    paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14,
  },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.textSecondary },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.danger + '40',
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  closeBtn: { padding: 4 },
});

const planSt = StyleSheet.create({
  planCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 2, alignItems: 'center',
  },
  planLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 4 },
  planPrice: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
  planCount: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
