import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import {
  useMemberById, useMemberByProfileId, useMemberDietPlans,
  useProgressLog, useInsertProgressLog, useTodayGoals, useUpsertTodayGoals,
} from '@/lib/hooks';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';
import * as Haptics from 'expo-haptics';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];

const GOAL_ITEMS = [
  { key: 'workout_done', label: 'Workout Done', icon: 'barbell-outline', color: Colors.primary },
  { key: 'diet_followed', label: 'Diet Followed', icon: 'nutrition-outline', color: Colors.info },
  { key: 'water_intake', label: 'Water Intake (2L+)', icon: 'water-outline', color: '#2196F3' },
  { key: 'sleep_ok', label: 'Good Sleep (7h+)', icon: 'moon-outline', color: Colors.purple },
] as const;

export default function MyDietsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  // Use member_id from profile, fallback to looking up by user id
  const { data: memberFallback } = useMemberByProfileId(user?.id, user?.gym_id);
  const memberId = user?.member_id || memberFallback?.id || null;
  const { data: member } = useMemberById(memberId);
  const { data: dietPlans = [] } = useMemberDietPlans(memberId);
  const { data: progressLogs = [] } = useProgressLog(memberId);
  const { data: todayGoals } = useTodayGoals(memberId);
  const insertProgress = useInsertProgressLog();
  const upsertGoals = useUpsertTodayGoals();

  const hasTrainer = !!member?.trainer_id;
  const [activeTab, setActiveTab] = useState<'goals' | 'diet' | 'progress'>('goals');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [showLogProgress, setShowLogProgress] = useState(false);
  const [progressForm, setProgressForm] = useState({
    weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '', notes: '',
  });

  const todayChecks = {
    workout_done: todayGoals?.workout_done ?? false,
    diet_followed: todayGoals?.diet_followed ?? false,
    water_intake: todayGoals?.water_intake ?? false,
    sleep_ok: todayGoals?.sleep_ok ?? false,
  };

  const completedGoals = Object.values(todayChecks).filter(Boolean).length;

  const toggleGoal = (key: keyof typeof todayChecks) => {
    if (!memberId) return;
    const newChecks = { ...todayChecks, [key]: !todayChecks[key] };
    upsertGoals.mutate({
      member_id: memberId,
      ...newChecks,
      notes: todayGoals?.notes || '',
    }, {
      onSuccess: () => Haptics.selectionAsync(),
    });
  };

  const handleLogProgress = () => {
    if (!memberId) return;
    const data: any = { member_id: memberId };
    if (progressForm.weight_kg) data.weight_kg = parseFloat(progressForm.weight_kg);
    if (progressForm.body_fat_pct) data.body_fat_pct = parseFloat(progressForm.body_fat_pct);
    if (progressForm.chest_cm) data.chest_cm = parseFloat(progressForm.chest_cm);
    if (progressForm.waist_cm) data.waist_cm = parseFloat(progressForm.waist_cm);
    if (progressForm.hips_cm) data.hips_cm = parseFloat(progressForm.hips_cm);
    if (progressForm.notes) data.notes = progressForm.notes;

    if (Object.keys(data).length === 1) { Alert.alert('Enter at least one measurement'); return; }

    insertProgress.mutate(data, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowLogProgress(false);
        setProgressForm({ weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '', notes: '' });
      },
      onError: (e: any) => Alert.alert('Error', e.message),
    });
  };

  const todayDiet = dietPlans.filter((p: any) => p.day_of_week === selectedDay);

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Dashboard" subtitle={`Welcome, ${user?.name?.split(' ')[0]}`} />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'goals', label: "Today's Goals", icon: 'checkmark-circle-outline' },
          { key: 'diet', label: 'Diet Plan', icon: 'nutrition-outline' },
          { key: 'progress', label: 'Progress', icon: 'trending-up-outline' },
        ].map(t => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key as any)}
          >
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 20, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TODAY'S GOALS ── */}
        {activeTab === 'goals' && (
          <>
            {/* Progress ring summary */}
            <View style={styles.goalSummary}>
              <View style={styles.goalRing}>
                <Text style={styles.goalRingNum}>{completedGoals}</Text>
                <Text style={styles.goalRingOf}>/ 4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalSummaryTitle}>
                  {completedGoals === 4 ? '🎉 Perfect day!' : completedGoals >= 2 ? '💪 Keep going!' : '🌅 Let\'s start!'}
                </Text>
                <Text style={styles.goalSummaryDate}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>

            {/* Goal checklist */}
            {GOAL_ITEMS.map(item => {
              const done = todayChecks[item.key];
              return (
                <Pressable
                  key={item.key}
                  style={[styles.goalCard, done && { borderColor: item.color + '50', backgroundColor: item.color + '08' }]}
                  onPress={() => toggleGoal(item.key)}
                >
                  <View style={[styles.goalIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.goalLabel, done && { color: item.color }]}>{item.label}</Text>
                  <View style={[styles.goalCheck, { backgroundColor: done ? item.color : Colors.secondary, borderColor: done ? item.color : Colors.border }]}>
                    {done && <Ionicons name="checkmark" size={16} color="#000" />}
                  </View>
                </Pressable>
              );
            })}

            {/* Membership info */}
            {member && (
              <View style={styles.memberCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberCardLabel}>Membership</Text>
                  <Text style={styles.memberCardPlan}>{member.plan || 'Active'}</Text>
                  <Text style={styles.memberCardExpiry}>
                    Expires: {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-IN') : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.memberStatusDot, {
                  backgroundColor: member.status === 'active' ? Colors.primary : Colors.danger
                }]} />
              </View>
            )}
          </>
        )}

        {/* ── DIET PLAN ── */}
        {activeTab === 'diet' && (
          <>
            {!hasTrainer ? (
              <View style={styles.noTrainer}>
                <Ionicons name="person-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.noTrainerTitle}>No trainer assigned</Text>
                <Text style={styles.noTrainerSub}>Diet plans are created by your trainer. Contact your gym to get a trainer assigned.</Text>
              </View>
            ) : (
              <>
                {/* Day selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {DAYS.map((d, i) => (
                      <Pressable
                        key={d}
                        style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                        onPress={() => setSelectedDay(i)}
                      >
                        <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {MEALS.map(meal => {
                  const items = todayDiet.filter((p: any) => p.meal_slot === meal);
                  return (
                    <View key={meal} style={styles.mealCard}>
                      <Text style={styles.mealTitle}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                      {items.length > 0
                        ? items.map((p: any) => (
                            <Text key={p.id} style={styles.mealItem}>• {p.items}</Text>
                          ))
                        : <Text style={styles.mealEmpty}>No plan for this meal</Text>
                      }
                    </View>
                  );
                })}

                {todayDiet.length === 0 && (
                  <View style={styles.noTrainer}>
                    <Ionicons name="nutrition-outline" size={40} color={Colors.textMuted} />
                    <Text style={styles.noTrainerTitle}>No diet plan for {DAYS[selectedDay]}</Text>
                    <Text style={styles.noTrainerSub}>Your trainer hasn't set a plan for this day yet.</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── PROGRESS ── */}
        {activeTab === 'progress' && (
          <>
            <Pressable style={styles.logBtn} onPress={() => setShowLogProgress(true)}>
              <Ionicons name="add-circle" size={20} color={Colors.primary} />
              <Text style={styles.logBtnText}>Log Today's Measurements</Text>
            </Pressable>

            {progressLogs.length === 0 ? (
              <View style={styles.noTrainer}>
                <Ionicons name="trending-up-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.noTrainerTitle}>No progress logged yet</Text>
                <Text style={styles.noTrainerSub}>Start tracking your transformation by logging your measurements above.</Text>
              </View>
            ) : (
              progressLogs.map((log: any) => (
                <View key={log.id} style={styles.progressCard}>
                  <Text style={styles.progressDate}>
                    {new Date(log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={styles.progressGrid}>
                    {[
                      { label: 'Weight', value: log.weight_kg, unit: 'kg' },
                      { label: 'Body Fat', value: log.body_fat_pct, unit: '%' },
                      { label: 'Chest', value: log.chest_cm, unit: 'cm' },
                      { label: 'Waist', value: log.waist_cm, unit: 'cm' },
                      { label: 'Hips', value: log.hips_cm, unit: 'cm' },
                    ].filter(m => m.value != null).map(m => (
                      <View key={m.label} style={styles.progressStat}>
                        <Text style={styles.progressStatVal}>{m.value}{m.unit}</Text>
                        <Text style={styles.progressStatLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                  {log.notes && <Text style={styles.progressNotes}>{log.notes}</Text>}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Log Progress Modal */}
      <Modal visible={showLogProgress} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowLogProgress(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Measurements</Text>
            <Pressable onPress={() => setShowLogProgress(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalSub}>Enter any measurements you want to track. Leave blank to skip.</Text>
            {[
              { key: 'weight_kg', label: 'Weight (kg)', placeholder: '70.5' },
              { key: 'body_fat_pct', label: 'Body Fat %', placeholder: '18' },
              { key: 'chest_cm', label: 'Chest (cm)', placeholder: '95' },
              { key: 'waist_cm', label: 'Waist (cm)', placeholder: '80' },
              { key: 'hips_cm', label: 'Hips (cm)', placeholder: '90' },
            ].map(f => (
              <View key={f.key} style={styles.formField}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={(progressForm as any)[f.key]}
                  onChangeText={v => setProgressForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="How are you feeling? Any observations..."
                placeholderTextColor={Colors.textMuted}
                value={progressForm.notes}
                onChangeText={v => setProgressForm(p => ({ ...p, notes: v }))}
                multiline
              />
            </View>
            <Pressable
              style={[styles.submitBtn, insertProgress.isPending && { opacity: 0.6 }]}
              onPress={handleLogProgress}
              disabled={insertProgress.isPending}
            >
              {insertProgress.isPending ? <ActivityIndicator color="#000" /> : (
                <><Ionicons name="save-outline" size={18} color="#000" /><Text style={styles.submitBtnText}>Save Measurements</Text></>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, backgroundColor: Colors.secondary, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabActive: { backgroundColor: Colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  goalSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  goalRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.primary },
  goalRingNum: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.primary },
  goalRingOf: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  goalSummaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  goalSummaryDate: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  goalIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text, flex: 1 },
  goalCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  memberCardLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberCardPlan: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  memberCardExpiry: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  memberStatusDot: { width: 12, height: 12, borderRadius: 6 },
  noTrainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noTrainerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  noTrainerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  dayChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.primary },
  mealCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  mealTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.text, textTransform: 'capitalize', marginBottom: 4 },
  mealItem: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, lineHeight: 20 },
  mealEmpty: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primaryMuted, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + '40' },
  logBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary, flex: 1 },
  progressCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  progressDate: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressStat: { backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 70 },
  progressStatVal: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.primary },
  progressStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  progressNotes: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginBottom: 20, lineHeight: 18 },
  formField: { gap: 6, marginBottom: 14 },
  formLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: Colors.card, borderRadius: 12, height: 46, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  submitBtn: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
});
