import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {adminApi, setCsrfToken, setUnauthorizedHandler} from '../api';
import type {AdminUser} from '../types';
import {isPagesAdminMode, pagesAdminUser} from '../pagesMode';
import {currentFirebaseAdmin, loginWithFirebaseEmail, loginWithFirebaseGoogle, logoutFirebaseAdmin, observeFirebaseAdmin} from './firebaseAuth';

type AuthPhase = 'loading' | 'setup' | 'guest' | 'authenticated' | 'unavailable';

type AuthContextValue = {
  phase: AuthPhase;
  user: AdminUser | null;
  error: string;
  requiresBootstrapToken: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  setup: (values: {displayName: string; email: string; password: string; bootstrapToken?: string}) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AdminAuthProvider({children}: {children: ReactNode}) {
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');
  const [requiresBootstrapToken, setRequiresBootstrapToken] = useState(true);
  const initialRefreshStarted = useRef(false);

  const refresh = useCallback(async () => {
    if (isPagesAdminMode) {
      setPhase('loading');
      setError('');
      try {
        const firebaseUser = await currentFirebaseAdmin();
        if (firebaseUser) {
          Object.assign(pagesAdminUser, firebaseUser);
          setUser(firebaseUser);
          setPhase('authenticated');
        } else {
          setUser(null);
          setPhase('guest');
        }
      } catch (nextError) {
        setUser(null);
        setError(nextError instanceof Error ? nextError.message : 'Firebase Authentication is unavailable.');
        setPhase('unavailable');
      }
      return;
    }
    setPhase('loading');
    setError('');
    try {
      const setupState = await adminApi<{needsSetup: boolean; requiresBootstrapToken: boolean}>('/setup');
      setRequiresBootstrapToken(setupState.requiresBootstrapToken);
      if (setupState.needsSetup) {
        setUser(null);
        setPhase('setup');
        return;
      }
      try {
        const session = await adminApi<{user: AdminUser; csrfToken: string}>('/session');
        setCsrfToken(session.csrfToken);
        setUser(session.user);
        setPhase('authenticated');
      } catch (sessionError) {
        if (sessionError instanceof Error && 'status' in sessionError && sessionError.status === 401) {
          setUser(null);
          setPhase('guest');
        } else throw sessionError;
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The admin service is unavailable.');
      setPhase('unavailable');
    }
  }, []);

  useEffect(() => {
    if (!isPagesAdminMode) return;
    try {
      return observeFirebaseAdmin(firebaseUser => {
        setError('');
        if (firebaseUser) {
          Object.assign(pagesAdminUser, firebaseUser);
          setUser(firebaseUser);
          setPhase('authenticated');
        } else {
          setUser(null);
          setPhase('guest');
        }
      }, nextError => {
        setUser(null);
        setError(nextError.message);
        setPhase('unavailable');
      });
    } catch (nextError) {
      setUser(null);
      setError(nextError instanceof Error ? nextError.message : 'Firebase Authentication is unavailable.');
      setPhase('unavailable');
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCsrfToken('');
      setUser(null);
      setPhase('guest');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (initialRefreshStarted.current) return;
    initialRefreshStarted.current = true;
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    if (isPagesAdminMode) {
      const firebaseUser = await loginWithFirebaseEmail(email, password);
      Object.assign(pagesAdminUser, firebaseUser);
      setUser(firebaseUser);
      setPhase('authenticated');
      return;
    }
    const session = await adminApi<{user: AdminUser; csrfToken: string}>('/login', {method: 'POST', body: JSON.stringify({email, password})});
    setCsrfToken(session.csrfToken);
    setUser(session.user);
    setPhase('authenticated');
  };

  const loginWithGoogle = async () => {
    if (!isPagesAdminMode) throw new Error('Google sign-in is only available on the GitHub Pages admin.');
    const firebaseUser = await loginWithFirebaseGoogle();
    Object.assign(pagesAdminUser, firebaseUser);
    setUser(firebaseUser);
    setPhase('authenticated');
  };

  const setup = async (values: {displayName: string; email: string; password: string; bootstrapToken?: string}) => {
    const session = await adminApi<{user: AdminUser; csrfToken: string}>('/setup', {method: 'POST', body: JSON.stringify(values)});
    setCsrfToken(session.csrfToken);
    setUser(session.user);
    setPhase('authenticated');
  };

  const logout = async () => {
    if (isPagesAdminMode) {
      await logoutFirebaseAdmin();
      setUser(null);
      setPhase('guest');
      return;
    }
    await adminApi('/logout', {method: 'POST'});
    setCsrfToken('');
    setUser(null);
    setPhase('guest');
  };

  const value = useMemo(() => ({phase, user, error, requiresBootstrapToken, refresh, login, loginWithGoogle, setup, logout}), [phase, user, error, requiresBootstrapToken, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
