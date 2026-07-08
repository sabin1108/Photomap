import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const missingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    supabaseAnonKey || 'missing-supabase-anon-key'
);
