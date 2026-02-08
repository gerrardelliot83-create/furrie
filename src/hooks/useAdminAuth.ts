'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface UseAdminAuthReturn extends AdminAuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setState(prev => ({ ...prev, loading: false, error: error.message }));
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Unexpected error in initAuth:', err);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to initialize auth' }));
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      // Verify user has admin role by checking profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // Sign out if we can't verify role
        await supabase.auth.signOut();
        setState(prev => ({ ...prev, loading: false, error: 'Unable to verify account permissions' }));
        return { error: 'Unable to verify account permissions' };
      }

      if (profile.role !== 'admin') {
        // Sign out non-admin users
        await supabase.auth.signOut();
        setState(prev => ({ ...prev, loading: false, error: 'You are not authorized to access this portal' }));
        return { error: 'You are not authorized to access this portal' };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await supabase.auth.signOut();
      setState({ user: null, session: null, loading: false, error: null });
    } catch (err) {
      console.error('Error signing out:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [supabase.auth]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    clearError,
  };
}
