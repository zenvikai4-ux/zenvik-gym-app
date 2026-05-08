import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Modal, ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useQueries, useUpdateQuery } from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

const STATUS_COLORS: Record<string, string> = {
  open: Colors.warning,
  resolved: Colors.primary,
  closed: Colors.textMuted,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function QueryLogScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const isAdmin = user?.role === 'super_admin';
  const { data: queries = [], isLoading, refetch, isRefetching } = useQueries(user?.gym_id, isAdmin);
  const updateQuery = useUpdateQuery();
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');

  const filtered = filterStatus === 'all' ? queries : queries.filter((q: any) => q.status === filterStatus);

  const handleResolve = (query: any) => {
    updateQuery.mutate({ id: query.id, status: 'resolved' }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelected(null);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Query Log" />
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Query Log" subtitle={`${queries.length} total queries`} />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'open', 'resolved'] as const).map(s => (
          <Pressable
            key={s}
            style={[styles.chip, filterStatus === s && styles.chipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="help-circle-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No queries</Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <Pressable style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardTop}>
              <View style={styles.senderInfo}>
                <Text style={styles.senderName}>{item.sender_name}</Text>
                <Text style={styles.senderRole}>{item.sender_role}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || Colors.info) + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || Colors.info }]}>
                  {item.status || 'open'}
                </Text>
              </View>
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </Pressable>
        )}
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Query Details</Text>
              <Pressable onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>From</Text>
                  <Text style={styles.detailValue}>{selected.sender_name} ({selected.sender_role})</Text>
                </View>
                {selected.recipient && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To</Text>
                    <Text style={styles.detailValue}>{selected.recipient}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selected.created_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: STATUS_COLORS[selected.status] || Colors.warning }]}>
                    {selected.status || 'open'}
                  </Text>
                </View>
                <View style={[styles.detailRow, { flexDirection: 'column', gap: 6 }]}>
                  <Text style={styles.detailLabel}>Message</Text>
                  <Text style={[styles.detailValue, { fontSize: 15, lineHeight: 22 }]}>{selected.message}</Text>
                </View>

                {isAdmin && selected.status !== 'resolved' && (
                  <Pressable
                    style={styles.resolveBtn}
                    onPress={() => handleResolve(selected)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
                    <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: '#000' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  senderInfo: { flex: 1 },
  senderName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  senderRole: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted },
  detailValue: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1, textAlign: 'right' },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, marginTop: 20,
  },
  resolveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#000' },
});
