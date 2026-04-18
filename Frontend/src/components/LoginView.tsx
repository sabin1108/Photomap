import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface LoginViewProps {
  onNavigate: (view: string) => void;
}

export function LoginView({ onNavigate }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 클라이언트 사이드 유효성 검사
    if (!email.trim()) {
      toast.error('이메일을 입력해 주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (!password) {
      toast.error('비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Supabase 에러 메시지를 사용자 친화적으로 변환
        if (error.message.includes('Invalid login credentials')) {
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('이메일 인증이 필요합니다. 받은 편지함을 확인해 주세요.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('환영합니다!');
        onNavigate('all');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

    if (!demoEmail || !demoPassword) {
      toast.error('데모 계정 정보가 설정되지 않았습니다.');
      return;
    }

    setDemoLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: demoEmail, 
        password: demoPassword 
      });

      if (error) {
        toast.error('데모 로그인 실패: ' + error.message);
      } else {
        toast.success('데모 모드로 입장합니다. 환영합니다!');
        onNavigate('all');
      }
    } catch (err) {
      console.error('Demo Login error:', err);
      toast.error('로그인 중 오류가 발생했습니다.');
    } finally {
      setDemoLoading(false);
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
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E09F87]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#AECBEB]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-stone-800 mb-2">Welcome Back</h2>
            <p className="text-stone-500 text-sm">Continue your journey with TravelArc</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-stone-500 hover:text-[#E09F87] transition-colors">
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-xl shadow-lg shadow-[#E09F87]/20 text-base font-medium transition-all mt-4"
              disabled={loading || demoLoading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight size={18} />
                </span>
              )}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#F5F2EB] px-2 text-stone-400">Or experience without signup</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleDemoLogin}
              className="w-full h-12 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl transition-all shadow-sm"
              disabled={loading || demoLoading}
            >
              {demoLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  Entering Demo...
                </span>
              ) : (
                "데모 계정으로 체험하기"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-200/50 text-center">
            <p className="text-stone-500 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="text-[#E09F87] font-medium hover:underline decoration-2 underline-offset-4"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
