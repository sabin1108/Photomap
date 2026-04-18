import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface SignupViewProps {
  onNavigate: (view: string) => void;
}

export function SignupView({ onNavigate }: SignupViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // 클라이언트 사이드 유효성 검사
    if (!fullName.trim()) {
      toast.error('이름을 입력해 주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) {
        console.error('❌ [Signup] Auth Error details:', authError);

        // Supabase 에러 메시지 한글화
        const msg = (authError.message || '').toLowerCase();

        if (msg.includes('already registered') || msg.includes('user already exists')) {
          toast.error('이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해 주세요.');
        } else if (msg.includes('password') && msg.includes('weak')) {
          toast.error('비밀번호가 너무 취약합니다. 8자 이상의 더 복잡한 비밀번호를 사용해 주세요.');
        } else if (msg.includes('email') && msg.includes('valid')) {
          toast.error('올바른 이메일 주소를 입력해 주세요.');
        } else {
          // 어떤 매핑에도 걸리지 않으면 원문 에러를 표시
          toast.error(authError.message || '회원가입 중 알 수 없는 오류가 발생했습니다.');
        }
        return;
      }

      // 가입 성공 (이메일 인증이 활성화된 경우)
      if (data.user && !data.session) {
        toast.info('인증 메일이 발송되었습니다! 이메일 함을 확인하여 가입을 완료해 주세요.', {
          duration: 6000,
        });
        onNavigate('login');
      } else if (data.session) {
        toast.success('회원가입 및 로그인이 완료되었습니다!');
        onNavigate('all');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        layoutId="auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full max-w-md bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 md:p-10 relative overflow-hidden"
      >

        {/* 장식용 배경 블롭(Blob) */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#AECBEB] via-[#E09F87] to-[#AECBEB] opacity-50" />
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#AECBEB]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#E09F87]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center mb-8">

            <h2 className="text-3xl font-light text-stone-800 mb-2">Create Account</h2>
            <p className="text-stone-500 text-sm">Start preserving your memories today</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E09F87]/50 focus:border-[#E09F87] transition-all"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E09F87]/50 focus:border-[#E09F87] transition-all"
                placeholder="hello@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E09F87]/50 focus:border-[#E09F87] transition-all pr-12"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 ml-1">Must be at least 8 characters</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-stone-800 hover:bg-stone-700 text-white rounded-xl shadow-lg shadow-stone-800/20 text-base font-medium transition-all mt-6"
              disabled={loading}
            >
              {loading ? '계정 생성 중...' : '가입하기'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-200/50 text-center">
            <p className="text-stone-500 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="text-[#E09F87] font-medium hover:underline decoration-2 underline-offset-4"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
