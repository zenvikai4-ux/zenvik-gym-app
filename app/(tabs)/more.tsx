import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Switch,
  ActivityIndicator, TextInput, Modal, Alert, Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  useLeads, useMembers, useTrainers, useBranches, useInsertBranch, useUpdateBranch,
  useDeleteBranch, useInsertActivity, useGyms, useUpdateGym,
  useInvoices, useInsertInvoice, useUpdateInvoice,
  useGymSubscriptions, useInsertGymSubscription, useUpdateGymSubscription, useDeleteGymSubscription,
  useModules, useGymModules, useUpsertGymModule,
  useWhatsappLogs, useInsertWhatsappLog,
  useWhatsappTemplates, useUpdateWhatsappTemplate,
  useGymSubscriptionByGym,
  useBroadcastWhatsApp, useBroadcastInApp, useInsertQuery,
  useInsertModule, useUpdateModule, useDeleteModule,
  useAutoInvoice, useGymModulePrice, useGymStats, useInsertNotification, useLatestInvoice, useUpsertGymSubscription,
  useGymKnowledge, useUpsertGymKnowledge,
  useGymAutomationConfig, useUpsertGymAutomationConfig,
  useEnabledModules,
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
      { key: 'my_modules', label: 'Gym Modules', icon: 'layers-outline', color: Colors.purple },
      { key: 'estimation', label: 'Estimation Calculator', icon: 'calculator-outline', color: Colors.warning },
      { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
      { key: 'billing', label: 'Billing', icon: 'card-outline', color: Colors.info },
    );
  }

  if (isOwner) {
    sections.push(
      { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', color: Colors.info },
      { key: 'broadcast_whatsapp', label: 'WhatsApp Broadcast', icon: 'logo-whatsapp', color: '#25D366' },
      { key: 'broadcast_inapp', label: 'In-App Broadcast', icon: 'notifications-outline', color: Colors.info },
      { key: 'my_modules', label: 'My Modules', icon: 'grid-outline', color: Colors.purple },
      { key: 'gym_knowledge', label: 'Gym Knowledge Base', icon: 'book-outline', color: Colors.warning },
      { key: 'automation_config', label: 'Automation Settings', icon: 'flash-outline', color: '#E1306C' },
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
        {isAdmin
          ? <WhatsAppAdminSection onClose={() => setActiveSection(null)} />
          : <WhatsAppOwnerSection onClose={() => setActiveSection(null)} />}
      </Modal>
      <Modal visible={activeSection === 'billing'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <BillingSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'broadcast_whatsapp'} animationType="slide" transparent onRequestClose={() => setActiveSection(null)}>
        <BroadcastWhatsAppModal onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'broadcast_inapp'} animationType="slide" transparent onRequestClose={() => setActiveSection(null)}>
        <BroadcastInAppModal onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'send_query'} animationType="slide" transparent onRequestClose={() => setActiveSection(null)}>
        <SendQueryModal onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'estimation'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <EstimationCalculator onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'my_modules'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        {isAdmin
          ? <ModulesSection onClose={() => setActiveSection(null)} />
          : <MyModulesSection onClose={() => setActiveSection(null)} />}
      </Modal>
      <Modal visible={activeSection === 'gym_knowledge'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <GymKnowledgeSection onClose={() => setActiveSection(null)} />
      </Modal>
      <Modal visible={activeSection === 'automation_config'} animationType="slide" onRequestClose={() => setActiveSection(null)}>
        <AutomationConfigSection onClose={() => setActiveSection(null)} />
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

  const [selectedGymId, setSelectedGymId] = useState(isAdmin ? '' : (user?.gym_id ?? ''));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', whatsapp_number: '', owner_name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  // Branches = gyms where parent_gym_id = selectedGymId
  const branches = gyms.filter((g: any) => g.parent_gym_id === selectedGymId);
  const selectedGym = gyms.find((g: any) => g.id === selectedGymId);

  const handleAddBranch = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Branch name is required'); return; }
    if (!selectedGymId) { setFormError('Select a gym first'); return; }
    if (!form.email || !form.password) { setFormError('Owner email and password are required'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }

    setAdding(true);
    try {
      // Create owner account
      const { data: signUpData, error: signUpError } = await supabase.auth.admin
        ? await (supabase as any).auth.admin.createUser({ email: form.email, password: form.password, email_confirm: true })
        : await supabase.auth.signUp({ email: form.email, password: form.password });

      // Insert branch gym with parent_gym_id
      const { data: branchGym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: form.name.trim(),
          address: form.address.trim() || null,
          whatsapp_number: form.whatsapp_number.trim() || null,
          parent_gym_id: selectedGymId,
          is_active: true,
        })
        .select()
        .single();

      if (gymError) throw gymError;

      // Create owner profile
      const userId = signUpData?.user?.id ?? signUpData?.data?.user?.id;
      if (userId && branchGym) {
        await supabase.from('profiles').upsert({
          id: userId,
          name: form.owner_name || form.name + ' Owner',
          email: form.email,
          role: 'gym_owner',
          gym_id: branchGym.id,
        });
        await supabase.rpc('confirm_user_email' as any, { user_email: form.email }).catch(() => {});
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      setForm({ name: '', address: '', whatsapp_number: '', owner_name: '', email: '', password: '' });
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Gym Branches" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {isAdmin && (
          <View style={section.formCard}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 }}>
              Select a gym to manage its branches
            </Text>
            <GymPicker gyms={gyms.filter((g: any) => !g.parent_gym_id)} value={selectedGymId} onChange={setSelectedGymId} />
          </View>
        )}

        {selectedGymId && (
          <>
            {selectedGym && (
              <View style={{ backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.primary + '40' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary }}>Parent Gym: {selectedGym.name}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>{branches.length} branch{branches.length !== 1 ? 'es' : ''}</Text>
              </View>
            )}

            <Pressable
              style={[section.addBtn, showAdd && { backgroundColor: Colors.secondary }]}
              onPress={() => setShowAdd(s => !s)}
            >
              <Ionicons name={showAdd ? 'close-outline' : 'add'} size={18} color={Colors.primary} />
              <Text style={section.addBtnText}>{showAdd ? 'Cancel' : 'Add Branch'}</Text>
            </Pressable>

            {showAdd && (
              <View style={section.formCard}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text, marginBottom: 10 }}>New Branch Details</Text>
                {[
                  { key: 'name', label: 'Branch Name *', placeholder: 'Yfitness - Branch 2' },
                  { key: 'address', label: 'Address', placeholder: 'Branch location' },
                  { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+91 98765 43210' },
                  { key: 'owner_name', label: 'Branch Owner Name', placeholder: 'Owner Name' },
                  { key: 'email', label: 'Owner Email *', placeholder: 'owner@branch.com' },
                  { key: 'password', label: 'Owner Password *', placeholder: 'Min 6 characters' },
                ].map(f => (
                  <TextInput
                    key={f.key}
                    style={[section.input, { marginBottom: 8 }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    secureTextEntry={f.key === 'password'}
                    autoCapitalize="none"
                  />
                ))}
                {!!formError && <Text style={{ color: Colors.danger, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 }}>{formError}</Text>}
                <Pressable style={[section.submitBtn, { marginTop: 10, opacity: adding ? 0.6 : 1 }]} onPress={handleAddBranch} disabled={adding}>
                  {adding ? <ActivityIndicator color="#000" /> : <Text style={section.submitBtnText}>Create Branch</Text>}
                </Pressable>
              </View>
            )}

            {branches.length === 0 && !showAdd && (
              <Text style={section.empty}>No branches yet. Add one above.</Text>
            )}

            {branches.map((b: any) => (
              <View key={b.id} style={[section.card, { borderLeftWidth: 3, borderLeftColor: Colors.info }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={{ backgroundColor: Colors.info + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.info }}>BRANCH</Text>
                  </View>
                  <Text style={[section.name, { flex: 1 }]}>{b.name}</Text>
                  <View style={{ backgroundColor: b.is_active ? Colors.primary + '20' : Colors.danger + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: b.is_active ? Colors.primary : Colors.danger }}>{b.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                {b.address && <Text style={section.sub}>📍 {b.address}</Text>}
                {b.whatsapp_number && <Text style={section.sub}>📱 {b.whatsapp_number}</Text>}
              </View>
            ))}
          </>
        )}

        {!selectedGymId && isAdmin && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="git-branch-outline" size={48} color={Colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textMuted, marginTop: 12 }}>Select a gym to manage branches</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

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
// ── Estimation Calculator — for quoting prospects ─────────────────────────────
function EstimationCalculator({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: allModules = [] } = useModules();

  const META_MARKETING = 0.88;
  const META_UTILITY   = 0.13;
  const MGMT_FEE       = 99;

  const [form, setForm] = useState({
    memberCount: '',
    membersWithTrainer: '',
    broadcastsPerMonth: '1',
    clientPaysWhatsApp: true,
    expiryReminders: true,
    dietMessages: false,
  });
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const members = parseInt(form.memberCount) || 0;
  const withTrainer = parseInt(form.membersWithTrainer) || 0;
  const bcasts = parseInt(form.broadcastsPerMonth) || 0;

  const broadcast = form.clientPaysWhatsApp ? 0 : members * bcasts * META_MARKETING;
  const expiry    = form.clientPaysWhatsApp ? 0 : (form.expiryReminders ? members * META_UTILITY : 0);
  const diet      = form.clientPaysWhatsApp ? 0 : (form.dietMessages ? withTrainer * 30 * META_UTILITY : 0);
  const metaTotal = Math.ceil(broadcast + expiry + diet);
  const modulesTotal = allModules.filter((m: any) => selectedModules.has(m.id)).reduce((s: number, m: any) => s + (m.price || 0), 0);
  const total = metaTotal + modulesTotal + MGMT_FEE;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Pressable onPress={onClose} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-down" size={22} color={Colors.text} />
        </Pressable>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, flex: 1 }}>Estimation Calculator</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 20 }}>

        <View style={{ backgroundColor: Colors.info + '15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.info + '30' }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, lineHeight: 18 }}>
            Use this to estimate monthly cost for a prospect. Enter their details below to get the quote.
          </Text>
        </View>

        {/* Inputs */}
        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Gym Details</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>Total Members</Text>
              <TextInput style={section.input} value={form.memberCount} onChangeText={v => setForm(p => ({ ...p, memberCount: v }))} keyboardType="numeric" placeholder="e.g. 100" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>With Trainer</Text>
              <TextInput style={section.input} value={form.membersWithTrainer} onChangeText={v => setForm(p => ({ ...p, membersWithTrainer: v }))} keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>Broadcasts/Month</Text>
            <TextInput style={section.input} value={form.broadcastsPerMonth} onChangeText={v => setForm(p => ({ ...p, broadcastsPerMonth: v }))} keyboardType="numeric" placeholder="1" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        {/* WhatsApp toggles */}
        <View style={section.card}>
          <Text style={analytics.sectionTitle}>WhatsApp Charges</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Client pays WhatsApp</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Their card on Meta — you don't charge Meta costs</Text>
            </View>
            <Switch value={form.clientPaysWhatsApp} onValueChange={v => setForm(p => ({ ...p, clientPaysWhatsApp: v }))} trackColor={{ true: '#22C55E', false: Colors.warning }} />
          </View>
          {!form.clientPaysWhatsApp && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Expiry Reminders</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>₹0.13 × {members} members</Text>
                </View>
                <Switch value={form.expiryReminders} onValueChange={v => setForm(p => ({ ...p, expiryReminders: v }))} trackColor={{ true: Colors.primary }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Diet Messages (daily)</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>₹0.13 × 30 days × {withTrainer} with trainer</Text>
                </View>
                <Switch value={form.dietMessages} onValueChange={v => setForm(p => ({ ...p, dietMessages: v }))} trackColor={{ true: Colors.primary }} />
              </View>
            </>
          )}
        </View>

        {/* Modules */}
        <View style={section.card}>
          <Text style={analytics.sectionTitle}>Modules</Text>
          {allModules.map((mod: any) => (
            <Pressable key={mod.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 }} onPress={() => toggleModule(mod.id)}>
              <Ionicons name={selectedModules.has(mod.id) ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selectedModules.has(mod.id) ? Colors.primary : Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text }}>{mod.name}</Text>
                {mod.description && <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>{mod.description}</Text>}
              </View>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary }}>₹{(mod.price || 0).toLocaleString('en-IN')}/mo</Text>
            </Pressable>
          ))}
          {allModules.length === 0 && <Text style={section.empty}>No modules configured yet</Text>}
        </View>

        {/* Result */}
        <View style={{ backgroundColor: Colors.primaryMuted, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.primary + '40', gap: 8 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text, marginBottom: 4 }}>Monthly Estimate</Text>
          {modulesTotal > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Modules</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{modulesTotal}</Text></View>}
          {!form.clientPaysWhatsApp && broadcast > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Broadcasts</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{Math.ceil(broadcast)}</Text></View>}
          {!form.clientPaysWhatsApp && form.expiryReminders && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Expiry Reminders</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{Math.ceil(expiry)}</Text></View>}
          {!form.clientPaysWhatsApp && form.dietMessages && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Diet Messages</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{Math.ceil(diet)}</Text></View>}
          {form.clientPaysWhatsApp && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#22C55E' }}>WhatsApp (Meta)</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#22C55E' }}>Client pays directly</Text></View>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Maintenance</Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{MGMT_FEE}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.primary + '40', paddingTop: 10, marginTop: 4 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text }}>You Charge / Month</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.primary }}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

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
  const { data: gymStats } = useGymStats(selectedGymId || null);
  const memberCount = gymStats?.memberCount ?? 0;
  const membersWithTrainer = gymStats?.membersWithTrainer ?? 0;

  const [activeTab, setActiveTab] = useState<"manage" | "assign">("manage");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [modForm, setModForm] = useState({ name: "", description: "", price: "" });
  const [modError, setModError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const META_MARKETING = 0.88;
  const META_UTILITY   = 0.13;
  const MGMT_FEE       = 99;

  const [broadcastConfig, setBroadcastConfig] = useState({
    broadcastsPerMonth: '1',
    clientPaysWhatsApp: true,
    expiryReminders: true,
    dietMessages: false,
  });

  const calcTotal = () => {
    const bcasts    = parseInt(broadcastConfig.broadcastsPerMonth) || 0;
    const broadcast = broadcastConfig.clientPaysWhatsApp ? 0 : memberCount * bcasts * META_MARKETING;
    const expiry    = broadcastConfig.clientPaysWhatsApp ? 0 : (broadcastConfig.expiryReminders ? memberCount * META_UTILITY : 0);
    const diet      = broadcastConfig.clientPaysWhatsApp ? 0 : (broadcastConfig.dietMessages ? membersWithTrainer * 30 * META_UTILITY : 0);
    const metaTotal = Math.ceil(broadcast + expiry + diet);
    return { broadcast: Math.ceil(broadcast), expiry: Math.ceil(expiry), diet: Math.ceil(diet), metaTotal };
  };
  const calc = calcTotal();
  const totalToCharge = (gymPrice as number) + calc.metaTotal + MGMT_FEE;

  const enabledIds = new Set(
    gymModules.filter((gm: any) => gm.is_enabled).map((gm: any) => gm.module_id)
  );

  const openAddForm = () => { setEditingModId(null); setModForm({ name: "", description: "", price: "" }); setModError(""); setShowAddForm(true); };
  const openEditForm = (mod: any) => { setShowAddForm(false); setEditingModId(mod.id); setModForm({ name: mod.name, description: mod.description || "", price: String(mod.price || 0) }); setModError(""); };
  const closeForm = () => { setShowAddForm(false); setEditingModId(null); setModForm({ name: "", description: "", price: "" }); setModError(""); };

  const handleSave = () => {
    setModError("");
    if (!modForm.name.trim()) { setModError("Module name is required"); return; }
    const price = parseFloat(modForm.price) || 0;
    if (editingModId) {
      updateModule.mutate({ id: editingModId, name: modForm.name.trim(), description: modForm.description.trim() || undefined, price }, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); closeForm(); },
        onError: (e: any) => setModError(e.message),
      });
    } else {
      insertModule.mutate({ name: modForm.name.trim(), description: modForm.description.trim() || undefined, price }, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); closeForm(); },
        onError: (e: any) => setModError(e.message),
      });
    }
  };

  const handleToggle = (moduleId: string, currentEnabled: boolean) => {
    if (!selectedGymId) return;
    setToggling(moduleId);
    upsertModule.mutate({ gym_id: selectedGymId, module_id: moduleId, is_enabled: !currentEnabled }, {
      onSuccess: () => setToggling(null), onError: () => setToggling(null)
    });
  };

  const handleGenerateInvoice = () => {
    if (!selectedGymId || totalToCharge === MGMT_FEE) return;
    const gym = gyms.find((g: any) => g.id === selectedGymId);
    const today2 = new Date().toISOString().split('T')[0];
    const nextMonth2 = new Date(); nextMonth2.setMonth(nextMonth2.getMonth() + 1);
    const endDate2 = nextMonth2.toISOString().split('T')[0];
    autoInvoice.mutate({
      gym_id: selectedGymId,
      amount: totalToCharge,
      description: `Monthly — Modules ₹${gymPrice}${!broadcastConfig.clientPaysWhatsApp ? ` + WhatsApp ₹${calc.metaTotal}` : ' (Client pays WA)'} + Maintenance ₹${MGMT_FEE}`,
    }, {
      onSuccess: () => {
        upsertSubscription.mutate({ gym_id: selectedGymId, plan: 'modules', amount: totalToCharge, start_date: today2, end_date: endDate2 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Invoice Generated", `₹${totalToCharge.toLocaleString("en-IN")} invoice created for ${gym?.name}\nPeriod: ${today2} → ${endDate2}`);
      },
      onError: (e: any) => Alert.alert("Error", e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SectionHeader title="Gym Modules" onClose={onClose} />

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: Colors.secondary, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: Colors.border }}>
        {(["manage", "assign"] as const).map(t => (
          <Pressable key={t} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: activeTab === t ? Colors.primary : "transparent" }} onPress={() => { setActiveTab(t); closeForm(); }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: activeTab === t ? "#000" : Colors.textSecondary }}>
              {t === "manage" ? "Manage Modules" : "Assign & Pricing"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>

        {/* ── Manage Modules Tab ── */}
        {activeTab === "manage" && (
          <>
            {!showAddForm && !editingModId && (
              <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: 10, padding: 13, borderWidth: 1, borderColor: Colors.primary + "40" }} onPress={openAddForm}>
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary, flex: 1 }}>Add New Module</Text>
              </Pressable>
            )}
            {(showAddForm || !!editingModId) && (
              <View style={section.formCard}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 12 }}>{editingModId ? "Edit Module" : "New Module"}</Text>
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
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary, marginTop: 3 }}>₹{(mod.price || 0).toLocaleString("en-IN")}/mo</Text>
                    </View>
                    <Pressable onPress={() => editingModId === mod.id ? closeForm() : openEditForm(mod)} style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: editingModId === mod.id ? Colors.primaryMuted : Colors.secondary, borderWidth: 1, borderColor: editingModId === mod.id ? Colors.primary + "40" : Colors.border }}>
                      <Ionicons name={editingModId === mod.id ? "close-outline" : "pencil-outline"} size={16} color={editingModId === mod.id ? Colors.primary : Colors.info} />
                    </Pressable>
                    <Pressable onPress={() => deleteModule.mutate(mod.id)} style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: Colors.dangerMuted, borderWidth: 1, borderColor: Colors.danger + "40" }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Assign & Pricing Tab ── */}
        {activeTab === "assign" && (
          <>
            {/* Gym selector */}
            <View style={section.formCard}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>Select Gym</Text>
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
              <>
                {/* Module toggles */}
                <View style={section.card}>
                  <Text style={analytics.sectionTitle}>Assign Modules</Text>
                  {allModules.map((mod: any) => {
                    const isEnabled = enabledIds.has(mod.id);
                    const isTogglingThis = toggling === mod.id;
                    return (
                      <Pressable key={mod.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, opacity: isTogglingThis ? 0.6 : 1 }} onPress={() => handleToggle(mod.id, isEnabled)} disabled={isTogglingThis}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isEnabled ? Colors.primaryMuted : Colors.secondary, borderWidth: 1.5, borderColor: isEnabled ? Colors.primary : Colors.border }}>
                          {isTogglingThis ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={isEnabled ? "checkmark-circle" : "ellipse-outline"} size={20} color={isEnabled ? Colors.primary : Colors.textMuted} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text }}>{mod.name}</Text>
                          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: isEnabled ? Colors.primary : Colors.textMuted }}>₹{(mod.price || 0).toLocaleString("en-IN")}/mo — {isEnabled ? "Enabled" : "Disabled"}</Text>
                        </View>
                        <Ionicons name={isEnabled ? "toggle" : "toggle-outline"} size={28} color={isEnabled ? Colors.primary : Colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Broadcast Config */}
                <View style={[section.card, { gap: 10 }]}>
                  <Text style={analytics.sectionTitle}>WhatsApp Configuration</Text>

                  {/* Live counts from DB */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.primary }}>{memberCount}</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Total Members</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.warning }}>{membersWithTrainer}</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>With Trainer</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>Broadcasts/Month</Text>
                    <TextInput style={section.input} value={broadcastConfig.broadcastsPerMonth} onChangeText={v => setBroadcastConfig(p => ({ ...p, broadcastsPerMonth: v }))} keyboardType="numeric" placeholder="1" placeholderTextColor={Colors.textMuted} />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Client pays WhatsApp (card on Meta)</Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Toggle off if you bear the Meta charges</Text>
                    </View>
                    <Switch value={broadcastConfig.clientPaysWhatsApp} onValueChange={v => setBroadcastConfig(p => ({ ...p, clientPaysWhatsApp: v }))} trackColor={{ true: '#22C55E', false: Colors.warning }} />
                  </View>
                  {!broadcastConfig.clientPaysWhatsApp && (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Expiry Reminders</Text>
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>₹0.13 × {memberCount} members</Text>
                        </View>
                        <Switch value={broadcastConfig.expiryReminders} onValueChange={v => setBroadcastConfig(p => ({ ...p, expiryReminders: v }))} trackColor={{ true: Colors.primary }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>Diet Messages (daily)</Text>
                          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>₹0.13 × 30 days × {membersWithTrainer} members with trainer</Text>
                        </View>
                        <Switch value={broadcastConfig.dietMessages} onValueChange={v => setBroadcastConfig(p => ({ ...p, dietMessages: v }))} trackColor={{ true: Colors.primary }} />
                      </View>
                    </>
                  )}
                </View>

                {/* Pricing Calculator */}
                <View style={[section.card, { gap: 10 }]}>
                  <Text style={analytics.sectionTitle}>Pricing Calculator</Text>

                  {/* Credit card toggle */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: broadcastConfig.clientPaysWhatsApp ? '#22C55E15' : Colors.warning + '15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: broadcastConfig.clientPaysWhatsApp ? '#22C55E40' : Colors.warning + '40' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: broadcastConfig.clientPaysWhatsApp ? '#22C55E' : Colors.warning }}>
                        {broadcastConfig.clientPaysWhatsApp ? '✅ Client pays WhatsApp (their card on Meta)' : '⚠️ You pay WhatsApp charges'}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
                        {broadcastConfig.clientPaysWhatsApp ? 'You only charge modules + maintenance' : 'Meta charges added to client bill'}
                      </Text>
                    </View>
                    <Switch value={broadcastConfig.clientPaysWhatsApp} onValueChange={v => setBroadcastConfig(p => ({ ...p, clientPaysWhatsApp: v }))} trackColor={{ true: '#22C55E', false: Colors.warning }} />
                  </View>

                  {/* Meta inputs — only if you pay */}
                  {!broadcastConfig.clientPaysWhatsApp && (
                    <>
                      {[
                        { key: 'expiryReminders', label: 'Expiry Reminders', sub: `₹0.13 × ${memberCount} members` },
                        { key: 'dietMessages', label: 'Diet Messages (daily)', sub: `₹0.13 × 30 days × ${membersWithTrainer} with trainer` },
                      ].map(t => (
                        <View key={t.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>{t.label}</Text>
                            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>{t.sub}</Text>
                          </View>
                          <Switch value={(broadcastConfig as any)[t.key]} onValueChange={v => setBroadcastConfig(p => ({ ...p, [t.key]: v }))} trackColor={{ true: Colors.primary }} />
                        </View>
                      ))}
                    </>
                  )}

                  {/* Breakdown */}
                  <View style={{ backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 6 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Monthly Breakdown</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Modules ({enabledIds.size} enabled)</Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{(gymPrice as number).toLocaleString('en-IN')}</Text>
                    </View>
                    {!broadcastConfig.clientPaysWhatsApp && calc.broadcast > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Broadcasts ({broadcastConfig.broadcastsPerMonth}×{memberCount} × ₹0.88)</Text>
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{calc.broadcast}</Text>
                      </View>
                    )}
                    {!broadcastConfig.clientPaysWhatsApp && broadcastConfig.expiryReminders && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Expiry ({memberCount} × ₹0.13)</Text>
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{calc.expiry}</Text>
                      </View>
                    )}
                    {!broadcastConfig.clientPaysWhatsApp && broadcastConfig.dietMessages && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Diet ({membersWithTrainer} with trainer × 30 × ₹0.13)</Text>
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{calc.diet}</Text>
                      </View>
                    )}
                    {broadcastConfig.clientPaysWhatsApp && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#22C55E' }}>WhatsApp (Meta)</Text>
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#22C55E' }}>Client pays</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Maintenance</Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{MGMT_FEE}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text }}>You Charge / Month</Text>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.primary }}>₹{totalToCharge.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  <Pressable
                    style={[section.submitBtn, { opacity: autoInvoice.isPending ? 0.6 : 1 }]}
                    onPress={handleGenerateInvoice}
                    disabled={autoInvoice.isPending}
                  >
                    {autoInvoice.isPending ? <ActivityIndicator color="#000" /> : <><Ionicons name="receipt-outline" size={16} color="#000" /><Text style={section.submitBtnText}>Generate Invoice</Text></>}
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
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


// ── GymInvoiceForm — shows module prices + edit + generate ───────────────────
function GymInvoiceForm({ gym, onDone, autoInvoice, upsertSubscription }: any) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAmount, setEditAmount] = useState('');
  const MGMT = 99;

  useEffect(() => {
    supabase.from('gym_modules').select('is_enabled, module:modules(id, name, price)')
      .eq('gym_id', gym.id).eq('is_enabled', true)
      .then(({ data }) => {
        setModules(data || []);
        const total = (data || []).reduce((s: number, gm: any) => s + (gm.module?.price ?? 0), 0) + MGMT;
        setEditAmount(String(total));
        setLoading(false);
      });
  }, [gym.id]);

  const modulesTotal = modules.reduce((s: number, gm: any) => s + (gm.module?.price ?? 0), 0);

  const handleGenerate = () => {
    const amount = parseFloat(editAmount) || 0;
    if (!amount) { Alert.alert('Error', 'Enter a valid amount'); return; }
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];
    autoInvoice.mutate({
      gym_id: gym.id, amount,
      description: `Monthly — ${modules.map((gm: any) => gm.module?.name).join(', ')} + Maintenance ₹${MGMT}`,
    }, {
      onSuccess: () => {
        upsertSubscription.mutate({ gym_id: gym.id, plan: 'modules', amount, start_date: today, end_date: endDate });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Invoice Created', `₹${amount.toLocaleString('en-IN')} invoice for ${gym.name}`);
        onDone();
      },
      onError: (e: any) => Alert.alert('Error', e.message),
    });
  };

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />;

  return (
    <View style={{ gap: 8, paddingBottom: 12 }}>
      {modules.length === 0 ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted }}>No modules enabled. Enable modules in Gym Modules first.</Text>
      ) : (
        <>
          {modules.map((gm: any) => (
            <View key={gm.module?.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>{gm.module?.name}</Text>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{(gm.module?.price || 0).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary }}>Maintenance</Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>₹{MGMT}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text }}>Suggested Total</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.primary }}>₹{(modulesTotal + MGMT).toLocaleString('en-IN')}</Text>
          </View>
          <View>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>Edit Amount (₹)</Text>
            <TextInput
              style={[section.input, { marginBottom: 8 }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <Pressable style={section.submitBtn} onPress={handleGenerate} disabled={autoInvoice.isPending}>
            {autoInvoice.isPending ? <ActivityIndicator color="#000" /> : <><Ionicons name="receipt-outline" size={15} color="#000" /><Text style={section.submitBtnText}>Generate Invoice</Text></>}
          </Pressable>
        </>
      )}
    </View>
  );
}

function BillingSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const { data: invoices = [], isLoading, isError: invoicesError, error: invoicesErr } = useInvoices();
  const updateInvoice = useUpdateInvoice();
  const autoInvoice = useAutoInvoice();
  const upsertSubscription = useUpsertGymSubscription();
  const insertNotification = useInsertNotification();

  const [statusFilter, setStatusFilter] = useState('all');
  const [filterGym, setFilterGym] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

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

  const handleSendInvoice = (inv: any) => {
    const gymName = gyms.find((g: any) => g.id === inv.gym_id)?.name ?? 'Your Gym';
    const dueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'Soon';
    setSendingId(inv.id);
    insertNotification.mutate({
      gym_id: inv.gym_id,
      title: `🧾 Invoice Due — ₹${(inv.amount ?? 0).toLocaleString('en-IN')}`,
      body: `Your monthly invoice of ₹${(inv.amount ?? 0).toLocaleString('en-IN')} for ${gymName} is due by ${dueDate}. ${inv.description || ''}. Please contact your platform admin to pay.`,
      type: 'fee_reminder',
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sent', `Invoice notification sent to ${gymName} owner.`);
        setSendingId(null);
      },
      onError: (e: any) => { Alert.alert('Error', e.message); setSendingId(null); },
    });
  };

  const handleAutoGenerate = async (gym: any) => {
    setGenerating(gym.id);
    const { data: gymMods } = await supabase
      .from('gym_modules')
      .select('is_enabled, module:modules(price)')
      .eq('gym_id', gym.id)
      .eq('is_enabled', true);
    const modulesTotal = (gymMods ?? []).reduce((sum: number, gm: any) => sum + (gm.module?.price ?? 0), 0);
    const MGMT = 99;
    const total = modulesTotal + MGMT;
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];

    autoInvoice.mutate(
      {
        gym_id: gym.id,
        amount: total,
        description: `Monthly — Modules ₹${modulesTotal} + Maintenance ₹${MGMT}`,
      },
      {
        onSuccess: () => {
          upsertSubscription.mutate({ gym_id: gym.id, plan: 'modules', amount: total, start_date: today, end_date: endDate });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Invoice Created', `₹${total.toLocaleString('en-IN')} invoice for ${gym.name}\n\nModules: ₹${modulesTotal}\nMaintenance: ₹${MGMT}\n\nPeriod: ${today} → ${endDate}`);
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

        {/* Billing table missing notice */}
        {invoicesError && (
          <View style={{ backgroundColor: Colors.danger + '15', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.danger + '40', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning-outline" size={20} color={Colors.danger} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.danger }}>Billing Setup Required</Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 20 }}>
              The invoices table is missing from your Supabase database. Please run the SQL migration in your Supabase dashboard (SQL Editor) to enable billing.
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, lineHeight: 18 }}>
              {"Run this SQL in Supabase > SQL Editor:\n\nCREATE TABLE IF NOT EXISTS invoices (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  gym_id uuid REFERENCES gyms(id) ON DELETE CASCADE,\n  amount numeric NOT NULL DEFAULT 0,\n  status text NOT NULL DEFAULT 'pending',\n  description text,\n  due_date date,\n  paid_at timestamptz,\n  created_at timestamptz DEFAULT now()\n);"}
            </Text>
          </View>
        )}

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
          <Text style={analytics.sectionTitle}>Generate Invoice</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginBottom: 10 }}>
            Shows module prices + maintenance. Edit amount before generating.
          </Text>
          {gyms.map((gym: any) => {
            const isExpanded = generating === gym.id + '_expand';
            return (
              <View key={gym.id} style={{ borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
                  onPress={() => setGenerating(isExpanded ? null : gym.id + '_expand')}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text }}>{gym.name}</Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                </Pressable>
                {isExpanded && (
                  <GymInvoiceForm gym={gym} onDone={() => setGenerating(null)} autoInvoice={autoInvoice} upsertSubscription={upsertSubscription} />
                )}
              </View>
            );
          })}
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!isPaid && (
                    <Pressable
                      style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '50', opacity: sendingId === inv.id ? 0.6 : 1 }}
                      onPress={() => handleSendInvoice(inv)}
                      disabled={sendingId === inv.id}
                    >
                      {sendingId === inv.id
                        ? <ActivityIndicator size="small" color={Colors.warning} />
                        : <Ionicons name="send-outline" size={14} color={Colors.warning} />}
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.warning }}>Send</Text>
                    </Pressable>
                  )}
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
            </View>
          );
        })}
        {filtered.length === 0 && !isLoading && <Text style={section.empty}>No invoices found</Text>}
      </ScrollView>
    </View>
  );
}

function getTriggerMeta(type: string) {
  return TRIGGER_LABEL[type] ?? { label: type, desc: 'Automated trigger', tag: type.toUpperCase(), tagColor: Colors.textMuted };
}

// ── WhatsApp Admin Section — configure WA credentials per gym ────────────────
function WhatsAppAdminSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: gyms = [] } = useGyms();
  const updateGym = useUpdateGym();
  const [selectedGymId, setSelectedGymId] = useState('');
  const [form, setForm] = useState({ whatsapp_phone_id: '', whatsapp_token: '', whatsapp_number: '' });
  const [saved, setSaved] = useState(false);

  const selectedGym = gyms.find((g: any) => g.id === selectedGymId);

  useEffect(() => {
    if (selectedGym) {
      setForm({
        whatsapp_phone_id: selectedGym.whatsapp_phone_id || '',
        whatsapp_token: selectedGym.whatsapp_token || '',
        whatsapp_number: selectedGym.whatsapp_number || '',
      });
      setSaved(false);
    }
  }, [selectedGymId]);

  const handleSave = () => {
    if (!selectedGymId) return;
    updateGym.mutate({
      id: selectedGymId,
      whatsapp_phone_id: form.whatsapp_phone_id.trim() || null,
      whatsapp_token: form.whatsapp_token.trim() || null,
      whatsapp_number: form.whatsapp_number.trim() || null,
    }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSaved(true); setTimeout(() => setSaved(false), 2000); },
      onError: (e: any) => Alert.alert('Error', e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Pressable onPress={onClose} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-down" size={22} color={Colors.text} />
        </Pressable>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, flex: 1 }}>WhatsApp Configuration</Text>
        {selectedGymId && (
          <Pressable
            style={{ backgroundColor: saved ? '#22C55E' : Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
            onPress={handleSave}
            disabled={updateGym.isPending}
          >
            {updateGym.isPending
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>{saved ? 'Saved ✓' : 'Save'}</Text>}
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 20 }}>
        <View style={section.formCard}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>Select Gym</Text>
          <GymPicker gyms={gyms} value={selectedGymId} onChange={setSelectedGymId} />
        </View>

        {!selectedGymId ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="logo-whatsapp" size={48} color={Colors.textMuted} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textMuted, marginTop: 12 }}>Select a gym to configure WhatsApp</Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: Colors.info + '15', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.info + '30' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, lineHeight: 18 }}>
                These credentials are used to send WhatsApp messages from this gym's number. Get them from Meta Business Manager → WhatsApp → API Setup.
              </Text>
            </View>

            {[
              { key: 'whatsapp_number', label: 'WhatsApp Business Number', placeholder: '+91 98765 43210', hint: 'The gym\'s WhatsApp business number' },
              { key: 'whatsapp_phone_id', label: 'Phone Number ID', placeholder: '1234567890123456', hint: 'From Meta → WhatsApp → API Setup' },
              { key: 'whatsapp_token', label: 'Permanent Access Token', placeholder: 'EAAxxxx...', hint: 'Permanent token from Meta System User' },
            ].map(f => (
              <View key={f.key} style={section.formCard}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginBottom: 4 }}>{f.label}</Text>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginBottom: 8 }}>{f.hint}</Text>
                <TextInput
                  style={[section.input, { fontFamily: 'Inter_400Regular', fontSize: 13 }]}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={f.key === 'whatsapp_token'}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
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

const BROADCAST_TEMPLATES = [
  { label: '🎉 Holiday', text: "Dear Members, tomorrow is a holiday. The gym will be closed. We'll be back the day after. Thank you for your understanding! 💪" },
  { label: '⏰ Timing Change', text: "Important update: Our gym timings have changed. New hours: 6 AM – 10 PM on weekdays, 7 AM – 8 PM on weekends. Sorry for any inconvenience." },
  { label: '🧹 Maintenance', text: "Dear Members, the gym will be closed for maintenance tomorrow. We apologize for the inconvenience and will reopen the following day." },
  { label: '🏆 Special Event', text: "Exciting news! We're hosting a special fitness event this weekend. Stay tuned for details. Don't miss out! 💪🔥" },
  { label: '💳 Fee Reminder', text: "Friendly reminder: Your membership renewal is coming up. Please renew on time to avoid any interruption. Thank you!" },
  { label: '🌙 Early Close', text: "Dear Members, the gym will close early today at 7 PM. Normal hours resume tomorrow. Thank you for your cooperation." },
];

// ── WhatsApp Broadcast Modal ──────────────────────────────────────────
function BroadcastWhatsAppModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const broadcast = useBroadcastWhatsApp();
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<'clients' | 'trainers' | 'both'>('both');
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const handleClose = () => {
    setMessage('');
    setRecipient('both');
    setSent(false);
    setSendError('');
    broadcast.reset();
    onClose();
  };

  const handleSend = () => {
    if (!message.trim() || !user?.gym_id) return;
    setSendError('');
    broadcast.mutate(
      { gym_id: user.gym_id, sender_name: user.name, message: message.trim(), recipient_type: recipient },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSent(true);
        },
        onError: (e: any) => {
          setSendError(e?.message || 'Failed to queue broadcast. Please try again.');
        },
      }
    );
  };

  if (sent) {
    return (
      <KeyboardAvoidingView style={broadcastStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20, alignItems: 'center' }]}>
          <Ionicons name="checkmark-circle" size={54} color="#25D366" style={{ marginBottom: 12 }} />
          <Text style={[broadcastStyles.title, { textAlign: 'center' }]}>WhatsApp Broadcast Queued!</Text>
          <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
            Your message has been queued. WhatsApp messages will be sent to all {recipient === 'both' ? 'members & trainers' : recipient === 'clients' ? 'members' : 'trainers'} shortly.
          </Text>
          <Pressable style={[broadcastStyles.sendBtn, { backgroundColor: '#25D366' }]} onPress={handleClose}>
            <Text style={[broadcastStyles.sendBtnText, { color: '#fff' }]}>Done</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[broadcastStyles.overlay]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={{ flex: 1 }} onPress={handleClose} />
      <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={broadcastStyles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <Text style={broadcastStyles.title}>WhatsApp Broadcast</Text>
          </View>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 14 }}>
          Sends a WhatsApp message to all selected members via your configured number.
        </Text>

        {/* Recipients */}
        <Text style={broadcastStyles.label}>Send To</Text>
        <View style={broadcastStyles.recipientRow}>
          {(['clients', 'trainers', 'both'] as const).map(r => (
            <Pressable
              key={r}
              style={[broadcastStyles.recipientBtn, recipient === r && broadcastStyles.recipientBtnActive]}
              onPress={() => setRecipient(r)}
            >
              <Ionicons
                name={r === 'clients' ? 'people-outline' : r === 'trainers' ? 'barbell-outline' : 'globe-outline'}
                size={14}
                color={recipient === r ? '#000' : Colors.textSecondary}
              />
              <Text style={[broadcastStyles.recipientText, recipient === r && broadcastStyles.recipientTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Quick Templates */}
        <Text style={broadcastStyles.label}>Quick Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {BROADCAST_TEMPLATES.map(t => (
              <Pressable key={t.label} style={broadcastStyles.templateChip} onPress={() => setMessage(t.text)}>
                <Text style={broadcastStyles.templateChipText}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Message */}
        <Text style={broadcastStyles.label}>Message</Text>
        <TextInput
          style={broadcastStyles.input}
          placeholder="Type your WhatsApp message..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={{ color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 8 }}>
          {message.length}/1000 characters
        </Text>

        {!!sendError && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: Colors.danger + '40' }}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} style={{ marginTop: 1 }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 }}>{sendError}</Text>
          </View>
        )}

        <Pressable
          style={[broadcastStyles.sendBtn, { backgroundColor: '#25D366' }, (!message.trim() || broadcast.isPending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!message.trim() || broadcast.isPending}
        >
          {broadcast.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={[broadcastStyles.sendBtnText, { color: '#fff' }]}>
                  Send via WhatsApp to {recipient === 'both' ? 'Members & Trainers' : recipient === 'clients' ? 'Members' : 'Trainers'}
                </Text>
              </>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function BroadcastInAppModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const broadcast = useBroadcastInApp();
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<'clients' | 'trainers' | 'both'>('both');
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    setMessage('');
    setRecipient('both');
    setSent(false);
    broadcast.reset();
    onClose();
  };

  const handleSend = () => {
    if (!message.trim() || !user?.gym_id) return;
    broadcast.mutate(
      { gym_id: user.gym_id, sender_name: user.name, message: message.trim(), recipient_type: recipient },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSent(true);
        },
        onError: () => {
          Alert.alert('Error', 'Failed to send in-app notification. Please try again.');
        },
      }
    );
  };

  if (sent) {
    return (
      <KeyboardAvoidingView style={broadcastStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20, alignItems: 'center' }]}>
          <Ionicons name="checkmark-circle" size={54} color={Colors.info} style={{ marginBottom: 12 }} />
          <Text style={[broadcastStyles.title, { textAlign: 'center' }]}>Notification Sent!</Text>
          <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
            In-app notification delivered to all {recipient === 'both' ? 'members & trainers' : recipient === 'clients' ? 'members' : 'trainers'} successfully.
          </Text>
          <Pressable style={[broadcastStyles.sendBtn, { backgroundColor: Colors.info }]} onPress={handleClose}>
            <Text style={[broadcastStyles.sendBtnText, { color: '#fff' }]}>Done</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[broadcastStyles.overlay]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={{ flex: 1 }} onPress={handleClose} />
      <View style={[broadcastStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={broadcastStyles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="notifications-outline" size={22} color={Colors.info} />
            <Text style={broadcastStyles.title}>In-App Broadcast</Text>
          </View>
          <Pressable onPress={handleClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 14 }}>
          Sends a push notification inside the GymApp to all selected members.
        </Text>

        {/* Quick Templates */}
        <Text style={broadcastStyles.label}>Quick Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {BROADCAST_TEMPLATES.map(t => (
              <Pressable key={t.label} style={broadcastStyles.templateChip} onPress={() => setMessage(t.text)}>
                <Text style={broadcastStyles.templateChipText}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Recipients */}
        <Text style={broadcastStyles.label}>Send To</Text>
        <View style={broadcastStyles.recipientRow}>
          {(['clients', 'trainers', 'both'] as const).map(r => (
            <Pressable
              key={r}
              style={[broadcastStyles.recipientBtn, recipient === r && broadcastStyles.recipientBtnActive]}
              onPress={() => setRecipient(r)}
            >
              <Ionicons
                name={r === 'clients' ? 'people-outline' : r === 'trainers' ? 'barbell-outline' : 'globe-outline'}
                size={14}
                color={recipient === r ? '#000' : Colors.textSecondary}
              />
              <Text style={[broadcastStyles.recipientText, recipient === r && broadcastStyles.recipientTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Message */}
        <Text style={broadcastStyles.label}>Message</Text>
        <TextInput
          style={broadcastStyles.input}
          placeholder="Type your in-app notification message..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={{ color: Colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 12 }}>
          {message.length}/1000 characters
        </Text>

        <Pressable
          style={[broadcastStyles.sendBtn, { backgroundColor: Colors.info }, (!message.trim() || broadcast.isPending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!message.trim() || broadcast.isPending}
        >
          {broadcast.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="notifications-outline" size={16} color="#fff" />
                <Text style={[broadcastStyles.sendBtnText, { color: '#fff' }]}>
                  Notify {recipient === 'both' ? 'Members & Trainers' : recipient === 'clients' ? 'Members' : 'Trainers'}
                </Text>
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
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  recipientBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  recipientText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  recipientTextActive: { color: '#000' },
  input: {
    backgroundColor: Colors.secondary, borderRadius: 12, padding: 14, minHeight: 120,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  templateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  templateChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.text },
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

// ── Gym Knowledge Base Section ─────────────────────────────────────────────
function GymKnowledgeSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: knowledge, isLoading } = useGymKnowledge(user?.gym_id);
  const upsert = useUpsertGymKnowledge();

  const [form, setForm] = useState({
    gym_name: '', tagline: '', description: '',
    location_address: '', location_maps_url: '',
    phone: '', email: '', website_url: '',
    weekday_open: '6:00 AM', weekday_close: '10:00 PM',
    weekend_open: '7:00 AM', weekend_close: '8:00 PM',
    is_open_sundays: true,
    current_offers: '', trainer_info: '', instagram_id: '', additional_info: '',
  });
  const [saved, setSaved] = useState(false);

  // Facilities: simple tag list
  const [facilities, setFacilities] = useState<string[]>([]);
  const [facilityInput, setFacilityInput] = useState('');

  const addFacility = () => {
    const v = facilityInput.trim();
    if (v && !facilities.includes(v)) setFacilities(p => [...p, v]);
    setFacilityInput('');
  };
  const removeFacility = (i: number) => setFacilities(p => p.filter((_, idx) => idx !== i));

  // Membership Plans: structured rows
  type Plan = { name: string; price: string; duration: string; description: string };
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planForm, setPlanForm] = useState<Plan>({ name: '', price: '', duration: '', description: '' });
  const [editingPlanIdx, setEditingPlanIdx] = useState<number | null>(null);

  const addPlan = () => {
    if (!planForm.name || !planForm.price) return;
    if (editingPlanIdx !== null) {
      setPlans(p => p.map((pl, i) => i === editingPlanIdx ? { ...planForm } : pl));
      setEditingPlanIdx(null);
    } else {
      setPlans(p => [...p, { ...planForm }]);
    }
    setPlanForm({ name: '', price: '', duration: '', description: '' });
  };
  const removePlan = (i: number) => setPlans(p => p.filter((_, idx) => idx !== i));
  const editPlan = (i: number) => { setPlanForm({ ...plans[i] }); setEditingPlanIdx(i); };

  useEffect(() => {
    if (knowledge) {
      setForm({
        gym_name: knowledge.gym_name || '',
        tagline: knowledge.tagline || '',
        description: knowledge.description || '',
        location_address: knowledge.location_address || '',
        location_maps_url: knowledge.location_maps_url || '',
        phone: knowledge.phone || '',
        email: knowledge.email || '',
        website_url: knowledge.website_url || '',
        weekday_open: knowledge.weekday_open || '6:00 AM',
        weekday_close: knowledge.weekday_close || '10:00 PM',
        weekend_open: knowledge.weekend_open || '7:00 AM',
        weekend_close: knowledge.weekend_close || '8:00 PM',
        is_open_sundays: knowledge.is_open_sundays ?? true,
        current_offers: knowledge.current_offers || '',
        trainer_info: knowledge.trainer_info || '',
        instagram_id: knowledge.instagram_id || '',
        additional_info: knowledge.additional_info || '',
      });
      const facs = knowledge.facilities || [];
      setFacilities(Array.isArray(facs) ? facs.map(String) : []);
      const pls = knowledge.membership_plans || [];
      setPlans(Array.isArray(pls) ? pls.map((p: any) => ({
        name: p.name || '', price: String(p.price || ''),
        duration: p.duration || '', description: p.description || '',
      })) : []);
    }
  }, [knowledge]);

  const handleSave = () => {
    upsert.mutate({
      gym_id: user?.gym_id,
      ...form,
      membership_plans: plans,
      facilities: facilities,
    }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const field = (key: string, label: string, placeholder: string, multiline = false) => (
    <View key={key} style={kbSt.field}>
      <Text style={kbSt.label}>{label}</Text>
      <TextInput
        style={[kbSt.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={(form as any)[key]}
        onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
        multiline={multiline}
      />
    </View>
  );

  return (
    <View style={[kbSt.container, { paddingTop: insets.top + 8 }]}>
      <View style={kbSt.header}>
        <Pressable onPress={onClose} style={kbSt.closeBtn}>
          <Ionicons name="chevron-down" size={22} color={Colors.text} />
        </Pressable>
        <Text style={kbSt.headerTitle}>Gym Knowledge Base</Text>
        <Pressable
          style={[kbSt.saveBtn, saved && { backgroundColor: '#22C55E' }]}
          onPress={handleSave}
          disabled={upsert.isPending}
        >
          {upsert.isPending
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={kbSt.saveBtnText}>{saved ? 'Saved \u2713' : 'Save'}</Text>}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 40 }}>

          <View style={kbSt.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.info} />
            <Text style={kbSt.infoText}>
              This information is used by AI to answer questions from leads and members on WhatsApp and Instagram.
            </Text>
          </View>

          <Text style={kbSt.section}>Basic Info</Text>
          {field('gym_name', 'Gym Name', 'One Life Fitness')}
          {field('tagline', 'Tagline', 'Your transformation starts here')}
          {field('description', 'Description', 'Tell us about your gym...', true)}
          {field('phone', 'Phone Number', '+91 98765 43210')}
          {field('email', 'Email', 'gym@email.com')}
          {field('website_url', 'Website URL', 'https://yourgymlabel.com')}

          <Text style={kbSt.section}>Location</Text>
          {field('location_address', 'Full Address', '123 Main Road, Ongole, AP 523001')}
          {field('location_maps_url', 'Google Maps Link', 'https://maps.google.com/...')}

          <Text style={kbSt.section}>Timings</Text>
          <View style={kbSt.row}>
            <View style={[kbSt.field, { flex: 1 }]}>
              <Text style={kbSt.label}>Weekday Open</Text>
              <TextInput style={kbSt.input} value={form.weekday_open} onChangeText={v => setForm(p => ({ ...p, weekday_open: v }))} placeholder="6:00 AM" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[kbSt.field, { flex: 1 }]}>
              <Text style={kbSt.label}>Weekday Close</Text>
              <TextInput style={kbSt.input} value={form.weekday_close} onChangeText={v => setForm(p => ({ ...p, weekday_close: v }))} placeholder="10:00 PM" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
          <View style={kbSt.row}>
            <View style={[kbSt.field, { flex: 1 }]}>
              <Text style={kbSt.label}>Weekend Open</Text>
              <TextInput style={kbSt.input} value={form.weekend_open} onChangeText={v => setForm(p => ({ ...p, weekend_open: v }))} placeholder="7:00 AM" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[kbSt.field, { flex: 1 }]}>
              <Text style={kbSt.label}>Weekend Close</Text>
              <TextInput style={kbSt.input} value={form.weekend_close} onChangeText={v => setForm(p => ({ ...p, weekend_close: v }))} placeholder="8:00 PM" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
          <View style={kbSt.switchRow}>
            <Text style={kbSt.switchLabel}>Open on Sundays</Text>
            <Switch
              value={form.is_open_sundays}
              onValueChange={v => setForm(p => ({ ...p, is_open_sundays: v }))}
              trackColor={{ true: Colors.primary }}
            />
          </View>

          {/* Membership Plans */}
          <Text style={kbSt.section}>Membership Plans</Text>
          {plans.map((pl, i) => (
            <View key={i} style={kbSt.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={kbSt.planName}>{pl.name}</Text>
                <Text style={kbSt.planMeta}>\u20b9{pl.price}  \u00b7  {pl.duration}</Text>
                {!!pl.description && <Text style={kbSt.planDesc}>{pl.description}</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => editPlan(i)} style={kbSt.planIconBtn}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.info} />
                </Pressable>
                <Pressable onPress={() => removePlan(i)} style={kbSt.planIconBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
          <View style={kbSt.planFormBox}>
            <Text style={[kbSt.label, { marginBottom: 8 }]}>{editingPlanIdx !== null ? 'Edit Plan' : 'Add Plan'}</Text>
            <View style={kbSt.row}>
              <View style={{ flex: 1 }}>
                <TextInput style={kbSt.input} placeholder="Name (e.g. Monthly)" placeholderTextColor={Colors.textMuted}
                  value={planForm.name} onChangeText={v => setPlanForm(p => ({ ...p, name: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput style={kbSt.input} placeholder="Price" placeholderTextColor={Colors.textMuted}
                  value={planForm.price} onChangeText={v => setPlanForm(p => ({ ...p, price: v }))} keyboardType="numeric" />
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <TextInput style={kbSt.input} placeholder="Duration (e.g. 1 month, 3 months)" placeholderTextColor={Colors.textMuted}
                value={planForm.duration} onChangeText={v => setPlanForm(p => ({ ...p, duration: v }))} />
            </View>
            <View style={{ marginTop: 8 }}>
              <TextInput style={kbSt.input} placeholder="Description (optional)" placeholderTextColor={Colors.textMuted}
                value={planForm.description} onChangeText={v => setPlanForm(p => ({ ...p, description: v }))} />
            </View>
            <Pressable
              style={[kbSt.addTagBtn, (!planForm.name || !planForm.price) && { opacity: 0.4 }]}
              onPress={addPlan} disabled={!planForm.name || !planForm.price}
            >
              <Ionicons name={editingPlanIdx !== null ? "checkmark" : "add"} size={16} color="#000" />
              <Text style={kbSt.addTagBtnText}>{editingPlanIdx !== null ? 'Update Plan' : 'Add Plan'}</Text>
            </Pressable>
            {editingPlanIdx !== null && (
              <Pressable style={[kbSt.addTagBtn, { backgroundColor: Colors.card, marginTop: 6 }]}
                onPress={() => { setEditingPlanIdx(null); setPlanForm({ name: '', price: '', duration: '', description: '' }); }}>
                <Text style={[kbSt.addTagBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
              </Pressable>
            )}
          </View>

          {/* Facilities */}
          <Text style={kbSt.section}>Facilities</Text>
          <View style={kbSt.tagWrap}>
            {facilities.map((f, i) => (
              <Pressable key={i} style={kbSt.tag} onPress={() => removeFacility(i)}>
                <Text style={kbSt.tagText}>{f}</Text>
                <Ionicons name="close-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
              </Pressable>
            ))}
          </View>
          <View style={kbSt.tagInputRow}>
            <TextInput
              style={[kbSt.input, { flex: 1 }]}
              placeholder="e.g. AC Hall, Cardio Zone..."
              placeholderTextColor={Colors.textMuted}
              value={facilityInput}
              onChangeText={setFacilityInput}
              onSubmitEditing={addFacility}
              returnKeyType="done"
            />
            <Pressable style={kbSt.addTagBtn} onPress={addFacility}>
              <Ionicons name="add" size={18} color="#000" />
            </Pressable>
          </View>

          <Text style={kbSt.section}>Other Info</Text>
          {field('current_offers', 'Current Offers / Discounts', 'e.g. 20% off on annual memberships this month')}
          {field('trainer_info', 'Trainer Info', 'e.g. 3 certified trainers with 5+ years experience', true)}
          {field('instagram_id', 'Instagram Page ID', 'Required for Instagram DM automation')}
          {field('additional_info', 'Additional Info for AI', 'Any other context the AI should know...', true)}

        </ScrollView>
      )}
    </View>
  );
}

// ── Automation Config Section ──────────────────────────────────────────────
function AutomationConfigSection({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: config, isLoading } = useGymAutomationConfig(user?.gym_id);
  const { data: enabledModules } = useEnabledModules(user?.gym_id);
  const upsert = useUpsertGymAutomationConfig();

  const hasLeadModule  = enabledModules?.has('WhatsApp lead management') || enabledModules?.has('whatsapp_leads') || false;
  const hasTrainerDiet = enabledModules?.has('Trainer login and diet charts') || enabledModules?.has('trainer_diet') || false;
  const hasInstagram   = enabledModules?.has('instagram leads') || enabledModules?.has('instagram_leads') || false;

  const [form, setForm] = useState({
    whatsapp_automation_enabled: true,
    instagram_automation_enabled: false,
    lead_pipeline_enabled: true,
    member_query_enabled: true,
    expiry_reminders_enabled: true,
    diet_messages_enabled: false,
    subscription_reminders_enabled: true,
    expiry_reminder_time: '07:00',
    diet_message_time: '07:00',
    subscription_reminder_time: '09:00',
    expiry_reminder_days_before: 1,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        whatsapp_automation_enabled: config.whatsapp_automation_enabled ?? true,
        instagram_automation_enabled: config.instagram_automation_enabled ?? false,
        lead_pipeline_enabled: config.lead_pipeline_enabled ?? true,
        member_query_enabled: config.member_query_enabled ?? true,
        expiry_reminders_enabled: config.expiry_reminders_enabled ?? true,
        diet_messages_enabled: config.diet_messages_enabled ?? false,
        subscription_reminders_enabled: config.subscription_reminders_enabled ?? true,
        expiry_reminder_time: config.expiry_reminder_time || '07:00',
        diet_message_time: config.diet_message_time || '07:00',
        subscription_reminder_time: config.subscription_reminder_time || '09:00',
        expiry_reminder_days_before: config.expiry_reminder_days_before ?? 1,
      });
    }
  }, [config]);

  const handleSave = () => {
    upsert.mutate({ gym_id: user?.gym_id, ...form }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  };

  const toggle = (key: string, label: string, subtitle?: string) => (
    <View key={key} style={acSt.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={acSt.toggleLabel}>{label}</Text>
        {subtitle && <Text style={acSt.toggleSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={(form as any)[key]}
        onValueChange={v => setForm(p => ({ ...p, [key]: v }))}
        trackColor={{ true: Colors.primary }}
      />
    </View>
  );

  const timeField = (key: string, label: string) => (
    <View key={key} style={acSt.field}>
      <Text style={acSt.fieldLabel}>{label}</Text>
      <TextInput
        style={acSt.fieldInput}
        value={(form as any)[key]}
        onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
        placeholder="07:00"
        placeholderTextColor={Colors.textMuted}
      />
      <Text style={acSt.fieldHint}>24hr format e.g. 07:00, 18:30</Text>
    </View>
  );

  return (
    <View style={[acSt.container, { paddingTop: insets.top + 8 }]}>
      <View style={acSt.header}>
        <Pressable onPress={onClose} style={acSt.closeBtn}>
          <Ionicons name="chevron-down" size={22} color={Colors.text} />
        </Pressable>
        <Text style={acSt.headerTitle}>Automation Settings</Text>
        <Pressable
          style={[acSt.saveBtn, saved && { backgroundColor: '#22C55E' }]}
          onPress={handleSave}
          disabled={upsert.isPending}
        >
          {upsert.isPending
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={acSt.saveBtnText}>{saved ? 'Saved ✓' : 'Save'}</Text>}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 40 }}>

          <Text style={acSt.section}>Base Automation</Text>
          {toggle('whatsapp_automation_enabled', 'WhatsApp Automation', 'AI replies to incoming WhatsApp messages')}
          {toggle('member_query_enabled', 'Member Query Answering', 'AI answers existing member questions using gym knowledge')}
          {toggle('expiry_reminders_enabled', 'Expiry Reminders', 'WhatsApp reminder sent before membership expires')}
          {toggle('subscription_reminders_enabled', 'Subscription Reminders', 'Remind gym owner before their platform subscription expires')}

          <Text style={acSt.section}>Lead Management</Text>
          {hasLeadModule
            ? toggle('lead_pipeline_enabled', 'Lead Pipeline', 'Auto-capture & manage leads through AI pipeline')
            : <View style={[acSt.toggleRow, { opacity: 0.45 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={acSt.toggleLabel}>Lead Pipeline</Text>
                  <Text style={[acSt.toggleSub, { color: Colors.danger }]}>🔒 Requires WhatsApp Lead Management module</Text>
                </View>
                <Switch value={false} disabled />
              </View>}

          <Text style={acSt.section}>Instagram</Text>
          {hasInstagram
            ? toggle('instagram_automation_enabled', 'Instagram Automation', 'AI replies to Instagram DMs')
            : <View style={[acSt.toggleRow, { opacity: 0.45 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={acSt.toggleLabel}>Instagram Automation</Text>
                  <Text style={[acSt.toggleSub, { color: Colors.danger }]}>🔒 Requires Instagram Leads module</Text>
                </View>
                <Switch value={false} disabled />
              </View>}

          <Text style={acSt.section}>Diet & Nutrition</Text>
          {hasTrainerDiet
            ? toggle('diet_messages_enabled', 'Diet Messages', 'Send diet plan when trainer assigns')
            : <View style={[acSt.toggleRow, { opacity: 0.45 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={acSt.toggleLabel}>Diet Messages</Text>
                  <Text style={[acSt.toggleSub, { color: Colors.danger }]}>🔒 Requires Trainer Login & Diet Charts module</Text>
                </View>
                <Switch value={false} disabled />
              </View>}

          <Text style={acSt.section}>Timing Settings</Text>
          {form.expiry_reminders_enabled && (
            <>
              {timeField('expiry_reminder_time', 'Expiry Reminder Time')}
              <View style={acSt.field}>
                <Text style={acSt.fieldLabel}>Days Before Expiry to Remind</Text>
                <TextInput
                  style={acSt.fieldInput}
                  value={String(form.expiry_reminder_days_before)}
                  onChangeText={v => setForm(p => ({ ...p, expiry_reminder_days_before: parseInt(v) || 1 }))}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={acSt.fieldHint}>Number of days before expiry to send WhatsApp reminder</Text>
              </View>
            </>
          )}
          {form.diet_messages_enabled && timeField('diet_message_time', 'Diet Message Time')}
          {form.subscription_reminders_enabled && timeField('subscription_reminder_time', 'Subscription Reminder Time')}

        </ScrollView>
      )}
    </View>
  );
}

const kbSt = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, flex: 1 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' },
  section: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text, marginTop: 20, marginBottom: 8 },
  field: { gap: 5, marginBottom: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.card, borderRadius: 10, height: 44, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.info + '30', marginBottom: 10 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, flex: 1, lineHeight: 17 },
  // Plan styles
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  planName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  planMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  planDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  planIconBtn: { padding: 6 },
  planFormBox: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  addTagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginTop: 10, gap: 4 },
  addTagBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#000' },
  // Facility tag styles
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary + '40' },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary },
  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});

const acSt = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, flex: 1 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' },
  section: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text, marginTop: 20, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  toggleLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  toggleSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  field: { gap: 5, marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { backgroundColor: Colors.card, borderRadius: 10, height: 44, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  fieldHint: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
});
