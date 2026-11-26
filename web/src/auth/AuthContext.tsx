import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api, { errorMessage } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<{ user: User }>('/auth/me')
      .then((response) => {
        if (active) setUser(response.data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const response = await api.post<{ user: User }>('/auth/login', { email, password });
        setUser(response.data.user);
      },
      async register(name, email, password) {
        const response = await api.post<{ user: User }>('/auth/register', { name, email, password });
        setUser(response.data.user);
      },
      async logout() {
        await api.post('/auth/logout').catch(() => undefined);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error(errorMessage('useAuth must be used inside AuthProvider'));
  return context;
}
