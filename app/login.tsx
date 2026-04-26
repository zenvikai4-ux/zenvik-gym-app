import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setError('');
    const err = await login(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="barbell" size={32} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>GymApp</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed, loading && styles.disabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Role hint cards */}
        <View style={styles.roleHints}>
          <Text style={styles.roleHintsTitle}>Access by role</Text>
          {[
            { role: 'Super Admin', desc: 'Manage all gyms & billing', icon: 'shield-checkmark-outline', color: Colors.purple },
            { role: 'Gym Owner', desc: 'Members, trainers & leads', icon: 'business-outline', color: Colors.primary },
            { role: 'Trainer', desc: 'Clients & diet plans', icon: 'barbell-outline', color: Colors.warning },
            { role: 'Member', desc: 'Your fitness journey', icon: 'person-outline', color: Colors.info },
          ].map(r => (
            <View key={r.role} style={styles.roleCard}>
              <View style={[styles.roleIcon, { backgroundColor: r.color + '20' }]}>
                <Ionicons name={r.icon as any} size={16} color={r.color} />
              </View>
              <View>
                <Text style={styles.roleCardTitle}>{r.role}</Text>
                <Text style={styles.roleCardDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Contact your platform administrator to get access.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  logoRow: { alignItems: 'center', marginBottom: 20 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text,
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: 36,
  },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, height: 48,
  },
  inputIcon: { paddingLeft: 14 },
  input: {
    flex: 1, paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text,
  },
  eyeBtn: { padding: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dangerMuted, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.danger + '40' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger, flex: 1 },
  loginBtn: {
    height: 50, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  loginBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
  roleHints: { marginTop: 32, gap: 8 },
  roleHintsTitle: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  roleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  roleCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  roleCardDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  footer: {
    marginTop: 28, fontFamily: 'Inter_400Regular', fontSize: 12,
    color: Colors.textMuted, textAlign: 'center',
  },
});
