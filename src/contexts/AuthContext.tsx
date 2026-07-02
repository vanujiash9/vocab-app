import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { createProfileForUser, getProfileByUserId } from '../services/auth';

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileStatus: ProfileStatus;
  profileError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<string>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const PROFILE_RETRY_DELAYS_MS = [0, 250, 750] as const;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const [profileError, setProfileError] = useState('');

  const loadProfile = async (userId: string) => {
    setProfileStatus('loading');
    setProfileError('');

    for (const waitMs of PROFILE_RETRY_DELAYS_MS) {
      if (waitMs) await delay(waitMs);
      const data = await getProfileByUserId(userId);
      if (data) {
        setProfile(data as Profile);
        setProfileStatus('ready');
        return;
      }
    }

    setProfile(null);
    setProfileStatus('missing');
  };

  useEffect(() => {
    let active = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setProfileStatus('idle');
        setProfileError('');
        setLoading(false);
        return;
      }

      try {
        await loadProfile(nextSession.user.id);
      } finally {
        if (active) setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    profileStatus,
    profileError,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async ({ email, password, displayName }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      if (data.user && data.session) {
        const existingProfile = await getProfileByUserId(data.user.id);
        if (!existingProfile) {
          await createProfileForUser({
            userId: data.user.id,
            email: data.user.email ?? email,
            displayName,
          });
        }
      }
      return data.session
        ? 'Đăng ký thành công. Đang hoàn tất hồ sơ tài khoản...'
        : 'Đăng ký thành công. Bạn có thể đăng nhập sau khi Supabase hoàn tất tạo tài khoản.';
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
  }), [session, profile, loading, profileStatus, profileError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
}
