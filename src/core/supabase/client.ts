/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We're using anonymous access with wallet address identification
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    // Enable real-time subscriptions
    params: {
      eventsPerSecond: 10, // Limit events to prevent rate limiting
    },
  },
  db: {
    schema: 'public',
  },
});

// Export configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  isConfigured: !!(supabaseUrl && supabaseAnonKey),
} as const;

/**
 * Test Supabase connection
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('deposits').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
};

/**
 * Get Supabase client instance
 */
export const getSupabaseClient = () => supabase;

export default supabase;