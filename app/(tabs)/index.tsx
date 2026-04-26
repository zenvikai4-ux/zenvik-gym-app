import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/context/AuthContext';
import {
  useLeads, useMembers, useTrainers, useGyms,
  useActivityLog, useClientProfiles,
  useMemberById, useMemberDietPlans, useMemberWeightHistory,
  useNotifications,
} from '@/lib/hooks';
import { StatCard } from '@/components/StatCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useTabBarHeight } from '@/lib/useTabBarHeight';

// ── Gym Owner dashboard ───────────────────────────────────────────────
function OwnerDashboard() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const { data: leads = [], refetch: refLeads, isRefetching: refL } = useLeads(user?.gym_id);
  const { data: members = [], refetch: refMembers, isRefetching: refM } = useMembers(user?.gym_id);
  const { data: activity = [], refetch: refAct } = useActivityLog(user?.gym_id);

  const enquiries = leads.filter(l => l.status === 'enquiry').length;
  const trialsBooked = leads.filter(l => l.status === 'trial_booked').length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const expiring = members.filter(m => m.status === 'expiring').length;
  const expired = members.filter(m => m.status === 'expired').length;

  const onRefresh = () => { refLeads(); refMembers(); refAct(); };

  const alerts: { msg: string; color: string }[] = [];
  if (expiring > 0) alerts.push({ msg: `${expiring} membership(s) expiring soon`, color: Colors.warning });
  if (expired > 0) alerts.push({ msg: `${expired} membership(s) have expired`, color: Colors.danger });
  if (enquiries > 0) alerts.push({ msg: `${enquiries} new enquiries to follow up`, color: Colors.info });

  return (
    <>
      <ScreenHeader title="Dashboard" subtitle={`Welcome back, ${user?.name?.split(' ')[0]}`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refL || refM} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/leads' as any)}>
            <StatCard label="Enquiries" value={enquiries} color={Colors.info} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/leads' as any)}>
            <StatCard label="Trials Booked" value={trialsBooked} color={Colors.warning} />
          </Pressable>
        </View>
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/members' as any)}>
            <StatCard label="Active Members" value={activeMembers} color={Colors.primary} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/members' as any)}>
            <StatCard label="Expiring Soon" value={expiring} color={Colors.danger}
              sub={expired > 0 ? `${expired} expired` : undefined} />
          </Pressable>
        </View>

        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Alerts</Text>
            </View>
            {alerts.map((a, i) => (
              <View key={i} style={styles.alertRow}>
                <View style={[styles.dot, { backgroundColor: a.color }]} />
                <Text style={styles.alertText}>{a.msg}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {[
            { label: 'Manage Members', icon: 'person-outline', route: '/(tabs)/members', color: Colors.primary },
            { label: 'View Leads', icon: 'people-outline', route: '/(tabs)/leads', color: Colors.warning },
            { label: 'Manage Trainers', icon: 'barbell-outline', route: '/(tabs)/trainers', color: Colors.purple },
            { label: 'Broadcast Message', icon: 'megaphone-outline', route: '/(tabs)/more', color: '#25D366' },
          ].map(item => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activity.slice(0, 6).map((a: any) => (
            <View key={a.id} style={styles.activityRow}>
              <Text style={styles.activityText} numberOfLines={1}>
                {a.actor_name}: {a.action}{a.details ? ` — ${a.details}` : ''}
              </Text>
              <Text style={styles.activityDate}>{new Date(a.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
          {activity.length === 0 && <Text style={styles.emptyText}>No recent activity</Text>}
        </View>
      </ScrollView>
    </>
  );
}

// ── Super Admin dashboard ─────────────────────────────────────────────
function AdminDashboard() {
  const tabBarHeight = useTabBarHeight();
  const { data: gyms = [], refetch: refGyms, isRefetching } = useGyms();
  const { data: leads = [], refetch: refLeads } = useLeads();
  const { data: trainers = [], refetch: refTrainers } = useTrainers();
  const { data: activity = [], refetch: refAct } = useActivityLog();

  const activeGyms = gyms.filter((g: any) => g.is_active).length;
  const onRefresh = () => { refGyms(); refLeads(); refTrainers(); refAct(); };

  const navCards = [
    { label: 'Gyms', sub: `${gyms.length} total`, icon: 'business-outline', color: Colors.primary, route: '/(tabs)/gyms' },
    { label: 'Activity Log', sub: `${activity.length} events`, icon: 'pulse-outline', color: Colors.info, route: '/(tabs)/activity' },
    { label: 'Query Log', sub: 'Support tickets', icon: 'help-circle-outline', color: Colors.warning, route: '/(tabs)/querylog' },
    { label: 'Modules', sub: 'Manage features', icon: 'grid-outline', color: Colors.purple, route: '/(tabs)/more' },
    { label: 'Billing', sub: 'Invoices', icon: 'card-outline', color: Colors.info, route: '/(tabs)/more' },
    { label: 'WhatsApp', sub: 'Connections', icon: 'logo-whatsapp', color: '#25D366', route: '/(tabs)/more' },
  ];

  return (
    <>
      <ScreenHeader title="Platform Overview" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Stats row */}
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/gyms' as any); }}>
            <StatCard label="Total Gyms" value={gyms.length} color={Colors.primary} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/gyms' as any); }}>
            <StatCard label="Active Gyms" value={activeGyms} color={Colors.info} />
          </Pressable>
        </View>
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/activity' as any); }}>
            <StatCard label="Total Leads" value={leads.length} color={Colors.warning} />
          </Pressable>
          <Pressable style={{ flex: 1 }}>
            <StatCard label="Trainers" value={trainers.length} color={Colors.purple} />
          </Pressable>
        </View>

        {/* Navigation cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          {navCards.map(item => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Text style={styles.actionSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/(tabs)/activity' as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {activity.slice(0, 6).map((a: any) => (
            <View key={a.id} style={styles.activityRow}>
              <Text style={styles.activityText} numberOfLines={1}>{a.actor_name}: {a.action}</Text>
              <Text style={styles.activityDate}>{new Date(a.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
          {activity.length === 0 && <Text style={styles.emptyText}>No recent activity</Text>}
        </View>
      </ScrollView>
    </>
  );
}

// ── Trainer dashboard ─────────────────────────────────────────────────
function TrainerDashboard() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const { data: clients = [], refetch, isRefetching } = useClientProfiles(null, user?.id);
  const morning = clients.filter((c: any) => c.session_time === 'morning').length;
  const evening = clients.filter((c: any) => c.session_time === 'evening').length;

  return (
    <>
      <ScreenHeader title="My Dashboard" subtitle={`Hello, ${user?.name?.split(' ')[0]}`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/clients' as any)}>
            <StatCard label="Total Clients" value={clients.length} color={Colors.primary} />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/clients' as any)}>
            <StatCard label="Morning" value={morning} color={Colors.warning} sub={`${evening} evening`} />
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {[
            { label: 'View My Clients', icon: 'people-outline', route: '/(tabs)/clients', color: Colors.primary },
            { label: 'Manage Diet Plans', icon: 'nutrition-outline', route: '/(tabs)/diet', color: Colors.info },
            { label: 'Send Query', icon: 'help-circle-outline', route: '/(tabs)/more', color: Colors.warning },
          ].map(item => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
        {clients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Clients</Text>
            {clients.slice(0, 5).map((c: any) => (
              <View key={c.id} style={styles.activityRow}>
                <Text style={styles.activityText}>{c.member?.name || 'Unknown'}</Text>
                <Text style={styles.activityDate}>{c.session_time || '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ── Member dashboard ──────────────────────────────────────────────────
function MemberDashboard() {
  const { user } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const router2 = useRouter();
  const { data: member } = useMemberById(user?.member_id);
  const { data: weightData } = useMemberWeightHistory(user?.member_id);
  const { data: notifs = [] } = useNotifications(user?.member_id, user?.gym_id);
  const { data: dietPlans = [] } = useMemberDietPlans(user?.member_id);

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayDiet = dietPlans.filter((p: any) => p.day_of_week === todayIdx);
  const unreadNotifs = notifs.slice(0, 3);
  const profile = (weightData as any)?.profile;
  const history = (weightData as any)?.history ?? [];
  const latestWeight = history.length > 0 ? history[history.length - 1]?.weight_kg : null;

  return (
    <>
      <ScreenHeader title="My Dashboard" subtitle={`Welcome, ${user?.name?.split(' ')[0]}`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {member && (
          <View style={styles.memberCard}>
            <View>
              <Text style={styles.memberCardLabel}>Membership</Text>
              <Text style={styles.memberCardPlan}>{member.plan || 'Active'}</Text>
              <Text style={styles.memberCardExpiry}>
                Expires: {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={[styles.memberStatusDot, { backgroundColor: member.status === 'active' ? Colors.primary : Colors.danger }]} />
          </View>
        )}
        <View style={styles.statsGrid}>
          <Pressable style={{ flex: 1 }} onPress={() => router2.push('/(tabs)/mydiets' as any)}>
            <StatCard label="Meals Today" value={todayDiet.length} color={Colors.primary} />
          </Pressable>
          <StatCard label="Weight" value={latestWeight ? `${latestWeight}kg` : '–'} color={Colors.info} />
        </View>
        {unreadNotifs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Messages</Text>
              <Pressable onPress={() => router2.push('/(tabs)/notifications' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {unreadNotifs.map((n: any) => (
              <View key={n.id} style={styles.notifRow}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody} numberOfLines={1}>{n.body}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {[
            { label: 'View My Diet Plan', icon: 'nutrition-outline', route: '/(tabs)/mydiets', color: Colors.primary },
            { label: 'Notifications', icon: 'notifications-outline', route: '/(tabs)/notifications', color: Colors.info },
            { label: 'Send a Query', icon: 'help-circle-outline', route: '/(tabs)/more', color: Colors.warning },
          ].map(item => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptics.selectionAsync(); router2.push(item.route as any); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'super_admin') return <AdminDashboard />;
  if (user.role === 'trainer') return <TrainerDashboard />;
  if (user.role === 'member') return <MemberDashboard />;
  return <OwnerDashboard />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  section: {
    backgroundColor: Colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dot: { width: 7, height: 7, borderRadius: 4 },
  alertText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1, marginRight: 8 },
  activityDate: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, backgroundColor: Colors.secondary },
  actionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text, flex: 1 },
  actionSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  memberCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberCardLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberCardPlan: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  memberCardExpiry: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  memberStatusDot: { width: 12, height: 12, borderRadius: 6 },
  notifRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  notifTitle: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text, marginBottom: 2 },
  notifBody: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
});
