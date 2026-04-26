import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TextInput, RefreshControl, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useActivityLog, useGyms } from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const ACTION_TYPES = ['All', 'Added', 'Created', 'Updated', 'Deleted', 'Removed', 'Suspended', 'Reactivated', 'Login'];

function isInRange(dateStr: string, range: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (range) {
    case 'today':
      return d >= startOfDay(now);
    case 'yesterday': {
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      return d >= startOfDay(yest) && d < startOfDay(now);
    }
    case 'week': {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    case 'month': {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    default: return true;
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const actionColors: Record<string, string> = {
  Added: Colors.primary, Created: Colors.primary,
  Removed: Colors.danger, Deleted: Colors.danger,
  Updated: Colors.info, Suspended: Colors.warning,
  Reactivated: Colors.primary, Login: Colors.purple,
};

function getActionColor(action: string) {
  const key = Object.keys(actionColors).find(k => action.startsWith(k));
  return key ? actionColors[key] : Colors.textMuted;
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const gymId = user?.role === 'super_admin' ? null : user?.gym_id;
  const { data: activity = [], isLoading, refetch, isRefetching } = useActivityLog(gymId);
  const { data: gyms = [] } = useGyms();

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('All');
  const [gymFilter, setGymFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return activity.filter((a: any) => {
      const matchSearch = !search || (
        a.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.action?.toLowerCase().includes(search.toLowerCase()) ||
        a.details?.toLowerCase().includes(search.toLowerCase())
      );
      const matchDate = isInRange(a.created_at, dateFilter);
      const matchAction = actionFilter === 'All' || a.action?.startsWith(actionFilter);
      const matchGym = gymFilter === 'all' || a.gym_id === gymFilter;
      return matchSearch && matchDate && matchAction && matchGym;
    });
  }, [activity, search, dateFilter, actionFilter, gymFilter]);

  const activeFilters = [dateFilter !== 'all', actionFilter !== 'All', gymFilter !== 'all'].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Activity Log"
        subtitle={`${filtered.length} of ${activity.length} events`}
        rightAction={{
          icon: (
            <View>
              <Ionicons name="filter-outline" size={20} color={activeFilters > 0 ? Colors.primary : Colors.text} />
              {activeFilters > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilters}</Text>
                </View>
              )}
            </View>
          ),
          onPress: () => setShowFilters(s => !s),
        }}
      />

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search activity..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Date filter */}
          <Text style={styles.filterSectionLabel}>Date Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DATE_FILTERS.map(f => (
                <Pressable
                  key={f.value}
                  style={[styles.chip, dateFilter === f.value && styles.chipActive]}
                  onPress={() => { setDateFilter(f.value); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, dateFilter === f.value && styles.chipTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Action type filter */}
          <Text style={styles.filterSectionLabel}>Action Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ACTION_TYPES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.chip, actionFilter === t && styles.chipActive]}
                  onPress={() => { setActionFilter(t); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, actionFilter === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Gym filter (admin only) */}
          {user?.role === 'super_admin' && gyms.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Gym</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[styles.chip, gymFilter === 'all' && styles.chipActive]}
                    onPress={() => setGymFilter('all')}
                  >
                    <Text style={[styles.chipText, gymFilter === 'all' && styles.chipTextActive]}>All Gyms</Text>
                  </Pressable>
                  {gyms.map((g: any) => (
                    <Pressable
                      key={g.id}
                      style={[styles.chip, gymFilter === g.id && styles.chipActive]}
                      onPress={() => setGymFilter(g.id)}
                    >
                      <Text style={[styles.chipText, gymFilter === g.id && styles.chipTextActive]}>{g.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {activeFilters > 0 && (
            <Pressable
              style={styles.clearBtn}
              onPress={() => { setDateFilter('all'); setActionFilter('All'); setGymFilter('all'); }}
            >
              <Text style={styles.clearBtnText}>Clear All Filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pulse-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{search || activeFilters > 0 ? 'No results' : 'No activity yet'}</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <View style={[styles.dot, { backgroundColor: getActionColor(item.action) }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.actor}>{item.actor_name || 'System'}</Text>
                  <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={[styles.action, { color: getActionColor(item.action) }]}>{item.action}</Text>
                {item.details && <Text style={styles.details}>{item.details}</Text>}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#000' },
  filterPanel: {
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  filterSectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: '#000' },
  clearBtn: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.dangerMuted, borderWidth: 1, borderColor: Colors.danger + '40' },
  clearBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.danger },
  list: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  cardContent: { flex: 1, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actor: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  date: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  action: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  details: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
});
