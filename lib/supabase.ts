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
  'https://qnblkxfrbvgfiekjqkyr.supabase.co';

const supabaseKey: string =
  (extra.supabaseKey as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYmxreGZyYnZnZmlla2pxa3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDUxNjcsImV4cCI6MjA5MjAyMTE2N30.BWqlTxS-JCKu_4d_g8AwUWtQ653MnPq2HXf0KAd0j1U';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
