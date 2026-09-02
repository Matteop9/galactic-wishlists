import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Profile = Tables<'profiles'>;

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        // Nothing from the previous account may survive into the next one: not
        // the query cache (the feed key has no user in it), and not the service
        // worker's REST cache, which keys on URL and ignores the Authorization
        // header — offline, it would hand the last account's rows to this one.
        queryClient.clear();
        if ('caches' in window) void caches.delete('supabase-rest').catch(() => undefined);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** The signed-in user’s profile row, or null while it doesn’t exist yet (first run). */
export function useProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
