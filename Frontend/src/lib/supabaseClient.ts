import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const missingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

let supabaseClientPromise: Promise<SupabaseClient> | null = null;

export const getSupabase = () => {
    if (!supabaseClientPromise) {
        supabaseClientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(
                supabaseUrl || 'https://missing-supabase-url.supabase.co',
                supabaseAnonKey || 'missing-supabase-anon-key'
            )
        );
    }

    return supabaseClientPromise;
};
