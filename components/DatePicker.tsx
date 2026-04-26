import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  minDate?: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function DatePicker({ value, onChange, label, minDate }: DatePickerProps) {
  const [show, setShow] = useState(false);

  const parsed = value ? new Date(value + 'T00:00:00') : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth());
  const [day, setDay] = useState(parsed.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatted = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : 'Select date';

  const handleConfirm = () => {
    const d = String(day).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    onChange(`${year}-${m}-${d}`);
    setShow(false);
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
        <Text style={[styles.triggerText, !value && { color: Colors.textMuted }]}>{formatted}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={show} animationType="slide" transparent onRequestClose={() => setShow(false)}>
        <Pressable style={styles.overlay} onPress={() => setShow(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            {label && <Text style={styles.title}>{label}</Text>}

            {/* Month selector */}
            <Text style={styles.sectionLabel}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MONTHS.map((m, i) => (
                  <Pressable
                    key={m}
                    style={[styles.chip, month === i && styles.chipActive]}
                    onPress={() => { setMonth(i); setDay(Math.min(day, new Date(year, i + 1, 0).getDate())); }}
                  >
                    <Text style={[styles.chipText, month === i && styles.chipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Year selector */}
            <Text style={styles.sectionLabel}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {years.map(y => (
                  <Pressable
                    key={y}
                    style={[styles.chip, year === y && styles.chipActive]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Day grid */}
            <Text style={styles.sectionLabel}>Day</Text>
            <View style={styles.dayGrid}>
              {days.map(d => (
                <Pressable
                  key={d}
                  style={[styles.dayBtn, day === d && styles.dayBtnActive]}
                  onPress={() => setDay(d)}
                >
                  <Text style={[styles.dayText, day === d && styles.dayTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm Date</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: 12, height: 46,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border,
  },
  triggerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, flex: 1 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, marginBottom: 16 },
  sectionLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: '#000' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border,
  },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  dayTextActive: { color: '#000' },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#000' },
});
