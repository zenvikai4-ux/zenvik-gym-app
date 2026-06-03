import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  FlatList, Modal, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useLeads, useInsertLead, useUpdateLead, useDeleteLead,
  useInsertActivity, useEnabledModules, useLeadConversations,
  useInsertLeadConversation, useSendWhatsAppMessage,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

// ── Pipeline stages ────────────────────────────────────────────────────────
type LeadStatus =
  | 'new'
  | 'ai_chatting'
  | 'interested'
  | 'handoff'
  | 'visit_scheduled'
  | 'visited'
  | 'converted'
  | 'lost';

const STATUS_ORDER: LeadStatus[] = [
  'new', 'ai_chatting', 'interested', 'handoff',
  'visit_scheduled', 'visited', 'converted', 'lost',
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  ai_chatting: 'AI Chatting',
  interested: 'Interested',
  handoff: 'Handoff',
  visit_scheduled: 'Visit Scheduled',
  visited: 'Visited',
  converted: 'Converted',
  lost: 'Lost',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: Colors.textMuted,
  ai_chatting: Colors.info,
  interested: Colors.warning,
  handoff: '#E1306C',
  visit_scheduled: Colors.purple,
  visited: Colors.primary,
  converted: '#22C55E',
  lost: Colors.danger,
};

// Stages the owner manages manually (handoff onwards)
const MANUAL_STAGES: LeadStatus[] = ['handoff', 'visit_scheduled', 'visited', 'converted', 'lost'];

const SOURCE_ICONS: Record<string, string> = {
  whatsapp: 'logo-whatsapp',
  instagram: 'logo-instagram',
  website: 'globe-outline',
  missed_call: 'call-outline',
  manual: 'person-add-outline',
};

// ── Lead Detail Modal ──────────────────────────────────────────────────────
function LeadDetailModal({
  lead,
  onClose,
  onUpdateStatus,
  onDelete,
}: {
  lead: any;
  onClose: () => void;
  onUpdateStatus: (status: LeadStatus) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: conversations = [], isLoading: loadingConvos } = useLeadConversations(lead?.id);
  const insertConvo = useInsertLeadConversation();
  const sendWA = useSendWhatsAppMessage();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isManualStage = MANUAL_STAGES.includes(lead?.status);
  const canReply = !['new', 'ai_chatting'].includes(lead?.status);

  const handleSend = async () => {
    if (!replyText.trim() || !lead) return;
    setSending(true);
    try {
      // Send WhatsApp message
      await sendWA.mutateAsync({ phone: lead.phone, message: replyText.trim(), gymId: lead.gym_id });

      // Log in conversation history
      await insertConvo.mutateAsync({
        lead_id: lead.id,
        gym_id: lead.gym_id,
        role: 'owner',
        message: replyText.trim(),
      });

      // Update owner_last_replied_at on lead
      const { createClient } = await import('@supabase/supabase-js');
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('leads').update({ owner_last_replied_at: new Date().toISOString() }).eq('id', lead.id);

      setReplyText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Failed to send', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={!!lead} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[detailStyles.container, { paddingTop: insets.top + 8 }]}>
          <View style={detailStyles.header}>
            <Pressable onPress={onClose} style={detailStyles.closeBtn}>
              <Ionicons name="chevron-down" size={22} color={Colors.text} />
            </Pressable>
            <Text style={detailStyles.headerTitle}>{lead?.name}</Text>
            <Pressable onPress={onDelete} style={detailStyles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: canReply ? 80 : 40 }}
          >
            {/* Handoff alert */}
            {lead?.status === 'handoff' && (
              <View style={detailStyles.handoffAlert}>
                <Ionicons name="alert-circle" size={18} color="#E1306C" />
                <Text style={detailStyles.handoffText}>
                  AI has handed off this lead — they're ready to speak with you. Reply below to message them directly.
                </Text>
              </View>
            )}

            {/* AI observing notice */}
            {['new', 'ai_chatting'].includes(lead?.status) && (
              <View style={{ backgroundColor: Colors.info + '15', borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.info + '30' }}>
                <Ionicons name="eye-outline" size={16} color={Colors.info} />
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, flex: 1 }}>
                  AI is handling this conversation. You can observe the chat below.
                </Text>
              </View>
            )}

            {/* Lead info card */}
            <View style={detailStyles.card}>
              <View style={detailStyles.infoRow}>
                <Ionicons name={SOURCE_ICONS[lead?.source] as any || 'person-outline'} size={15}
                  color={lead?.source === 'whatsapp' ? '#25D366' : lead?.source === 'instagram' ? '#E1306C' : Colors.textMuted} />
                <Text style={detailStyles.infoLabel}>Source</Text>
                <Text style={detailStyles.infoValue}>{lead?.source?.replace('_', ' ')}</Text>
              </View>
              <View style={detailStyles.divider} />
              <View style={detailStyles.infoRow}>
                <Ionicons name="call-outline" size={15} color={Colors.textMuted} />
                <Text style={detailStyles.infoLabel}>Phone</Text>
                <Pressable onPress={() => Linking.openURL(`tel:${lead?.phone}`)}>
                  <Text style={[detailStyles.infoValue, { color: Colors.info }]}>{lead?.phone}</Text>
                </Pressable>
              </View>
              {lead?.goal ? <>
                <View style={detailStyles.divider} />
                <View style={detailStyles.infoRow}>
                  <Ionicons name="fitness-outline" size={15} color={Colors.textMuted} />
                  <Text style={detailStyles.infoLabel}>Goal</Text>
                  <Text style={detailStyles.infoValue}>{lead?.goal}</Text>
                </View>
              </> : null}
              {lead?.notes ? <>
                <View style={detailStyles.divider} />
                <View style={detailStyles.infoRow}>
                  <Ionicons name="document-text-outline" size={15} color={Colors.textMuted} />
                  <Text style={detailStyles.infoLabel}>Notes</Text>
                  <Text style={[detailStyles.infoValue, { flex: 1 }]}>{lead?.notes}</Text>
                </View>
              </> : null}
            </View>

            {/* Stage card */}
            <View style={detailStyles.card}>
              <Text style={detailStyles.sectionTitle}>Current Stage</Text>
              <View style={[detailStyles.stagePill, { backgroundColor: STATUS_COLORS[lead?.status as LeadStatus] + '20' }]}>
                <Text style={[detailStyles.stagePillText, { color: STATUS_COLORS[lead?.status as LeadStatus] }]}>
                  {STATUS_LABELS[lead?.status as LeadStatus]}
                </Text>
              </View>
              <Text style={detailStyles.stageHint}>
                {MANUAL_STAGES.includes(lead?.status)
                  ? '👤 This stage is managed manually by you.'
                  : '🤖 This stage is managed automatically by AI.'}
              </Text>
            </View>

            {/* Manual stage movement */}
            {MANUAL_STAGES.includes(lead?.status) && (
              <View style={detailStyles.card}>
                <Text style={detailStyles.sectionTitle}>Move to Stage</Text>
                <View style={detailStyles.stageButtons}>
                  {MANUAL_STAGES.map(s => (
                    <Pressable
                      key={s}
                      style={[
                        detailStyles.stageBtn,
                        lead?.status === s && { backgroundColor: STATUS_COLORS[s] + '20', borderColor: STATUS_COLORS[s] },
                      ]}
                      onPress={() => { if (lead?.status !== s) onUpdateStatus(s); }}
                    >
                      <Text style={[detailStyles.stageBtnText, lead?.status === s && { color: STATUS_COLORS[s], fontFamily: 'Inter_600SemiBold' }]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Conversation history */}
            <View style={detailStyles.card}>
              <Text style={detailStyles.sectionTitle}>
                {canReply ? 'Conversation' : 'AI Conversation'}
              </Text>
              {loadingConvos ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
              ) : conversations.length === 0 ? (
                <Text style={detailStyles.emptyConvo}>No conversation yet.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {conversations.map((msg: any) => (
                    <View
                      key={msg.id}
                      style={[
                        detailStyles.bubble,
                        msg.role === 'ai' ? detailStyles.bubbleAI
                        : msg.role === 'owner' ? detailStyles.bubbleOwner
                        : detailStyles.bubbleLead,
                      ]}
                    >
                      <Text style={detailStyles.bubbleRole}>
                        {msg.role === 'ai' ? '🤖 AI' : msg.role === 'owner' ? '👤 You' : '💬 Lead'}
                      </Text>
                      <Text style={detailStyles.bubbleText}>{msg.message}</Text>
                      <Text style={detailStyles.bubbleTime}>
                        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

          </ScrollView>

          {/* Reply box — shown for all stages except new and ai_chatting */}
          {canReply && (
            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background }}>
              <TextInput
                style={{ flex: 1, backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, maxHeight: 100 }}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <Pressable
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: sending || !replyText.trim() ? Colors.border : Colors.primary, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleSend}
                disabled={sending || !replyText.trim()}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </Pressable>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

  return (
    <Modal visible={!!lead} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[detailStyles.container, { paddingTop: insets.top + 8 }]}>
        <View style={detailStyles.header}>
          <Pressable onPress={onClose} style={detailStyles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color={Colors.text} />
          </Pressable>
          <Text style={detailStyles.headerTitle}>{lead?.name}</Text>
          <Pressable onPress={onDelete} style={detailStyles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

          {/* Handoff alert */}
          {lead?.status === 'handoff' && (
            <View style={detailStyles.handoffAlert}>
              <Ionicons name="alert-circle" size={18} color="#E1306C" />
              <Text style={detailStyles.handoffText}>
                AI has handed off this lead — they're ready to speak with you. Take over the conversation on WhatsApp.
              </Text>
            </View>
          )}

          {/* Lead info card */}
          <View style={detailStyles.card}>
            <View style={detailStyles.infoRow}>
              <Ionicons name={SOURCE_ICONS[lead?.source] as any || 'person-outline'} size={15}
                color={lead?.source === 'whatsapp' ? '#25D366' : lead?.source === 'instagram' ? '#E1306C' : Colors.textMuted} />
              <Text style={detailStyles.infoLabel}>Source</Text>
              <Text style={detailStyles.infoValue}>{lead?.source?.replace('_', ' ')}</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.infoRow}>
              <Ionicons name="call-outline" size={15} color={Colors.textMuted} />
              <Text style={detailStyles.infoLabel}>Phone</Text>
              <Pressable onPress={() => Linking.openURL(`tel:${lead?.phone}`)}>
                <Text style={[detailStyles.infoValue, { color: Colors.info }]}>{lead?.phone}</Text>
              </Pressable>
            </View>
            {lead?.goal ? <>
              <View style={detailStyles.divider} />
              <View style={detailStyles.infoRow}>
                <Ionicons name="fitness-outline" size={15} color={Colors.textMuted} />
                <Text style={detailStyles.infoLabel}>Goal</Text>
                <Text style={detailStyles.infoValue}>{lead?.goal}</Text>
              </View>
            </> : null}
            {lead?.notes ? <>
              <View style={detailStyles.divider} />
              <View style={detailStyles.infoRow}>
                <Ionicons name="document-text-outline" size={15} color={Colors.textMuted} />
                <Text style={detailStyles.infoLabel}>Notes</Text>
                <Text style={[detailStyles.infoValue, { flex: 1 }]}>{lead?.notes}</Text>
              </View>
            </> : null}
          </View>

          {/* Stage card */}
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Current Stage</Text>
            <View style={[detailStyles.stagePill, { backgroundColor: STATUS_COLORS[lead?.status as LeadStatus] + '20' }]}>
              <Text style={[detailStyles.stagePillText, { color: STATUS_COLORS[lead?.status as LeadStatus] }]}>
                {STATUS_LABELS[lead?.status as LeadStatus]}
              </Text>
            </View>
            <Text style={detailStyles.stageHint}>
              {MANUAL_STAGES.includes(lead?.status)
                ? '👤 This stage is managed manually by you.'
                : '🤖 This stage is managed automatically by AI.'}
            </Text>
          </View>

          {/* Manual stage movement — only from handoff onwards */}
          {MANUAL_STAGES.includes(lead?.status) && (
            <View style={detailStyles.card}>
              <Text style={detailStyles.sectionTitle}>Move to Stage</Text>
              <View style={detailStyles.stageButtons}>
                {MANUAL_STAGES.map(s => (
                  <Pressable
                    key={s}
                    style={[
                      detailStyles.stageBtn,
                      lead?.status === s && { backgroundColor: STATUS_COLORS[s] + '20', borderColor: STATUS_COLORS[s] },
                    ]}
                    onPress={() => { if (lead?.status !== s) onUpdateStatus(s); }}
                  >
                    <Text style={[detailStyles.stageBtnText, lead?.status === s && { color: STATUS_COLORS[s], fontFamily: 'Inter_600SemiBold' }]}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* AI Conversation history */}
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>AI Conversation</Text>
            {loadingConvos ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
            ) : conversations.length === 0 ? (
              <Text style={detailStyles.emptyConvo}>No AI conversation yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {conversations.map((msg: any) => (
                  <View
                    key={msg.id}
                    style={[
                      detailStyles.bubble,
                      msg.role === 'ai' ? detailStyles.bubbleAI : detailStyles.bubbleLead,
                    ]}
                  >
                    <Text style={detailStyles.bubbleRole}>{msg.role === 'ai' ? '🤖 AI' : '👤 Lead'}</Text>
                    <Text style={detailStyles.bubbleText}>{msg.message}</Text>
                    <Text style={detailStyles.bubbleTime}>
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* WhatsApp CTA */}
          <Pressable
            style={detailStyles.waBtn}
            onPress={() => Linking.openURL(`https://wa.me/${lead?.phone?.replace(/[^0-9]/g, '')}`)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={detailStyles.waBtnText}>Open WhatsApp Chat</Text>
          </Pressable>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
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

  const leadsEnabled = enabledModules?.has('WhatsApp lead management') ?? true;
  const waLeadsEnabled = enabledModules?.has('WhatsApp lead management') ?? false;
  const igLeadsEnabled = enabledModules?.has('instagram leads') ?? false;
  const hasAnyLeads = leadsEnabled || waLeadsEnabled || igLeadsEnabled;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
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

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { counts[s] = leads.filter((l: any) => l.status === s).length; });
    return counts;
  }, [leads]);

  const handoffCount = pipelineCounts['handoff'] || 0;

  const handleUpdateStatus = (status: LeadStatus) => {
    if (!selectedLead) return;
    updateLead.mutate({ id: selectedLead.id, status }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedLead((l: any) => ({ ...l, status }));
        insertActivity.mutate({
          gym_id: user?.gym_id || null,
          actor_name: user?.name || 'Owner',
          action: 'Lead stage updated',
          details: `${selectedLead.name} → ${STATUS_LABELS[status]}`,
        });
      },
    });
  };

  const handleAdd = () => {
    setFormError('');
    if (!form.name || !form.phone) { setFormError('Name and phone are required'); return; }

    // Duplicate check: reject if phone already exists as a lead in this gym
    const normalizedPhone = form.phone.replace(/\s+/g, '').replace(/^\+91/, '');
    const duplicate = leads.find((l: any) => {
      const lPhone = (l.phone || '').replace(/\s+/g, '').replace(/^\+91/, '');
      return lPhone === normalizedPhone;
    });
    if (duplicate) {
      setFormError('A lead with this phone number already exists in your pipeline.');
      return;
    }

    insertLead.mutate({
      name: form.name, phone: form.phone,
      source: form.source, goal: form.goal,
      notes: form.notes,
      gym_id: user?.gym_id || null,
      status: 'new',
    }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
        setForm({ name: '', phone: '', source: 'manual', goal: '', notes: '' });
        insertActivity.mutate({
          gym_id: user?.gym_id || null,
          actor_name: user?.name || 'Owner',
          action: 'Added new lead',
          details: form.name,
        });
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
          <Text style={styles.noModuleSub}>Ask your platform admin to enable the Leads Management module.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Lead Pipeline"
        subtitle={`${leads.length} leads${handoffCount > 0 ? ` · ${handoffCount} need attention` : ''}`}
        rightAction={{
          icon: <Ionicons name="add" size={20} color={Colors.primary} />,
          onPress: () => { Haptics.selectionAsync(); setShowAdd(true); },
        }}
      />

      {/* Handoff alert banner */}
      {handoffCount > 0 && (
        <Pressable
          style={styles.handoffBanner}
          onPress={() => setFilter(filter === 'handoff' ? 'all' : 'handoff')}
        >
          <Ionicons name="alert-circle" size={16} color="#E1306C" />
          <Text style={styles.handoffBannerText}>
            {handoffCount} lead{handoffCount > 1 ? 's' : ''} ready for your attention — tap to view
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#E1306C" />
        </Pressable>
      )}

      {/* Auto-capture bar */}
      {(waLeadsEnabled || igLeadsEnabled) && (
        <View style={styles.autoBar}>
          <Ionicons name="flash" size={13} color={Colors.warning} />
          <Text style={styles.autoBarText}>
            Auto-capture active: {[waLeadsEnabled && 'WhatsApp', igLeadsEnabled && 'Instagram'].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}

      {/* Pipeline filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pipelineRow} contentContainerStyle={styles.pipelineContent}>
        {STATUS_ORDER.map(s => (
          <Pressable
            key={s}
            style={[styles.pipelineChip, filter === s && { borderColor: STATUS_COLORS[s] }]}
            onPress={() => { setFilter(filter === s ? 'all' : s); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.pipelineCount, { color: STATUS_COLORS[s] }]}>{pipelineCounts[s] || 0}</Text>
            <Text style={styles.pipelineLabel}>{STATUS_LABELS[s]}</Text>
            {s === 'handoff' && pipelineCounts['handoff'] > 0 && <View style={styles.handoffDot} />}
          </Pressable>
        ))}
      </ScrollView>

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
        {filter !== 'all' && (
          <Pressable style={styles.clearFilter} onPress={() => setFilter('all')}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </Pressable>
        )}
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
            <Pressable
              style={[styles.leadCard, item.status === 'handoff' && styles.leadCardHandoff]}
              onPress={() => setSelectedLead(item)}
            >
              <View style={styles.leadTop}>
                <View style={[styles.leadAvatar, { backgroundColor: STATUS_COLORS[item.status as LeadStatus] + '20' }]}>
                  <Text style={[styles.leadAvatarText, { color: STATUS_COLORS[item.status as LeadStatus] }]}>
                    {item.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  <View style={styles.leadMeta}>
                    <Ionicons
                      name={SOURCE_ICONS[item.source] as any || 'ellipse-outline'} size={13}
                      color={item.source === 'whatsapp' ? '#25D366' : item.source === 'instagram' ? '#E1306C' : Colors.textMuted}
                    />
                    <Text style={styles.leadPhone}>{item.phone}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status as LeadStatus] + '20', borderColor: STATUS_COLORS[item.status as LeadStatus] + '50' }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status as LeadStatus] }]}>
                    {STATUS_LABELS[item.status as LeadStatus]}
                  </Text>
                </View>
              </View>

              {item.goal ? <Text style={styles.leadGoal}>🎯 {item.goal}</Text> : null}

              <View style={styles.leadFooter}>
                <Text style={styles.leadTime}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
                {item.status === 'handoff' && (
                  <View style={styles.handoffTag}>
                    <Ionicons name="alert-circle" size={12} color="#E1306C" />
                    <Text style={styles.handoffTagText}>Needs attention</Text>
                  </View>
                )}
                {MANUAL_STAGES.includes(item.status) && item.status !== 'handoff' && (
                  <View style={styles.manualTag}>
                    <Ionicons name="hand-left-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.manualTagText}>Manual</Text>
                  </View>
                )}
                {!MANUAL_STAGES.includes(item.status) && (
                  <View style={styles.aiTag}>
                    <Ionicons name="flash" size={12} color={Colors.info} />
                    <Text style={styles.aiTagText}>AI</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Lead detail */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={() => { setPendingDelete(selectedLead); setSelectedLead(null); }}
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
              { key: 'goal', label: 'Goal', placeholder: 'Weight loss, muscle gain...', keyboard: 'default' },
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
            <View style={styles.infoBox}>
              <Ionicons name="flash-outline" size={14} color={Colors.info} />
              <Text style={styles.infoBoxText}>Manually added leads start at "New". WhatsApp/Instagram leads are auto-captured and AI-managed through the pipeline.</Text>
            </View>
            {!!formError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}
            <Pressable style={[styles.submitBtn, insertLead.isPending && { opacity: 0.6 }]} onPress={handleAdd} disabled={insertLead.isPending}>
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
  handoffBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, backgroundColor: '#E1306C' + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E1306C' + '30' },
  handoffBannerText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#E1306C', flex: 1 },
  autoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.warning + '15', borderRadius: 10, padding: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.warning + '30' },
  autoBarText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.warning },
  pipelineRow: { flexGrow: 0, marginTop: 10 },
  pipelineContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  pipelineChip: { alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, minWidth: 70, position: 'relative' },
  pipelineCount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  pipelineLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  handoffDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#E1306C' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 4, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, height: 42 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  clearFilter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.primaryMuted },
  clearFilterText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary },
  leadCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  leadCardHandoff: { borderColor: '#E1306C50', backgroundColor: '#E1306C08' },
  leadTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leadAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  leadAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  leadName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  leadPhone: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  leadGoal: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  leadFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  leadTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, flex: 1 },
  handoffTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E1306C15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  handoffTagText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#E1306C' },
  manualTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  manualTagText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.info + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  aiTagText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.info },
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
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12, backgroundColor: Colors.info + '10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.info + '30' },
  infoBoxText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.info, flex: 1, lineHeight: 17 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: Colors.dangerMuted, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  submitBtn: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
});

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, flex: 1 },
  deleteBtn: { padding: 4 },
  handoffAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E1306C15', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E1306C40' },
  handoffText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#E1306C', flex: 1, lineHeight: 18 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted, width: 60 },
  infoValue: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  stagePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 6 },
  stagePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  stageHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  stageButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  stageBtnText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  emptyConvo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '85%', gap: 4 },
  bubbleAI: { backgroundColor: Colors.info + '15', alignSelf: 'flex-start' },
  bubbleLead: { backgroundColor: Colors.primaryMuted, alignSelf: 'flex-end' },
  bubbleOwner: { backgroundColor: '#25D36620', alignSelf: 'flex-end', borderWidth: 1, borderColor: '#25D36640' },
  bubbleRole: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.textMuted },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, lineHeight: 18 },
  bubbleTime: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', borderRadius: 12, height: 48 },
  waBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});
