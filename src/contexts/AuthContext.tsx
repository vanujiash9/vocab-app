import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<string>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeAuthError(error: { message?: string } | null): Error | null {
  if (!error?.message) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new Error('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
  }

  if (message.includes('email not confirmed')) {
    return new Error('Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư rồi thử lại.');
  }

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return new Error('Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.');
  }

  if (message.includes('password should be at least')) {
    return new Error('Mật khẩu cần có ít nhất 6 ký tự.');
  }

  if (message.includes('unable to validate email address') || message.includes('invalid email')) {
    return new Error('Email không hợp lệ. Vui lòng nhập đúng định dạng email.');
  }

  return new Error(error.message);
}

function throwNormalizedAuthError(error: { message?: string } | null): void {
  const normalized = normalizeAuthError(error);
  if (normalized) {
    throw normalized;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function normalizePassword(password: string): string {
  return password.trim();
}

function validateAuthInput(mode: 'login' | 'register', email: string, password: string, displayName?: string): void {
  if (!email) {
    throw new Error('Vui lòng nhập email.');
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isEmailValid) {
    throw new Error('Email không hợp lệ. Vui lòng nhập đúng định dạng email.');
  }

  if (!password) {
    throw new Error('Vui lòng nhập mật khẩu.');
  }

  if (password.length < 6) {
    throw new Error('Mật khẩu cần có ít nhất 6 ký tự.');
  }

  if (mode === 'register' && !displayName) {
    throw new Error('Vui lòng nhập họ tên để tạo tài khoản.');
  }
}

export { normalizeDisplayName, normalizeEmail, normalizePassword, validateAuthInput };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  useEffect(() => {
    let alive = true;

    const initializeSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      try {
        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void initializeSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!alive) return;

      try {
        setSession(nextSession);
        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    signIn: async (email, password) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = normalizePassword(password);
      validateAuthInput('login', normalizedEmail, normalizedPassword);
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
      throwNormalizedAuthError(error);
    },
    signUp: async ({ email, password, displayName }) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = normalizePassword(password);
      const normalizedDisplayName = normalizeDisplayName(displayName);
      validateAuthInput('register', normalizedEmail, normalizedPassword, normalizedDisplayName);
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: { data: { display_name: normalizedDisplayName } },
      });
      throwNormalizedAuthError(error);
      return data.session ? 'Đăng ký thành công.' : 'Đăng ký thành công. Bạn có thể đăng nhập sau khi Supabase hoàn tất tạo tài khoản.';
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
}
