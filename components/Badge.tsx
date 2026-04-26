import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'active' | 'expiring' | 'expired' | 'enquiry' | 'trial_booked' | 'visited' | 'member' | 'churned' | 'default';

const MAP: Record<Variant, { bg: string; text: string }> = {
  active: { bg: Colors.successMuted, text: Colors.success },
  expiring: { bg: Colors.warningMuted, text: Colors.warning },
  expired: { bg: Colors.dangerMuted, text: Colors.danger },
  enquiry: { bg: Colors.infoMuted, text: Colors.info },
  trial_booked: { bg: Colors.warningMuted, text: Colors.warning },
  visited: { bg: Colors.purpleMuted, text: Colors.purple },
  member: { bg: Colors.successMuted, text: Colors.success },
  churned: { bg: Colors.dangerMuted, text: Colors.danger },
  default: { bg: Colors.secondary, text: Colors.textSecondary },
};

interface Props {
  label: string;
  variant?: Variant;
}

export function Badge({ label, variant = 'default' }: Props) {
  const { bg, text } = MAP[variant] ?? MAP.default;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontFamily: 'Inter_500Medium', fontSize: 11, textTransform: 'capitalize' },
});
