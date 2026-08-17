/**
 * Auth context backed by the Django graphql-jwt backend.
 * Replaces the previous Supabase-based auth.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { client, saveAuth, clearAuth, getSavedUser, getToken, TOKEN_KEY, REFRESH_KEY } from './apollo';
import { LOGIN_MUTATION, REGISTER_MUTATION, REFRESH_TOKEN_MUTATION } from './gql';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  organization?: { id: string; name: string; plan?: string } | null;
};

type AuthState = {
  loading: boolean;
  user: AuthUser | null;
  /** identifier = phone number OR email */
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>;
  signUp: (phone: string, email: string | undefined, password: string, fullName: string, organizationName: string, role?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  loading: true,
  user: null,
  signIn: async () => ({ error: 'not ready' }),
  signUp: async () => ({ error: 'not ready' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore saved session on boot
  useEffect(() => {
    (async () => {
      try {
        const saved = await getSavedUser();
        if (saved) {
          // Verify token still valid by checking expiry from JWT payload
          const token = await getToken();
          if (token) {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp * 1000 > Date.now()) {
                setUser(saved);
                setLoading(false);
                return;
              }
            }
            // Token expired — try refresh
            const refresh = await AsyncStorage.getItem(REFRESH_KEY);
            if (refresh) {
              const { data } = await client.mutate({
                mutation: REFRESH_TOKEN_MUTATION,
                variables: { refreshToken: refresh },
              });
              if (data?.refreshToken?.token) {
                await AsyncStorage.setItem(TOKEN_KEY, data.refreshToken.token);
                if (data.refreshToken.refreshToken) {
                  await AsyncStorage.setItem(REFRESH_KEY, data.refreshToken.refreshToken);
                }
                setUser(saved);
                setLoading(false);
                return;
              }
            }
          }
          // Refresh failed — clear stale session
          await clearAuth();
        }
      } catch (e) {
        console.warn('auth restore:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Sign in using phone number OR email as the identifier */
  const signIn = useCallback(async (identifier: string, password: string) => {
    try {
      // The backend Login mutation accepts `email` field — phone numbers stored
      // with auto-generated emails (phone@agrinuxes.local) need to be looked up
      // by the backend. We pass whatever the user entered as the `email` field.
      const { data, errors } = await client.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email: identifier.trim(), password },
      });
      if (errors?.length) return { error: errors[0].message };
      const { token, refreshToken, user: u } = data.login;
      const authUser: AuthUser = {
        id: u.id, email: u.email,
        fullName: u.fullName || u.email, role: u.role,
        phone: u.phone,
        organization: u.organization,
      };
      await saveAuth(token, refreshToken, authUser);
      setUser(authUser);
      return {};
    } catch (e: any) {
      return { error: e?.message || 'Login failed' };
    }
  }, []);

  const signUp = useCallback(async (
    phone: string, email: string | undefined, password: string,
    fullName: string, organizationName: string, role = 'farmhand'
  ) => {
    try {
      const { data, errors } = await client.mutate({
        mutation: REGISTER_MUTATION,
        variables: {
          phone: phone.trim(),
          email: email?.trim() || undefined,
          password,
          fullName,
          organizationName,
          role,
        },
      });
      if (errors?.length) return { error: errors[0].message };
      const { token, refreshToken, user: u } = data.register;
      const authUser: AuthUser = {
        id: u.id, email: u.email,
        fullName: u.fullName || fullName, role: u.role,
        phone: u.phone,
        organization: u.organization,
      };
      await saveAuth(token, refreshToken, authUser);
      setUser(authUser);
      return {};
    } catch (e: any) {
      return { error: e?.message || 'Registration failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    await client.clearStore();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ loading, user, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
