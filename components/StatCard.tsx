import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

const PALETTE = [Colors.primary, Colors.info, Colors.warning, Colors.purple];

export function StatCard({ label, value, sub, color }: Props) {
  const c = color || Colors.primary;
  return (
    <View style={[styles.card, { borderTopColor: c }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: c }]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 12,
    padding: 14, borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
