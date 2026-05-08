import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { suppressAuthEvents } from '@/lib/hooks';
import type { Session } from '@supabase/supabase-js';

export type Role = 'super_admin' | 'gym_owner' | 'trainer' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  gym_id?: string;
  branch_id?: string;
  member_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(msg)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function loadProfile(session: Session): Promise<User> {
  try {
    const profilePromise = Promise.resolve(
      supabase
        .from('profiles')
        .select('id, name, email, role, gym_id, branch_id, member_id')
        .eq('id', session.user.id)
        .maybeSingle()
    );

    const { data: profile } = await withTimeout(
      profilePromise,
      8000,
      'Profile load timed out'
    );

    if (!profile) {
      // ── FIX: Never default to super_admin on missing profile ──────
      // Check email-based heuristic: only known Zenvik admin emails get super_admin
      // All others default to gym_owner to prevent privilege escalation
      const email = session.user.email || '';
      const isKnownAdmin =
        email.includes('@zenvikai.com') ||
        session.user.user_metadata?.role === 'super_admin';

      return {
        id: session.user.id,
        name: session.user.user_metadata?.name || email.split('@')[0] || 'User',
        email,
        role: isKnownAdmin ? 'super_admin' : 'gym_owner',
      };
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as Role,
      gym_id: profile.gym_id ?? undefined,
      branch_id: profile.branch_id ?? undefined,
      member_id: profile.member_id ?? undefined,
    };
  } catch {
    // ── FIX: Never default to super_admin on error either ──────────
    return {
      id: session.user.id,
      name: session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: 'gym_owner',
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ── FIX: Track the logged-in user's ID to ignore auth events
  // triggered by signing up NEW gym members/trainers inside the app.
  // When an owner creates a member account, supabase.auth.signUp fires
  // onAuthStateChange which previously wiped/replaced the owner session.
  const loggedInUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let webCleanup: (() => void) | null = null;

    const isTokenError = (msg: string) =>
      msg?.includes('Refresh Token') ||
      msg?.includes('refresh_token') ||
      msg?.includes('AuthApiError');

    if (Platform.OS !== 'web') {
      const prevHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
      const nativeHandler = (error: Error, isFatal?: boolean) => {
        if (isTokenError(error?.message ?? '')) {
          supabase.auth.signOut().catch(() => {});
          return;
        }
        prevHandler?.(error, isFatal);
      };
      (global as any).ErrorUtils?.setGlobalHandler?.(nativeHandler);
    } else {
      const webHandler = (event: PromiseRejectionEvent) => {
        const msg: string = event.reason?.message ?? String(event.reason ?? '');
        if (isTokenError(msg)) {
          event.preventDefault();
          supabase.auth.signOut().catch(() => {});
        }
      };
      window.addEventListener('unhandledrejection', webHandler);
      webCleanup = () => window.removeEventListener('unhandledrejection', webHandler);
    }

    withTimeout(supabase.auth.getSession(), 10000, 'Session check timed out')
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        setSession(session);
        if (session) {
          loggedInUserId.current = session.user.id;
          const profile = await loadProfile(session);
          if (!cancelled) setUser(profile);
        }
      })
      .catch(async (err) => {
        console.warn('Auth init error:', err.message);
        if (
          err.message?.includes('Refresh Token') ||
          err.message?.includes('refresh_token') ||
          err.message?.includes('Invalid')
        ) {
          await supabase.auth.signOut().catch(() => {});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (cancelled) return;

      // ── FIX: Ignore auth events during user creation (trainer/member signup)
      if (suppressAuthEvents) return;

      // ── FIX: Ignore auth events for OTHER users (e.g. when gym owner
      // creates a new member/trainer account via signUp internally).
      // Only process events that belong to the currently logged-in user.
      if (
        newSession &&
        loggedInUserId.current &&
        newSession.user.id !== loggedInUserId.current
      ) {
        // This is a signup event for a different user — ignore it completely
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !newSession) {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        setSession(null);
        loggedInUserId.current = null;
        setLoading(false);
        return;
      }

      setSession(newSession);
      if (newSession) {
        loggedInUserId.current = newSession.user.id;
        const profile = await loadProfile(newSession);
        if (!cancelled) setUser(profile);
      } else {
        setUser(null);
        loggedInUserId.current = null;
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      webCleanup?.();
    };
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Sign in timed out. Please check your internet connection and try again.'
      );
      if (error) return error.message;
      // Set the logged-in user ID immediately on login
      if (data?.session) {
        loggedInUserId.current = data.session.user.id;
      }
      return null;
    } catch (err: any) {
      return err.message || 'An unexpected error occurred';
    }
  };

  const logout = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 8000, 'Sign out timed out');
    } catch {
      // Even if signOut times out, clear local state
    } finally {
      setUser(null);
      setSession(null);
      loggedInUserId.current = null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
