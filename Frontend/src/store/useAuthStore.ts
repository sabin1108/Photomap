import { create } from 'zustand';
import { getSupabase, missingSupabaseEnv } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthStore {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
    _init: () => () => void;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

export const useAuthStore = create<AuthStore>((set) => ({
    session: null,
    user: null,
    loading: true,
    isAdmin: false,

    signOut: async () => {
        if (missingSupabaseEnv) {
            set({ session: null, user: null, isAdmin: false });
            return;
        }

        const supabase = await getSupabase();
        await supabase.auth.signOut();
        set({ session: null, user: null, isAdmin: false });
    },

    _init: () => {
        if (missingSupabaseEnv) {
            set({ loading: false });
            return () => {};
        }

        let unsubscribe: (() => void) | null = null;

        getSupabase().then((supabase) => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const user = session?.user ?? null;
                set({
                    session,
                    user,
                    isAdmin: user ? user.email === ADMIN_EMAIL : false,
                    loading: false,
                });
            });

            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, session) => {
                const user = session?.user ?? null;
                set({
                    session,
                    user,
                    isAdmin: user ? user.email === ADMIN_EMAIL : false,
                    loading: false,
                });
            });

            unsubscribe = () => subscription.unsubscribe();
        }).catch((error) => {
            console.error('Supabase auth init failed:', error);
            set({ loading: false });
        });

        return () => unsubscribe?.();
    },
}));
