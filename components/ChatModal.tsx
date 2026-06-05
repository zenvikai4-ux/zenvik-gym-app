import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, TextInput, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useDirectMessages, useInsertDirectMessage, useSendWhatsAppMessage } from '@/lib/hooks';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  person: { id?: string; name: string; phone: string };
  gymId: string;
  userId: string;
  onClose: () => void;
}

export function ChatModal({ visible, person, gymId, userId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: messages = [], isLoading } = useDirectMessages(person?.phone, gymId);
  const insertMsg = useInsertDirectMessage();
  const sendWA = useSendWhatsAppMessage();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!message.trim() || !person?.phone) return;
    setSending(true);
    try {
      await sendWA.mutateAsync({ phone: person.phone, message: message.trim(), gymId });
      await insertMsg.mutateAsync({
        gym_id: gymId,
        from_id: userId,
        to_phone: person.phone.replace(/\D/g, '').slice(-10),
        message: message.trim(),
        direction: 'outbound',
      });
      setMessage('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Failed to send', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={22} color={Colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName}>{person?.name}</Text>
              <Text style={styles.headerPhone}>{person?.phone}</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#25D36620', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
          ) : (
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {messages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted, marginTop: 12 }}>
                    No messages yet. Send the first message!
                  </Text>
                </View>
              ) : (
                messages.map((msg: any) => (
                  <View key={msg.id} style={[styles.bubble, msg.direction === 'outbound' ? styles.bubbleOut : styles.bubbleIn]}>
                    <Text style={styles.bubbleText}>{msg.message}</Text>
                    <Text style={styles.bubbleTime}>
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <Pressable style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.4 }]} onPress={handleSend} disabled={!message.trim() || sending}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { padding: 4 },
  headerName: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  headerPhone: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, gap: 4 },
  bubbleOut: { backgroundColor: '#25D36625', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleIn: { backgroundColor: Colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text },
  bubbleTime: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  input: { flex: 1, backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
});
