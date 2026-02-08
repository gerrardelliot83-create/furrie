'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signInWithOtp: (email: string) => Promise<{ error: string | null; isRateLimited?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
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

  // Send OTP to email
  const signInWithOtp = useCallback(async (email: string): Promise<{ error: string | null; isRateLimited?: boolean }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        // Check for rate limit error (429 Too Many Requests)
        const isRateLimited = error.status === 429 ||
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('too many requests');

        const userMessage = isRateLimited
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : error.message;

        setState(prev => ({ ...prev, loading: false, error: userMessage }));
        return { error: userMessage, isRateLimited };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, [supabase.auth]);

  // Verify OTP
  const verifyOtp = useCallback(async (email: string, token: string): Promise<{ error: string | null }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify OTP';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, [supabase.auth]);

  // Sign in with email and password
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }, [supabase.auth]);

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
    signInWithOtp,
    verifyOtp,
    signInWithPassword,
    signOut,
    clearError,
  };
}
