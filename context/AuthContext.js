'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (error || !profile || profile.is_active === false) return null;
      return serializeProfile(profile);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Restore session on first load
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          const profile = await fetchProfile(session.user);
          if (mounted) setUser(profile);
        }
        if (mounted) setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to restore auth session (network offline or blocked by ad-blocker):', err);
        if (mounted) setLoading(false);
      });

    // 2. Listen for auth events — callback MUST be synchronous for Supabase.
    //    Use setTimeout(0) to escape the internal Supabase lock before doing
    //    async work (fetchProfile) or navigation (window.location.href).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Defer async profile fetch outside the Supabase lock
          setTimeout(async () => {
            if (!mounted) return;
            const profile = await fetchProfile(session.user);
            if (mounted) {
              setUser(profile);
              setLoading(false);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Clear state synchronously, then redirect after the lock releases
          setUser(null);
          setLoading(false);
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 0);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            const profile = await fetchProfile(session.user);
            if (mounted) setUser(profile);
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message);
    }
    const profile = await fetchProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error('No account found with this email or it has been deactivated.');
    }
    setUser(profile);
    return profile;
  };

  const register = async (payload) => {
    const { email, password } = payload;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return await login(email, password);
  };

  const logout = () => {
    // Just call signOut — the SIGNED_OUT event handler above
    // clears state and redirects to /login.
    supabase.auth.signOut();
  };

  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }));

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function serializeProfile(profile) {
  if (!profile) return null;
  return {
    _id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role || 'student',
    phone: profile.phone || '',
    gender: profile.gender || '',
    profileImage: profile.profile_image || '',
    resetToken: profile.reset_token || null,
    resetTokenExpiry: profile.reset_token_expiry || null,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
