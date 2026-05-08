import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra =
  Constants.expoConfig?.extra ??
  (Constants as any).manifest2?.extra?.expoClient?.extra ??
  (Constants as any).manifest?.extra ??
  {};

const supabaseUrl: string =
  (extra.supabaseUrl as string | undefined)?.replace(/\/$/, '') ||
  'https://tacokztxcrzlomgeqfdh.supabase.co';

const supabaseKey: string =
  (extra.supabaseKey as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhY29renR4Y3J6bG9tZ2VxZmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjAyNTksImV4cCI6MjA5Mjc5NjI1OX0.6bOd5FbG78LKmHFFDQhsEoSoc7wlk__Wn_as2Q0sHe0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
