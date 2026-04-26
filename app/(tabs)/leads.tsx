import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  FlatList, Modal, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useLeads, useInsertLead, useUpdateLead, useDeleteLead,
  useInsertActivity, useEnabledModules,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DatePicker } from '@/components/DatePicker';
import { Badge } from '@/components/Badge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

type LeadStatus = 'enquiry' | 'trial_booked' | 'visited' | 'member' | 'churned';
const STATUS_ORDER: LeadStatus[] = ['enquiry', 'trial_booked', 'visited', 'member', 'churned'];
const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry', trial_booked: 'Trial Booked',
  visited: 'Visited', member: 'Member', churned: 'Churned',
};
const STATUS_COLORS: Record<LeadStatus, string> = {
  enquiry: Colors.info, trial_booked: Colors.warning,
  visited: Colors.purple, member: Colors.primary, churned: Colors.danger,
};
const SOURCE_ICONS: Record<string, string> = {
  whatsapp: 'logo-whatsapp', instagram: 'logo-instagram',
  website: 'globe-outline', missed_call: 'call-outline', manual: 'person-add-outline',
};

// Placeholder webhook info panel
function AutomationPanel({ type, gymPhone }: { type: 'whatsapp' | 'instagram'; gymPhone?: string }) {
  const isWA = type === 'whatsapp';
  return (
    <View style={[autoStyles.panel, { borderColor: isWA ? '#25D366' : '#E1306C' }]}>
      <View style={autoStyles.panelHeader}>
        <Ionicons name={isWA ? 'logo-whatsapp' : 'logo-instagram'} size={20} color={isWA ? '#25D366' : '#E1306C'} />
        <Text style={autoStyles.panelTitle}>{isWA ? 'WhatsApp' : 'Instagram'} Auto-Leads</Text>
        <View style={autoStyles.activeTag}>
          <Text style={autoStyles.activeTagText}>Module Active</Text>
        </View>
      </View>
      <Text style={autoStyles.panelDesc}>
        {isWA
          ? 'When someone messages your WhatsApp Business number, they are automatically added as a lead here with source "whatsapp".'
          : 'When someone DMs your Instagram business account, they are automatically added as a lead here with source "instagram".'}
      </Text>
      <View style={autoStyles.setupRow}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={autoStyles.setupText}>
          {isWA
            ? 'Requires WhatsApp Business API webhook connected to your server.'
            : 'Requires Instagram Graph API webhook connected to your server.'}
        </Text>
      </View>
      <Pressable
        style={autoStyles.setupBtn}
        onPress={() => Linking.openURL('https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks')}
      >
        <Ionicons name="open-outline" size={14} color={Colors.info} />
        <Text style={autoStyles.setupBtnText}>View Setup Guide</Text>
      </Pressable>
    </View>
  );
}

export default function LeadsScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { data: leads = [], isLoading } = useLeads(user?.gym_id);
  const { data: enabledModules } = useEnabledModules(user?.gym_id);
  const insertLead = useInsertLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const insertActivity = useInsertActivity();

  // Module gates
  const leadsEnabled = enabledModules?.has('leads management') ?? true; // default on if no modules
  const waLeadsEnabled = enabledModules?.has('whatsapp leads') ?? false;
  const igLeadsEnabled = enabledModules?.has('instagram leads') ?? false;
  const hasAnyLeads = leadsEnabled || waLeadsEnabled || igLeadsEnabled;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'manual', goal: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const filtered = useMemo(() => {
    return leads.filter((l: any) => {
      if (filter !== 'all' && l.status !== filter) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
          !l.phone?.includes(search)) return false;
      return true;
    });
  }, [leads, filter, search]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { counts[s] = leads.filter((l: any) => l.status === s).length; });
    return counts;
  }, [leads]);

  const moveLeadRight = (lead: any) => {
    const idx = STATUS_ORDER.indexOf(lead.status as LeadStatus);
    if (idx < STATUS_ORDER.length - 1) {
      const newStatus = STATUS_ORDER[idx + 1];
      updateLead.mutate({ id: lead.id, status: newStatus }, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Lead advanced', details: `${lead.name} → ${STATUS_LABELS[newStatus]}` });
        },
      });
    }
  };

  const moveLeadLeft = (lead: any) => {
    const idx = STATUS_ORDER.indexOf(lead.status as LeadStatus);
    if (idx > 0) {
      const newStatus = STATUS_ORDER[idx - 1];
      updateLead.mutate({ id: lead.id, status: newStatus }, {
        onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      });
    }
  };

  const handleAdd = () => {
    setFormError('');
    if (!form.name || !form.phone) { setFormError('Name and phone are required'); return; }
    insertLead.mutate({
      name: form.name, phone: form.phone,
      source: form.source, goal: form.goal,
      notes: form.notes,
      gym_id: user?.gym_id || null,
      status: 'enquiry',
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
        setForm({ name: '', phone: '', source: 'manual', goal: '', notes: '' });
        insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Added new lead', details: form.name });
      },
      onError: (e: any) => setFormError(e.message),
    });
  };

  if (!hasAnyLeads && enabledModules !== undefined) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Lead Pipeline" />
        <View style={styles.noModule}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.noModuleTitle}>Leads module not active</Text>
          <Text style={styles.noModuleSub}>Ask your platform admin to enable the Leads Management module for your gym.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Lead Pipeline"
        subtitle={`${leads.length} leads`}
        rightAction={{
          icon: <Ionicons name="add" size={20} color={Colors.primary} />,
          onPress: () => { Haptics.selectionAsync(); setShowAdd(true); },
        }}
      />

      {/* Pipeline overview */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pipelineRow} contentContainerStyle={styles.pipelineContent}>
        {STATUS_ORDER.map(s => (
          <Pressable
            key={s}
            style={[styles.pipelineChip, filter === s && { borderColor: STATUS_COLORS[s] }]}
            onPress={() => { setFilter(filter === s ? 'all' : s); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.pipelineCount, { color: STATUS_COLORS[s] }]}>{pipelineCounts[s] || 0}</Text>
            <Text style={styles.pipelineLabel}>{STATUS_LABELS[s]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Automation panels */}
      {(waLeadsEnabled || igLeadsEnabled) && (
        <Pressable style={styles.autoBar} onPress={() => setShowAutomation(s => !s)}>
          <Ionicons name="flash-outline" size={14} color={Colors.warning} />
          <Text style={styles.autoBarText}>
            Auto-lead capture active:{' '}
            {[waLeadsEnabled && 'WhatsApp', igLeadsEnabled && 'Instagram'].filter(Boolean).join(', ')}
          </Text>
          <Ionicons name={showAutomation ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
        </Pressable>
      )}
      {showAutomation && waLeadsEnabled && <AutomationPanel type="whatsapp" />}
      {showAutomation && igLeadsEnabled && <AutomationPanel type="instagram" />}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></Pressable>}
        <Pressable
          style={[styles.filterAll, filter !== 'all' && { backgroundColor: Colors.primaryMuted }]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterAllText, filter !== 'all' && { color: Colors.primary }]}>All</Text>
        </Pressable>
      </View>

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
              <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{search || filter !== 'all' ? 'No leads match' : 'No leads yet'}</Text>
              {!search && filter === 'all' && <Text style={styles.emptySub}>Tap + to add your first lead</Text>}
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <Pressable style={styles.leadCard} onPress={() => setSelectedLead(item)}>
              <View style={styles.leadTop}>
                <View style={styles.leadAvatar}>
                  <Text style={styles.leadAvatarText}>{item.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  <View style={styles.leadMeta}>
                    <Ionicons name={SOURCE_ICONS[item.source] as any || 'ellipse-outline'} size={13} color={item.source === 'whatsapp' ? '#25D366' : item.source === 'instagram' ? '#E1306C' : Colors.textMuted} />
                    <Text style={styles.leadPhone}>{item.phone}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status as LeadStatus] + '20', borderColor: STATUS_COLORS[item.status as LeadStatus] + '50' }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status as LeadStatus] }]}>{STATUS_LABELS[item.status as LeadStatus]}</Text>
                </View>
              </View>
              {item.goal && <Text style={styles.leadGoal}>Goal: {item.goal}</Text>}
              {item.notes && <Text style={styles.leadNotes} numberOfLines={1}>{item.notes}</Text>}
              <View style={styles.leadActions}>
                <Pressable
                  style={[styles.moveBtn, { opacity: item.status === STATUS_ORDER[0] ? 0.3 : 1 }]}
                  onPress={() => moveLeadLeft(item)}
                  disabled={item.status === STATUS_ORDER[0]}
                >
                  <Ionicons name="arrow-back-circle-outline" size={20} color={Colors.textMuted} />
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.stageHint}>
                    Stage {STATUS_ORDER.indexOf(item.status as LeadStatus) + 1} of {STATUS_ORDER.length}
                  </Text>
                </View>
                <Pressable
                  style={[styles.moveBtn, { opacity: item.status === 'churned' ? 0.3 : 1 }]}
                  onPress={() => moveLeadRight(item)}
                  disabled={item.status === 'churned'}
                >
                  <Ionicons name="arrow-forward-circle" size={20} color={item.status === 'churned' ? Colors.textMuted : Colors.primary} />
                </Pressable>
                <Pressable onPress={() => setPendingDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Add Lead Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAdd(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Lead</Text>
            <Pressable onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Rahul Sharma', keyboard: 'default' },
              { key: 'phone', label: 'Phone *', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
              { key: 'goal', label: 'Goal', placeholder: 'Weight loss, Muscle gain...', keyboard: 'default' },
              { key: 'notes', label: 'Notes', placeholder: 'Any additional info...', keyboard: 'default' },
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
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Source</Text>
              <View style={styles.sourceRow}>
                {(['manual', 'whatsapp', 'instagram', 'website', 'missed_call'] as const).map(s => (
                  <Pressable
                    key={s}
                    style={[styles.sourceChip, form.source === s && styles.sourceChipActive]}
                    onPress={() => setForm(f => ({ ...f, source: s }))}
                  >
                    <Ionicons name={SOURCE_ICONS[s] as any} size={14} color={form.source === s ? Colors.primary : Colors.textMuted} />
                    <Text style={[styles.sourceChipText, form.source === s && { color: Colors.primary }]}>{s.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {!!formError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}
            <Pressable
              style={[styles.submitBtn, insertLead.isPending && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={insertLead.isPending}
            >
              {insertLead.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Add Lead</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!pendingDelete}
        title="Delete Lead"
        message={`Remove ${pendingDelete?.name} from the pipeline?`}
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteLead.mutate(pendingDelete.id, {
            onSuccess: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              insertActivity.mutate({ gym_id: user?.gym_id || null, actor_name: user?.name || 'Owner', action: 'Deleted lead', details: pendingDelete.name });
              setPendingDelete(null);
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
  noModule: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  noModuleTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  noModuleSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  pipelineRow: { flexGrow: 0, marginTop: 10 },
  pipelineContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  pipelineChip: { alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, minWidth: 80 },
  pipelineCount: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  pipelineLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  autoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.warning + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.warning + '30' },
  autoBarText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.warning, flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 4, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, height: 42 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  filterAll: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.secondary },
  filterAllText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textMuted },
  leadCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  leadTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leadAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  leadAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.primary },
  leadName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  leadPhone: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  leadGoal: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info },
  leadNotes: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  leadActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  moveBtn: { padding: 6 },
  stageHint: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  deleteBtn: { padding: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  formField: { gap: 6, marginBottom: 16 },
  formLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: Colors.card, borderRadius: 12, height: 46, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  sourceChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  sourceChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  submitBtn: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
});

const autoStyles = StyleSheet.create({
  panel: { marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text, flex: 1 },
  activeTag: { backgroundColor: Colors.primary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activeTagText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.primary },
  panelDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  setupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  setupText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 16 },
  setupBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.info + '15', borderWidth: 1, borderColor: Colors.info + '30' },
  setupBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.info },
});
