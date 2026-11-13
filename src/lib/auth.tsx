import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const previewKey = 'vyavasya-local-preview';
const projectUrl = (import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.VITE_SUPABASE_SUPABASE_URL
  || '').trim();
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY
  || '').trim();
const supabaseClient: SupabaseClient | null = projectUrl && publishableKey
  ? createClient(projectUrl, publishableKey)
  : null;

interface AuthValue {
  client: SupabaseClient | null;
  configured: boolean;
  previewAllowed: boolean;
  user: User | null;
  loading: boolean;
  preview: boolean;
  enterPreview: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabaseClient));
  const [preview, setPreview] = useState(() => {
    if (import.meta.env.DEV || (!supabaseClient && Capacitor.isNativePlatform())) {
      try { return sessionStorage.getItem(previewKey) === '1'; } catch { return false; }
    }
    return false;
  });

  const previewAllowed = import.meta.env.DEV || (Capacitor.isNativePlatform()
    && (!supabaseClient || import.meta.env.VITE_ENABLE_NATIVE_PREVIEW === 'true'));

  useEffect(() => {
    if (!supabaseClient) return;
    let mounted = true;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setPreview(false);
    });
    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setUser(error ? null : data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    client: supabaseClient,
    configured: Boolean(supabaseClient),
    previewAllowed,
    user,
    loading,
    preview,
    enterPreview: () => {
      if (!previewAllowed) return;
      try { sessionStorage.setItem(previewKey, '1'); } catch { /* preview remains in memory */ }
      setPreview(true);
    },
    signOut: async () => {
      if (preview) {
        try { sessionStorage.removeItem(previewKey); } catch { /* ignore */ }
        setPreview(false);
        return;
      }
      if (supabaseClient) await supabaseClient.auth.signOut();
    },
  }), [user, loading, preview, previewAllowed]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
