import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthStore {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
    _init: () => () => void; // 구독 해제 함수 반환
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

export const useAuthStore = create<AuthStore>((set) => ({
    session: null,
    user: null,
    loading: true,
    isAdmin: false,

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, isAdmin: false });
    },

    _init: () => {
        // 초기 세션 로드
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            set({
                session,
                user,
                isAdmin: user ? user.email === ADMIN_EMAIL : false,
                loading: false,
            });
        });

        // 인증 상태 변경 구독
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

        // cleanup 함수 반환
        return () => subscription.unsubscribe();
    },
}));
