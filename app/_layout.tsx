import React, { useEffect, Component } from "react";
import { View, Text, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, retry: 1, refetchOnWindowFocus: true } },
});

class CrashDisplay extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <View style={{ flex: 1, backgroundColor: "#1a0000", padding: 24, paddingTop: 80 }}>
          <Text style={{ color: "#ff6666", fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>
            {e.message}
          </Text>
          <ScrollView>
            <Text style={{ color: "#ffaaaa", fontSize: 11 }}>{e.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === "(tabs)";
    if (!user && inTabs) {
      router.replace("/login");
    } else if (user && !inTabs) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  // Register push token when user logs in
  useEffect(() => {
    if (!user?.id) return;
    const registerPushToken = async () => {
      try {
        if (!Device.isDevice) return;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token) {
          await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
        }
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (e) {
        // Push notifications not available in Expo Go — ignore
      }
    };
    registerPushToken();

    // Listen for notifications received while app is open (foreground)
    const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notification received in foreground:', notification.request.content.title);
    });

    // Listen for user tapping a notification
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response.notification.request.content.title);
      // Navigate to notifications tab when user taps
      router.push('/(tabs)/notifications');
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, [user?.id]);

  // While loading, show a dark spinner - never white
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0F14", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#2ECC71" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <CrashDisplay>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              <AuthGuard>
                <Slot />
              </AuthGuard>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </CrashDisplay>
  );
}
