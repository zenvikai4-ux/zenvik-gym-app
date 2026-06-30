import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  useClientProfiles, useDietPlans, useUpsertDietPlan,
  useDeleteDietPlan, useInsertClientProfile, useWeightHistory, useInsertWeightHistory,
  usePropagateDietEdit, useLinkDietDays, useUnlinkDietDay, useDietLinkGroups,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', time: '7–8 AM' },
  { key: 'mid-morning', label: 'Mid-morning', icon: 'cafe-outline', time: '10–11 AM' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline', time: '1–2 PM' },
  { key: 'evening', label: 'Evening', icon: 'beer-outline', time: '4–5 PM' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline', time: '7–8 PM' },
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
    try {
      // Check if profile exists
      const { data: existing, error: fetchError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('member_id', memberId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setRealProfileId(existing.id);
        setGettingProfile(false);
      } else {
        // Create one automatically — wait for mutation to complete before clearing spinner
        insertClientProfile.mutate({
          member_id: memberId,
          trainer_id: user?.id,
          gym_id: user?.gym_id ?? undefined,
          session_time: 'morning',
        }, {
          onSuccess: (newProfile: any) => {
            setRealProfileId(newProfile.id);
            refetch();
            setGettingProfile(false);
          },
          onError: (err: any) => {
            console.error('Failed to create client profile:', err);
            Alert.alert('Error', 'Could not set up diet profile. Please try again.');
            setGettingProfile(false);
          },
        });
      }
    } catch (err: any) {
      console.error('ensureClientProfile error:', err);
      Alert.alert('Error', 'Could not load client profile. Please try again.');
      setGettingProfile(false);
    }
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
        <DietPlanSection profileId={realProfileId} gymId={user?.gym_id || ''} tabBarHeight={tabBarHeight} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

function DietPlanSection({ profileId, gymId, tabBarHeight }: { profileId: string; gymId: string; tabBarHeight: number }) {
  const { data: plans = [] } = useDietPlans(profileId);
  const { data: weightHistory = [] } = useWeightHistory(profileId);
  const insertWeight = useInsertWeightHistory();
  const [activeDay, setActiveDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const upsertPlan = useUpsertDietPlan();
  const propagateEdit = usePropagateDietEdit();
  const deletePlan = useDeleteDietPlan();
  const linkDays = useLinkDietDays();
  const unlinkDay = useUnlinkDietDay();
  const { data: linkGroups = {} } = useDietLinkGroups(profileId);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copying, setCopying] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [applyMode, setApplyMode] = useState(false);
  const [applyDays, setApplyDays] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [linking, setLinking] = useState(false);
  // When saving an edit on a linked day, this holds the pending save until
  // the user confirms Continue / Unlink / Cancel.
  const [pendingLinkedSave, setPendingLinkedSave] = useState<{ slot: string; items: string } | null>(null);
  const [showUnlinkPicker, setShowUnlinkPicker] = useState(false);

  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const firstWeight = weightHistory.length > 0 ? weightHistory[0] : null;
  const weightChange = latestWeight && firstWeight && latestWeight.id !== firstWeight.id
    ? (latestWeight.weight_kg - firstWeight.weight_kg).toFixed(1)
    : null;

  const dayPlans = plans.filter((p: any) => p.day_of_week === activeDay);
  const getPlanForSlot = (slot: string) => dayPlans.find((p: any) => p.meal_slot === slot);

  const linkedDayNames = (day: number): string[] => {
    const group = linkGroups[day];
    if (!group) return [];
    return Object.keys(linkGroups)
      .map(Number)
      .filter(d => d !== day && linkGroups[d] === group)
      .map(d => DAY_NAMES[d]);
  };

  const doSaveSlot = (slot: string, items: string) => {
    propagateEdit.mutate(
      { client_profile_id: profileId, gym_id: gymId, day_of_week: activeDay, meal_slot: slot, items },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditingSlot(null);
          setPendingLinkedSave(null);
          setShowUnlinkPicker(false);
        },
        onError: (err: any) => {
          console.error('Save diet plan error:', err);
          Alert.alert('Save Failed', err?.message || 'Could not save the meal. Please try again.');
        },
      }
    );
  };

  const handleSaveSlot = (slot: string) => {
    if (!editText.trim()) return;
    const linked = linkedDayNames(activeDay);
    if (linked.length > 0) {
      // This day is linked to others — confirm before propagating the edit.
      setPendingLinkedSave({ slot, items: editText.trim() });
      return;
    }
    doSaveSlot(slot, editText.trim());
  };

  const handleConfirmLinkedSave = () => {
    if (!pendingLinkedSave) return;
    doSaveSlot(pendingLinkedSave.slot, pendingLinkedSave.items);
  };

  const handleUnlinkThenSave = async (daysToUnlink: number[]) => {
    if (!pendingLinkedSave) return;
    try {
      for (const day of daysToUnlink) {
        await unlinkDay.mutateAsync({ client_profile_id: profileId, day_of_week: day });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Stay on the unlink picker — linkGroups refetches after unlinking,
      // so linkedDayNames(activeDay) recalculates automatically and the
      // picker re-renders showing whichever days are still linked (or none),
      // with the "save to remaining" / "save just to this day" button below.
    } catch (e: any) {
      Alert.alert('Unlink failed', e.message);
    }
  };

  const handleCancelLinkedSave = () => {
    setPendingLinkedSave(null);
    setShowUnlinkPicker(false);
  };

  const handleCopyFromPrevDay = async () => {
    const prevDay = activeDay === 0 ? 6 : activeDay - 1;
    const prevPlans = plans.filter((p: any) => p.day_of_week === prevDay);
    if (!prevPlans.length) {
      Alert.alert('Nothing to copy', `No meals found for ${DAY_NAMES[prevDay]}.`);
      return;
    }
    setCopying(true);
    try {
      for (const p of prevPlans) {
        await upsertPlan.mutateAsync({ client_profile_id: profileId, gym_id: gymId, day_of_week: activeDay, meal_slot: p.meal_slot, items: p.items });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Copy failed', e.message);
    } finally {
      setCopying(false);
    }
  };

  const toggleApplyDay = (dayIdx: number) => {
    setApplyDays(prev => prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]);
  };

  // One-time copy of the current day's meals to the whole week — these days
  // do NOT stay linked afterward, each becomes its own independent plan.
  const applyCurrentDayToWholeWeek = async () => {
    if (!dayPlans.length) {
      Alert.alert('Nothing to apply', `${DAY_NAMES[activeDay]} has no meals set yet. Add meals first, then apply them to other days.`);
      return;
    }
    const days = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== activeDay);
    setApplying(true);
    try {
      for (const day of days) {
        for (const p of dayPlans) {
          await upsertPlan.mutateAsync({ client_profile_id: profileId, gym_id: gymId, day_of_week: day, meal_slot: p.meal_slot, items: p.items });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Applied', `${DAY_NAMES[activeDay]}'s meals were copied to all 7 days. Each day is independent — editing one won't affect the others.`);
      setApplyMode(false);
      setApplyDays([]);
    } catch (e: any) {
      Alert.alert('Apply failed', e.message);
    } finally {
      setApplying(false);
    }
  };

  const handleApplyToWholeWeek = applyCurrentDayToWholeWeek;

  // Link the current day with the selected days — they stay linked going
  // forward: editing a meal on any one of them will prompt to update all.
  const handleLinkSelectedDays = async () => {
    if (!dayPlans.length) {
      Alert.alert('Add meals first', `${DAY_NAMES[activeDay]} has no meals set yet. Add at least one meal before linking it with other days.`);
      return;
    }
    if (!applyDays.length) {
      Alert.alert('Select days', 'Choose at least one day to link with the current one.');
      return;
    }
    setLinking(true);
    try {
      await linkDays.mutateAsync({
        client_profile_id: profileId,
        gym_id: gymId,
        sourceDay: activeDay,
        days: applyDays,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Linked', `${DAY_NAMES[activeDay]} is now linked with ${applyDays.map(d => DAY_NAMES[d]).join(', ')}. Editing any of these days will offer to update the others too.`);
      setApplyMode(false);
      setApplyDays([]);
    } catch (e: any) {
      Alert.alert('Link failed', e.message);
    } finally {
      setLinking(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.dietContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Weight History Card */}
        <View style={styles.mealCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="scale-outline" size={16} color={Colors.primary} />
              <Text style={styles.mealTitle}>Weight Tracking</Text>
            </View>
            <Pressable
              onPress={() => setShowAddWeight(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
            >
              <Ionicons name={showAddWeight ? 'close-outline' : 'add-outline'} size={14} color={Colors.primary} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.primary }}>{showAddWeight ? 'Cancel' : 'Add Weight'}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Current</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text }}>{latestWeight ? `${latestWeight.weight_kg}kg` : '—'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Change</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: weightChange === null ? Colors.textMuted : Number(weightChange) < 0 ? Colors.primary : Colors.danger }}>
                {weightChange !== null ? `${Number(weightChange) > 0 ? '+' : ''}${weightChange}kg` : '—'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted }}>Entries</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text }}>{weightHistory.length}</Text>
            </View>
          </View>
          {showAddWeight && (
            <View style={{ gap: 8 }}>
              <TextInput style={styles.mealInput} placeholder="Weight in kg (e.g. 72.5)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" value={weightInput} onChangeText={setWeightInput} />
              <TextInput style={styles.mealInput} placeholder="Notes (optional)" placeholderTextColor={Colors.textMuted} value={weightNotes} onChangeText={setWeightNotes} />
              <Pressable style={styles.mealSaveBtn} disabled={insertWeight.isPending}
                onPress={() => {
                  const kg = parseFloat(weightInput);
                  if (!kg || isNaN(kg)) { Alert.alert('Invalid', 'Enter a valid weight'); return; }
                  insertWeight.mutate({ client_profile_id: profileId, weight_kg: kg, notes: weightNotes.trim() || undefined }, {
                    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setWeightInput(''); setWeightNotes(''); setShowAddWeight(false); },
                  });
                }}>
                {insertWeight.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.mealSaveBtnText}>Save Weight</Text>}
              </Pressable>
            </View>
          )}
          {weightHistory.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[...weightHistory].reverse().slice(0, 8).map((w: any) => (
                  <View key={w.id} style={{ backgroundColor: Colors.card, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, minWidth: 58 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text }}>{w.weight_kg}kg</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted }}>{new Date(w.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Day selector + copy from previous day + apply to week */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.dayRow, { flex: 1 }]} contentContainerStyle={styles.dayContent}>
            {DAY_NAMES.map((day, i) => {
              const isLinked = !!linkGroups[i];
              return (
                <Pressable
                  key={day}
                  style={[styles.dayBtn, activeDay === i && styles.dayBtnActive]}
                  onPress={() => { setActiveDay(i); Haptics.selectionAsync(); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isLinked && <Ionicons name="link" size={11} color={activeDay === i ? Colors.primary : Colors.textMuted} />}
                    <Text style={[styles.dayBtnText, activeDay === i && styles.dayBtnTextActive]}>{day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
            onPress={handleCopyFromPrevDay}
            disabled={copying}
          >
            {copying
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Ionicons name="copy-outline" size={14} color={Colors.primary} />}
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.primary }}>Copy prev</Text>
          </Pressable>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: applyMode ? Colors.primaryMuted : Colors.card, borderWidth: 1, borderColor: applyMode ? Colors.primary : Colors.border, marginRight: 4 }}
            onPress={() => { setApplyMode(v => !v); setApplyDays([]); Haptics.selectionAsync(); }}
          >
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.primary }}>Apply to days</Text>
          </Pressable>
        </View>

        {linkGroups[activeDay] && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryMuted, borderRadius: 8, padding: 8 }}>
            <Ionicons name="link" size={13} color={Colors.primary} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.primary, flex: 1 }}>
              {DAY_NAMES[activeDay]} follows the same diet as: {linkedDayNames(activeDay).join(', ')}. Edits here update those days too.
            </Text>
          </View>
        )}

        {applyMode && (
          <View style={{ backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 10 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary }}>
              Copy {DAY_NAMES[activeDay]}'s meals to:
            </Text>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 8, backgroundColor: Colors.primary }}
              onPress={handleApplyToWholeWeek}
              disabled={applying}
            >
              {applying ? <ActivityIndicator color="#000" size="small" /> : (
                <>
                  <Ionicons name="repeat-outline" size={15} color="#000" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#000' }}>Apply to whole week (one-time copy)</Text>
                </>
              )}
            </Pressable>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
              Or link specific days to always follow {DAY_NAMES[activeDay]}'s diet — future edits to any linked day update all of them:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {DAY_NAMES.map((day, i) => {
                if (i === activeDay) return null;
                const selected = applyDays.includes(i);
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayBtn, selected && styles.dayBtnActive]}
                    onPress={() => toggleApplyDay(i)}
                  >
                    <Text style={[styles.dayBtnText, selected && styles.dayBtnTextActive]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 8, backgroundColor: applyDays.length ? Colors.secondary : Colors.border, opacity: applyDays.length ? 1 : 0.5 }}
              onPress={handleLinkSelectedDays}
              disabled={linking || !applyDays.length}
            >
              {linking ? <ActivityIndicator color={Colors.text} size="small" /> : (
                <>
                  <Ionicons name="link" size={14} color={Colors.text} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text }}>
                    Link {applyDays.length ? `${applyDays.length} selected day${applyDays.length !== 1 ? 's' : ''}` : 'selected days'} to {DAY_NAMES[activeDay]}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

      {MEAL_SLOTS.map(slot => {
        const plan = getPlanForSlot(slot.key);
        const isEditing = editingSlot === slot.key;
        return (
          <View key={slot.key} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Ionicons name={slot.icon as any} size={16} color={Colors.primary} />
                <Text style={styles.mealTitle}>{slot.label}</Text>
                <Text style={styles.mealTime}>{slot.time}</Text>
              </View>
              <View style={styles.mealActions}>
                {plan && (
                  <Pressable onPress={() => deletePlan.mutate(plan.id, {
                    onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
                    onError: (err: any) => Alert.alert('Delete Failed', err?.message || 'Could not delete the meal.'),
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
                <Pressable style={styles.mealSaveBtn} onPress={() => handleSaveSlot(slot.key)} disabled={propagateEdit.isPending}>
                  {propagateEdit.isPending
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

      {/* Linked-day edit confirmation: Continue / Unlink / Cancel */}
      <Modal visible={!!pendingLinkedSave} transparent animationType="fade" onRequestClose={handleCancelLinkedSave}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 380, gap: 14, borderWidth: 1, borderColor: Colors.border }}>
            {!showUnlinkPicker ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="link" size={18} color={Colors.primary} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text }}>Linked Day</Text>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 }}>
                  This will also update {linkedDayNames(activeDay).join(', ')} since {DAY_NAMES[activeDay]} is linked with {linkedDayNames(activeDay).length === 1 ? 'it' : 'them'}.
                </Text>
                <Pressable
                  style={{ height: 42, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleConfirmLinkedSave}
                  disabled={propagateEdit.isPending}
                >
                  {propagateEdit.isPending
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Continue</Text>}
                </Pressable>
                <Pressable
                  style={{ height: 42, borderRadius: 10, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setShowUnlinkPicker(true)}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text }}>Unlink</Text>
                </Pressable>
                <Pressable style={{ alignItems: 'center', paddingVertical: 6 }} onPress={handleCancelLinkedSave}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted }}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="link" size={18} color={Colors.primary} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text }}>Unlink Days</Text>
                </View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 }}>
                  Tap a day to unlink it. It will keep its current meals and stop following {DAY_NAMES[activeDay]}'s diet.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {linkedDayNames(activeDay).map(name => {
                    const dayIdx = DAY_NAMES.indexOf(name);
                    return (
                      <Pressable
                        key={name}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border }}
                        onPress={() => handleUnlinkThenSave([dayIdx])}
                        disabled={unlinkDay.isPending}
                      >
                        <Ionicons name="close-circle" size={14} color={Colors.danger} />
                        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text }}>{name}</Text>
                      </Pressable>
                    );
                  })}
                  {linkedDayNames(activeDay).length === 0 && (
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted }}>
                      No more linked days — {DAY_NAMES[activeDay]} is now independent.
                    </Text>
                  )}
                </View>
                {linkedDayNames(activeDay).length > 0 ? (
                  <Pressable
                    style={{ height: 42, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                    onPress={handleConfirmLinkedSave}
                    disabled={propagateEdit.isPending}
                  >
                    {propagateEdit.isPending
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Save to remaining linked days</Text>}
                  </Pressable>
                ) : (
                  <Pressable
                    style={{ height: 42, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                    onPress={handleConfirmLinkedSave}
                    disabled={propagateEdit.isPending}
                  >
                    {propagateEdit.isPending
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#000' }}>Save just to {DAY_NAMES[activeDay]}</Text>}
                  </Pressable>
                )}
                <Pressable style={{ alignItems: 'center', paddingVertical: 6 }} onPress={handleCancelLinkedSave}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted }}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
