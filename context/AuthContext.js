'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
   * Fetch the full profile row for the currently signed-in auth user.
   * Returns null if the profile is not found or the user is inactive.
   */
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

  // Bootstrap session from Supabase on mount
  useEffect(() => {
    let mounted = true;

    // Get current session (works across page refreshes)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Re-fetch profile in case it changed
          const profile = await fetchProfile(session.user);
          setUser(profile);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Sign in with email + password via Supabase Auth.
   * Returns the serialized profile on success; throws on failure.
   */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Invalid email or password');

    // Check is_active (Supabase Auth doesn't handle this for us)
    const profile = await fetchProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error('Your account is inactive');
    }
    setUser(profile);
    return profile;
  };

  /**
   * Register a new user via the server-side API route,
   * then automatically sign in.
   */
  const register = async (payload) => {
    const { email, password } = payload;

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Brief pause so the handle_new_user trigger finishes creating
    // the profile row before we sign in and try to fetch it.
    await new Promise((r) => setTimeout(r, 600));

    // Automatically sign the user in after registration
    return await login(email, password);
  };

  /**
   * Sign out the current user.
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  /**
   * Merge partial updates into the local user state without a refetch.
   */
  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }));

  /**
   * Return the current Supabase access token (for any remaining API route calls).
   * Components that still need to call /api/users/[id] (admin operations) can use this.
   */
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

// ── Helpers ──────────────────────────────────────────────────

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
