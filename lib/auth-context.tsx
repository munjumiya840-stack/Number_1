'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  balance: number;
  total_earnings: number;
  is_banned: boolean;
  is_admin: boolean;
  join_date: string;
}

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return;
    }
    if (data) {
      setProfile(data as ProfileData);
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: uid,
          username: user?.email?.split('@')[0] || null,
          full_name: user?.email || null,
          balance: 0,
          is_banned: false,
          is_admin: false,
        })
        .select('*')
        .maybeSingle();
      if (insertError) {
        console.error('Failed to create profile:', insertError.message);
        return;
      }
      if (newProfile) setProfile(newProfile as ProfileData);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
