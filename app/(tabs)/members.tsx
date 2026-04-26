import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  Modal, ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useMembers, useTrainers, useUpdateMember, useDeleteMember,
  useInsertActivity, useEnabledModules, useInsertMemberWithLogin,
  useBulkImportMembers, useBulkImportTrainers,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DatePicker } from '@/components/DatePicker';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';


const PLANS = ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly'];
const PLAN_DAYS: Record<string, number> = { Monthly: 30, Quarterly: 90, 'Half-yearly': 180, Yearly: 365 };

function addDays(from: string, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function today(): string { return new Date().toISOString().split('T')[0]; }

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  });
}

// ── Import Modal (paste CSV text) ────────────────────────────────────
function ImportModal({ visible, onClose, gymId, trainerList }: {
  visible: boolean; onClose: () => void; gymId: string; trainerList: any[];
}) {
  const insets = useSafeAreaInsets();
  const bulkImportMembers = useBulkImportMembers();
  const bulkImportTrainers = useBulkImportTrainers();
  const [importType, setImportType] = useState<'members' | 'trainers'>('members');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const preview = csvText.trim() ? parseCSV(csvText).slice(0, 3) : [];

  const handleImport = async () => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) { Alert.alert('No data', 'Paste CSV data first'); return; }
    setImporting(true);
    setResult(null);
    try {
      if (importType === 'members') {
        const r = await bulkImportMembers.mutateAsync({ gym_id: gymId, rows: rows as any, trainerList });
        setResult(r);
      } else {
        const r = await bulkImportTrainers.mutateAsync({ gym_id: gymId, rows: rows as any });
        setResult(r);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!result || result.failed === 0) setCsvText('');
    } catch (e: any) {
      Alert.alert('Import failed', e.message);
    }
    setImporting(false);
  };

  const templateCols = importType === 'members'
    ? 'name,phone,plan,joining_date,trainer_name'
    : 'name,phone,email,specialization';

  const exampleRow = importType === 'members'
    ? 'Rahul Sharma,9876543210,Monthly,2026-04-01,John'
    : 'John Trainer,9876543210,john@gym.com,Weight Training';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Bulk Import</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Type selector */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {(['members', 'trainers'] as const).map(t => (
              <Pressable
                key={t}
                style={[styles.planChip, { flex: 1, alignItems: 'center' }, importType === t && styles.planChipActive]}
                onPress={() => { setImportType(t); setCsvText(''); setResult(null); }}
              >
                <Text style={[styles.planChipText, importType === t && styles.planChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Format guide */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Paste CSV data below</Text>
              <Text style={[styles.infoText, { fontFamily: 'Inter_600SemiBold' }]}>{templateCols}</Text>
              <Text style={styles.infoText}>{exampleRow}</Text>
              {importType === 'members' && (
                <Text style={[styles.infoText, { marginTop: 4 }]}>
                  {'Plan: Monthly / Quarterly / Half-yearly / Yearly\nDate format: YYYY-MM-DD (leave blank for today)'}
                </Text>
              )}
            </View>
          </View>

          {/* CSV text input */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Paste CSV Data</Text>
            <TextInput
              style={[styles.formInput, { height: 160, textAlignVertical: 'top', paddingTop: 12, fontFamily: 'Inter_400Regular', fontSize: 13 }]}
              placeholder={`${templateCols}
${exampleRow}
...`}
              placeholderTextColor={Colors.textMuted}
              value={csvText}
              onChangeText={setCsvText}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Preview */}
          {preview.length > 0 && (
            <View style={[styles.loginSection, { borderColor: Colors.primary + '40', backgroundColor: Colors.primaryMuted }]}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary, marginBottom: 6 }}>
                Preview ({parseCSV(csvText).length} rows detected)
              </Text>
              {preview.map((row, i) => (
                <Text key={i} style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.text, marginBottom: 3 }}>
                  {i + 1}. {row.name} — {row.phone}{row.plan ? ` — ${row.plan}` : ''}
                </Text>
              ))}
            </View>
          )}

          {/* Result */}
          {result && (
            <View style={[styles.infoBox, { borderColor: result.failed > 0 ? Colors.warning + '40' : Colors.primary + '40', backgroundColor: result.failed > 0 ? Colors.warning + '10' : Colors.primaryMuted }]}>
              <Ionicons name={result.failed > 0 ? 'warning-outline' : 'checkmark-circle'} size={16} color={result.failed > 0 ? Colors.warning : Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text }}>
                  {result.success} imported, {result.failed} failed
                </Text>
                {result.errors.slice(0, 3).map((e, i) => (
                  <Text key={i} style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.danger, marginTop: 3 }}>{e}</Text>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={[styles.submitBtn, (importing || !csvText.trim()) && { opacity: 0.5 }]}
            onPress={handleImport}
            disabled={importing || !csvText.trim()}
          >
            {importing ? <ActivityIndicator color="#000" /> : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                <Text style={styles.submitBtnText}>Import {importType === 'members' ? 'Members' : 'Trainers'}</Text>
              </>
            )}
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function MembersScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { data: members = [], isLoading } = useMembers(user?.gym_id);
  const { data: trainerList = [] } = useTrainers(user?.gym_id);
  const { data: enabledModules } = useEnabledModules(user?.gym_id);
  const insertMemberWithLogin = useInsertMemberWithLogin();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const insertActivity = useInsertActivity();

  const memberLoginEnabled = enabledModules?.has('member login') ?? false;
  const feeRemindersEnabled = enabledModules?.has('fee reminders') ?? false;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', plan: '', trainer_id: '', expiry_date: '' });
  const [form, setForm] = useState({
    name: '', phone: '', plan: 'Monthly',
    trainer_id: '', email: '', password: '',
    joining_date: today(),
  });
  const [formError, setFormError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const filtered = useMemo(() => {
    return members.filter((m: any) => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (search && !m.name?.toLowerCase().includes(search.toLowerCase()) &&
          !m.phone?.includes(search)) return false;
      return true;
    });
  }, [members, filter, search]);

  const expiring = members.filter((m: any) => m.status === 'expiring').length;
  const expired = members.filter((m: any) => m.status === 'expired').length;

  const resetForm = () => {
    setForm({ name: '', phone: '', plan: 'Monthly', trainer_id: '', email: '', password: '', joining_date: today() });
    setFormError('');
    setShowPass(false);
  };

  const handleAdd = () => {
    setFormError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Name and phone are required');
      return;
    }
    if (memberLoginEnabled && form.email && form.password && form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    const joiningDate = form.joining_date || today();
    const expiryDate = addDays(joiningDate, PLAN_DAYS[form.plan] || 30);
    const createLogin = memberLoginEnabled && !!form.email && !!form.password;

    insertMemberWithLogin.mutate({
      memberData: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        plan: form.plan,
        joining_date: joiningDate,
        expiry_date: expiryDate,
        trainer_id: form.trainer_id || null,
        gym_id: user?.gym_id || null,
        status: 'active',
      },
      createLogin,
      email: form.email || undefined,
      password: form.password || undefined,
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
        resetForm();
        insertActivity.mutate({
          gym_id: user?.gym_id || null,
          actor_name: user?.name || 'Owner',
          action: 'Added member',
          details: `${form.name}${createLogin ? ' (login created)' : ''}`,
        });
      },
      onError: (e: any) => setFormError(e.message),
    });
  };

  const handleRenew = (m: any) => {
    const joiningDate = today();
    const newExpiry = addDays(joiningDate, PLAN_DAYS[m.plan] || 30);
    updateMember.mutate({ id: m.id, joining_date: joiningDate, expiry_date: newExpiry, status: 'active' }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelected(null);
        insertActivity.mutate({
          gym_id: user?.gym_id || null,
          actor_name: user?.name || 'Owner',
          action: 'Renewed membership',
          details: `${m.name} → ${newExpiry}`,
        });
      },
    });
  };

  const handleSaveEdit = () => {
    if (!selected) return;
    updateMember.mutate({
      id: selected.id,
      name: editForm.name,
      phone: editForm.phone,
      plan: editForm.plan,
      trainer_id: editForm.trainer_id || null,
      expiry_date: editForm.expiry_date,
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditing(false);
        setSelected(null);
      },
    });
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return Colors.primary;
    if (status === 'expiring') return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Members"
        subtitle={`${members.length} total`}
        rightAction={{
          icon: <Ionicons name="add" size={22} color={Colors.primary} />,
          onPress: () => { Haptics.selectionAsync(); setShowAdd(true); },
        }}
      />

      {/* Alerts + Import bar */}
      <View style={styles.topRow}>
        {expiring > 0 && (
          <View style={[styles.alertChip, { borderColor: Colors.warning + '40', backgroundColor: Colors.warning + '15' }]}>
            <Ionicons name="warning-outline" size={13} color={Colors.warning} />
            <Text style={[styles.alertText, { color: Colors.warning }]}>{expiring} expiring</Text>
          </View>
        )}
        {expired > 0 && (
          <View style={[styles.alertChip, { borderColor: Colors.danger + '40', backgroundColor: Colors.danger + '15' }]}>
            <Ionicons name="close-circle-outline" size={13} color={Colors.danger} />
            <Text style={[styles.alertText, { color: Colors.danger }]}>{expired} expired</Text>
          </View>
        )}
        {feeRemindersEnabled && (
          <View style={[styles.alertChip, { borderColor: Colors.primary + '40', backgroundColor: Colors.primaryMuted }]}>
            <Ionicons name="logo-whatsapp" size={13} color={Colors.primary} />
            <Text style={[styles.alertText, { color: Colors.primary }]}>Reminders ON</Text>
          </View>
        )}
        <Pressable
          style={[styles.alertChip, { borderColor: Colors.info + '40', backgroundColor: Colors.info + '15', marginLeft: 'auto' }]}
          onPress={() => setShowImport(true)}
        >
          <Ionicons name="cloud-upload-outline" size={13} color={Colors.info} />
          <Text style={[styles.alertText, { color: Colors.info }]}>Import</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></Pressable>}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(['all', 'active', 'expiring', 'expired'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{search || filter !== 'all' ? 'No members found' : 'No members yet'}</Text>
              <Text style={styles.emptySub}>{!search && filter === 'all' ? 'Tap + to add or Import to bulk upload' : ''}</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const daysLeft = item.expiry_date ? daysUntil(item.expiry_date) : null;
            const trainer = trainerList.find((t: any) => t.id === item.trainer_id);
            return (
              <Pressable
                style={styles.card}
                onPress={() => {
                  setSelected(item);
                  setEditing(false);
                  setEditForm({
                    name: item.name, phone: item.phone || '',
                    plan: item.plan || 'Monthly',
                    trainer_id: item.trainer_id || '',
                    expiry_date: item.expiry_date || '',
                  });
                }}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>{(item.name || 'M')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardPhone}>{item.phone}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) + '22', borderColor: getStatusColor(item.status) + '55' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{item.plan || 'Monthly'}</Text>
                  </View>
                  {trainer && (
                    <View style={styles.metaItem}>
                      <Ionicons name="barbell-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{trainer.name}</Text>
                    </View>
                  )}
                  {daysLeft !== null && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={daysLeft <= 7 ? Colors.danger : Colors.textMuted} />
                      <Text style={[styles.metaText, daysLeft <= 7 && { color: Colors.danger }]}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </Text>
                    </View>
                  )}
                  {memberLoginEnabled && (
                    <View style={styles.metaItem}>
                      <Ionicons name="phone-portrait-outline" size={12} color={Colors.info} />
                      <Text style={[styles.metaText, { color: Colors.info }]}>App</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Add Member Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet" onRequestClose={() => { setShowAdd(false); resetForm(); }}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <Pressable onPress={() => { setShowAdd(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Basic info */}
            <Text style={styles.sectionLabel}>Basic Info</Text>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Rahul Sharma', keyboard: 'default' },
              { key: 'phone', label: 'Phone *', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
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

            {/* Start date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Start Date</Text>
              <DatePicker
                value={form.joining_date}
                onChange={v => setForm(p => ({ ...p, joining_date: v }))}
                label="Select Start Date"
              />
            </View>

            {/* Plan */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Membership Plan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PLANS.map(p => (
                    <Pressable
                      key={p}
                      style={[styles.planChip, form.plan === p && styles.planChipActive]}
                      onPress={() => setForm(f => ({ ...f, plan: p }))}
                    >
                      <Text style={[styles.planChipText, form.plan === p && styles.planChipTextActive]}>{p}</Text>
                      <Text style={[styles.planChipDays, form.plan === p && { color: Colors.primary }]}>{PLAN_DAYS[p]}d</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.expiryHint}>
                Expiry: {addDays(form.joining_date || today(), PLAN_DAYS[form.plan] || 30)}
              </Text>
            </View>

            {/* Trainer selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Assign Trainer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[styles.planChip, !form.trainer_id && styles.planChipActive]}
                    onPress={() => setForm(f => ({ ...f, trainer_id: '' }))}
                  >
                    <Text style={[styles.planChipText, !form.trainer_id && styles.planChipTextActive]}>None</Text>
                  </Pressable>
                  {trainerList.map((t: any) => (
                    <Pressable
                      key={t.id}
                      style={[styles.planChip, form.trainer_id === t.id && styles.planChipActive]}
                      onPress={() => setForm(f => ({ ...f, trainer_id: t.id }))}
                    >
                      <Text style={[styles.planChipText, form.trainer_id === t.id && styles.planChipTextActive]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Login - only if Member Login module enabled */}
            {memberLoginEnabled && (
              <View style={styles.loginSection}>
                <View style={styles.loginHeader}>
                  <Ionicons name="phone-portrait-outline" size={16} color={Colors.info} />
                  <Text style={styles.loginTitle}>App Login (optional)</Text>
                  <View style={styles.moduleTag}>
                    <Text style={styles.moduleTagText}>Member Login</Text>
                  </View>
                </View>
                <Text style={styles.loginSub}>Leave blank to skip login creation</Text>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="member@email.com"
                    placeholderTextColor={Colors.textMuted}
                    value={form.email}
                    onChangeText={v => setForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Password</Text>
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
              style={[styles.submitBtn, insertMemberWithLogin.isPending && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={insertMemberWithLogin.isPending}
            >
              {insertMemberWithLogin.isPending
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.submitBtnText}>
                    {memberLoginEnabled && form.email ? 'Add Member + Create Login' : 'Add Member'}
                  </Text>
              }
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Member Detail Modal */}
      <Modal visible={!!selected && !editing} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected.name}</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Pressable onPress={() => setEditing(true)}>
                  <Ionicons name="pencil-outline" size={20} color={Colors.info} />
                </Pressable>
                <Pressable onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>
            </View>
            <ScrollView>
              <View style={styles.detailCard}>
                {[
                  { label: 'Phone', value: selected.phone, icon: 'call-outline' },
                  { label: 'Plan', value: selected.plan, icon: 'layers-outline' },
                  { label: 'Joined', value: selected.joining_date, icon: 'calendar-outline' },
                  { label: 'Expires', value: selected.expiry_date, icon: 'time-outline' },
                  { label: 'Status', value: selected.status, icon: 'ellipse-outline' },
                  { label: 'Trainer', value: trainerList.find((t: any) => t.id === selected.trainer_id)?.name || 'None', icon: 'barbell-outline' },
                ].map(item => (
                  <View key={item.label} style={styles.detailRow}>
                    <Ionicons name={item.icon as any} size={15} color={Colors.textMuted} />
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value || '—'}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: Colors.info }]}
                onPress={() => handleRenew(selected)}
                disabled={updateMember.isPending}
              >
                {updateMember.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="refresh-outline" size={18} color="#fff" /><Text style={[styles.submitBtnText, { color: '#fff' }]}>Renew Membership</Text></>
                }
              </Pressable>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: Colors.dangerMuted, marginTop: 10, borderWidth: 1, borderColor: Colors.danger + '40' }]}
                onPress={() => { setSelected(null); setPendingDelete(selected); }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                <Text style={[styles.submitBtnText, { color: Colors.danger }]}>Remove Member</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!selected && editing} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditing(false)}>
        {selected && (
          <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Member</Text>
              <Pressable onPress={() => setEditing(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {[
                { key: 'name', label: 'Name', keyboard: 'default' },
                { key: 'phone', label: 'Phone', keyboard: 'phone-pad' },
                { key: 'expiry_date', label: 'Expiry Date (YYYY-MM-DD)', keyboard: 'default' },
              ].map(f => (
                <View key={f.key} style={styles.formField}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={(editForm as any)[f.key]}
                    onChangeText={v => setEditForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={f.keyboard as any}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Plan</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PLANS.map(p => (
                    <Pressable
                      key={p}
                      style={[styles.planChip, editForm.plan === p && styles.planChipActive]}
                      onPress={() => setEditForm(f => ({ ...f, plan: p }))}
                    >
                      <Text style={[styles.planChipText, editForm.plan === p && styles.planChipTextActive]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Assign Trainer</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      style={[styles.planChip, !editForm.trainer_id && styles.planChipActive]}
                      onPress={() => setEditForm(f => ({ ...f, trainer_id: '' }))}
                    >
                      <Text style={[styles.planChipText, !editForm.trainer_id && styles.planChipTextActive]}>None</Text>
                    </Pressable>
                    {trainerList.map((t: any) => (
                      <Pressable
                        key={t.id}
                        style={[styles.planChip, editForm.trainer_id === t.id && styles.planChipActive]}
                        onPress={() => setEditForm(f => ({ ...f, trainer_id: t.id }))}
                      >
                        <Text style={[styles.planChipText, editForm.trainer_id === t.id && styles.planChipTextActive]}>{t.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <Pressable
                style={[styles.submitBtn, updateMember.isPending && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={updateMember.isPending}
              >
                {updateMember.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Import Modal */}
      <ImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        gymId={user?.gym_id || ''}
        trainerList={trainerList}
      />

      <ConfirmModal
        visible={!!pendingDelete}
        title="Remove Member"
        message={`Remove ${pendingDelete?.name}? This cannot be undone.`}
        confirmLabel="Remove"
        destructive
        loading={deleteMember.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteMember.mutate(pendingDelete.id, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPendingDelete(null);
              insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Removed member', details: pendingDelete.name });
            },
          });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 10, alignItems: 'center' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  alertText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, height: 42 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  filterRow: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  filterChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.primary },
  cardName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  cardPhone: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11, textTransform: 'capitalize' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  formField: { gap: 6, marginBottom: 14 },
  formLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: Colors.card, borderRadius: 12, height: 46, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  planChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  planChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  planChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  planChipTextActive: { color: Colors.primary },
  planChipDays: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  expiryHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  loginSection: { backgroundColor: Colors.info + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.info + '30', marginBottom: 14 },
  loginHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  loginTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.info, flex: 1 },
  loginSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginBottom: 10 },
  moduleTag: { backgroundColor: Colors.info + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  moduleTagText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.info },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, height: 46 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  submitBtn: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
  detailCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted, width: 70 },
  detailValue: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: Colors.info + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.info + '30', marginBottom: 14 },
  infoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginBottom: 4 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primaryMuted, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + '40', marginBottom: 14 },
  pickBtnText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.primary, flex: 1 },
});
