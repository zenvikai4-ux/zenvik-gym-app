import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  useClientProfiles, useDietPlans, useUpsertDietPlan,
  useDeleteDietPlan, useInsertClientProfile,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_SLOTS = [
  { key: 'Breakfast', icon: 'sunny-outline', time: '7–8 AM' },
  { key: 'Mid-morning', icon: 'cafe-outline', time: '10–11 AM' },
  { key: 'Lunch', icon: 'restaurant-outline', time: '1–2 PM' },
  { key: 'Evening', icon: 'beer-outline', time: '4–5 PM' },
  { key: 'Dinner', icon: 'moon-outline', time: '7–8 PM' },
];

export default function DietScreen() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const { data: profiles = [], isLoading, refetch } = useClientProfiles(
    user?.gym_id,  // always pass gym_id for isolation
    user?.role === 'trainer' ? user?.id : null,
  );
  const insertClientProfile = useInsertClientProfile();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [realProfileId, setRealProfileId] = useState<string | null>(null);
  const [gettingProfile, setGettingProfile] = useState(false);

  const selectedProfile = selectedMemberId
    ? profiles.find((p: any) => p.member_id === selectedMemberId || p.member?.id === selectedMemberId)
    : profiles[0];

  // When a client is selected, ensure they have a client_profile
  const ensureClientProfile = async (memberId: string, existingProfileId?: string) => {
    // If profile id is real (not our fake member_ prefix), use it
    if (existingProfileId && !existingProfileId.startsWith('member_')) {
      setRealProfileId(existingProfileId);
      return;
    }
    setGettingProfile(true);
    // Check if profile exists
    const { data: existing } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (existing) {
      setRealProfileId(existing.id);
    } else {
      // Create one automatically
      insertClientProfile.mutate({
        member_id: memberId,
        trainer_id: user?.id,
        gym_id: user?.gym_id ?? undefined,
        session_time: 'morning',
      }, {
        onSuccess: (newProfile: any) => {
          setRealProfileId(newProfile.id);
          refetch();
        },
      });
    }
    setGettingProfile(false);
  };

  useEffect(() => {
    if (selectedProfile) {
      const memberId = selectedProfile.member_id || selectedProfile.member?.id;
      if (memberId) ensureClientProfile(memberId, selectedProfile.id);
    }
  }, [selectedProfile?.id, selectedProfile?.member_id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Diet Plans" />
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Diet Plans" />
        <View style={styles.empty}>
          <Ionicons name="nutrition-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No clients assigned</Text>
          <Text style={styles.emptySub}>Ask your gym owner to assign members to you</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Diet Plans"
        subtitle={`${profiles.length} client${profiles.length !== 1 ? 's' : ''}`}
      />

      {/* Client selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
      >
        {profiles.map((p: any) => {
          const memberId = p.member_id || p.member?.id;
          const name = p.member?.name || p.name || 'Client';
          const isSelected = selectedMemberId
            ? selectedMemberId === memberId
            : p === profiles[0];
          return (
            <Pressable
              key={memberId}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => {
                setSelectedMemberId(memberId);
                setRealProfileId(null);
                Haptics.selectionAsync();
              }}
            >
              <View style={[styles.chipAvatar, isSelected && styles.chipAvatarActive]}>
                <Text style={styles.chipAvatarText}>{(name || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {gettingProfile || insertClientProfile.isPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 10 }}>
            Setting up diet plan...
          </Text>
        </View>
      ) : realProfileId ? (
        <DietPlanSection profileId={realProfileId} tabBarHeight={tabBarHeight} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

function DietPlanSection({ profileId, tabBarHeight }: { profileId: string; tabBarHeight: number }) {
  const { data: plans = [] } = useDietPlans(profileId);
  const [activeDay, setActiveDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const upsertPlan = useUpsertDietPlan();
  const deletePlan = useDeleteDietPlan();
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const dayPlans = plans.filter((p: any) => p.day_of_week === activeDay);
  const getPlanForSlot = (slot: string) => dayPlans.find((p: any) => p.meal_slot === slot);

  const handleSaveSlot = (slot: string) => {
    if (!editText.trim()) return;
    upsertPlan.mutate(
      { client_profile_id: profileId, day_of_week: activeDay, meal_slot: slot, items: editText.trim() },
      { onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setEditingSlot(null); } }
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.dietContent, { paddingBottom: tabBarHeight + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow} contentContainerStyle={styles.dayContent}>
        {DAY_NAMES.map((day, i) => (
          <Pressable
            key={day}
            style={[styles.dayBtn, activeDay === i && styles.dayBtnActive]}
            onPress={() => { setActiveDay(i); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.dayBtnText, activeDay === i && styles.dayBtnTextActive]}>{day}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {MEAL_SLOTS.map(slot => {
        const plan = getPlanForSlot(slot.key);
        const isEditing = editingSlot === slot.key;
        return (
          <View key={slot.key} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name={slot.icon as any} size={16} color={Colors.primary} />
                <Text style={styles.mealTitle}>{slot.key}</Text>
                <Text style={styles.mealTime}>{slot.time}</Text>
              </View>
              <View style={styles.mealActions}>
                {plan && (
                  <Pressable onPress={() => deletePlan.mutate(plan.id, {
                    onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
                  })}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                )}
                <Pressable onPress={() => {
                  setEditingSlot(isEditing ? null : slot.key);
                  setEditText(plan?.items || '');
                }}>
                  <Ionicons
                    name={isEditing ? 'close-outline' : plan ? 'pencil-outline' : 'add-circle-outline'}
                    size={18}
                    color={Colors.primary}
                  />
                </Pressable>
              </View>
            </View>
            {isEditing ? (
              <View style={styles.mealEdit}>
                <TextInput
                  style={styles.mealInput}
                  value={editText}
                  onChangeText={setEditText}
                  placeholder="e.g. Oats, banana, black coffee"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <Pressable style={styles.mealSaveBtn} onPress={() => handleSaveSlot(slot.key)} disabled={upsertPlan.isPending}>
                  {upsertPlan.isPending
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={styles.mealSaveBtnText}>Save</Text>
                  }
                </Pressable>
              </View>
            ) : plan ? (
              <Text style={styles.mealItems}>{plan.items}</Text>
            ) : (
              <Text style={styles.mealEmpty}>No meal planned — tap + to add</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  chipRow: { flexGrow: 0, marginTop: 12 },
  chipContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  chipAvatarActive: { backgroundColor: Colors.primary },
  chipAvatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.text },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  dietContent: { padding: 16, gap: 10 },
  dayRow: { flexGrow: 0, marginBottom: 4 },
  dayContent: { gap: 8, paddingBottom: 4 },
  dayBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  dayBtnActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  dayBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  dayBtnTextActive: { color: Colors.primary },
  mealCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  mealTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  mealActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealItems: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  mealEmpty: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  mealEdit: { gap: 8 },
  mealInput: { backgroundColor: Colors.secondary, borderRadius: 8, padding: 10, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, minHeight: 60 },
  mealSaveBtn: { height: 36, backgroundColor: Colors.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealSaveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#000' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
