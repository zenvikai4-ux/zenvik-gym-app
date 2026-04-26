import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useEnabledModules } from "@/lib/hooks";
import { Colors } from "@/constants/colors";

function TabIcon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  return <Ionicons name={name as any} size={size} color={color} />;
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Load enabled modules for gym owners/trainers/members
  const gymId = user?.role !== 'super_admin' ? user?.gym_id : null;
  const { data: enabledModules, isLoading: modulesLoading } = useEnabledModules(gymId);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading]);

  if (loading || !user || (gymId && modulesLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const isAdmin = user.role === "super_admin";
  const isOwner = user.role === "gym_owner";
  const isTrainer = user.role === "trainer";
  const isMember = user.role === "member";

  // Module gates for gym owner
  const hasLeads = isOwner ? (enabledModules?.has('leads management') || enabledModules?.has('whatsapp leads') || enabledModules?.has('instagram leads')) : false;
  const hasTrainerLogin = isOwner ? enabledModules?.has('trainer login') : false;
  const hasMemberLogin = isOwner ? enabledModules?.has('member login') : false;

  // For owners: show tabs only if module is active
  // trainers tab always visible to owner (they manage trainers regardless of login module)
  // members tab always visible to owner

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.tabBar }]} />
          ),
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
        }}
      />

      {/* Gym Owner tabs */}
      <Tabs.Screen
        name="leads"
        options={{
          href: isOwner && hasLeads ? undefined : null,
          title: "Leads",
          tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          href: isOwner ? undefined : null,
          title: "Members",
          tabBarIcon: ({ color }) => <TabIcon name="person-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          href: isOwner ? undefined : null,
          title: "Trainers",
          tabBarIcon: ({ color }) => <TabIcon name="barbell-outline" color={color} />,
        }}
      />

      {/* Super Admin tabs */}
      <Tabs.Screen
        name="gyms"
        options={{
          href: isAdmin ? undefined : null,
          title: "Gyms",
          tabBarIcon: ({ color }) => <TabIcon name="business-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: isAdmin ? undefined : null,
          title: "Activity",
          tabBarIcon: ({ color }) => <TabIcon name="pulse-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="querylog"
        options={{
          href: isAdmin ? undefined : null,
          title: "Queries",
          tabBarIcon: ({ color }) => <TabIcon name="help-circle-outline" color={color} />,
        }}
      />

      {/* Trainer tabs */}
      <Tabs.Screen
        name="clients"
        options={{
          href: isTrainer ? undefined : null,
          title: "My Clients",
          tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          href: isTrainer ? undefined : null,
          title: "Diet Plans",
          tabBarIcon: ({ color }) => <TabIcon name="nutrition-outline" color={color} />,
        }}
      />

      {/* Member tabs */}
      <Tabs.Screen
        name="mydiets"
        options={{
          href: isMember ? undefined : null,
          title: "My Diets",
          tabBarIcon: ({ color }) => <TabIcon name="nutrition-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: isMember ? undefined : null,
          title: "Notifications",
          tabBarIcon: ({ color }) => <TabIcon name="notifications-outline" color={color} />,
        }}
      />

      {/* More tab - always visible */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <TabIcon name="ellipsis-horizontal-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
