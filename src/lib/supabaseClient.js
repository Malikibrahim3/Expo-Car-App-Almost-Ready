/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for the frontend application.
 * Note: The anon key is designed to be public (used with RLS policies).
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const isDev = process.env.EXPO_PUBLIC_APP_ENV === 'development' || __DEV__;
if (isDev) {
  console.log('✅ Supabase client initializing...');
}

// Create the real Supabase client with AsyncStorage for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  }
});

// Helper function to check connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error };
    }
    
    console.log('✅ Supabase connected successfully');
    return { success: true, data };
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return { success: false, error: err };
  }
};

export default supabase;
