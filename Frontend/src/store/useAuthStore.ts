import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthStore {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    _init: () => () => void; // 구독 해제 함수 반환
}

export const useAuthStore = create<AuthStore>((set) => ({
    session: null,
    user: null,
    loading: true,

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },

    _init: () => {
        // 초기 세션 로드
        supabase.auth.getSession().then(({ data: { session } }) => {
            set({
                session,
                user: session?.user ?? null,
                loading: false,
            });
        });

        // 인증 상태 변경 구독
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            set({
                session,
                user: session?.user ?? null,
                loading: false,
            });
        });

        // cleanup 함수 반환
        return () => subscription.unsubscribe();
    },
}));
