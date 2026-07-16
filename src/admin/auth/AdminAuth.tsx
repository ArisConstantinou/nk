import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {adminApi, setCsrfToken, setUnauthorizedHandler} from '../api';
import type {AdminUser} from '../types';
import {isPagesAdminMode, pagesAdminUser} from '../pagesMode';
import {
  currentFirebaseAdmin,
  currentFirebaseAdminIdToken,
  isFirebaseAuthConfigured,
  isFirebaseNetworkAvailable,
  isFirebaseUnavailableError,
  loginWithFirebaseEmail,
  loginWithFirebaseGoogle,
  logoutFirebaseAdmin,
  observeFirebaseAdmin,
} from './firebaseAuth';

type AuthPhase = 'loading' | 'setup' | 'guest' | 'authenticated' | 'unavailable';

type AuthContextValue = {
  phase: AuthPhase;
  user: AdminUser | null;
  error: string;
  firebaseAvailable: boolean;
  firebaseFallbackReason: string;
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
  const [firebaseAvailable, setFirebaseAvailable] = useState(() => isFirebaseAuthConfigured() && isFirebaseNetworkAvailable());
  const [firebaseFallbackReason, setFirebaseFallbackReason] = useState('');
  const [requiresBootstrapToken, setRequiresBootstrapToken] = useState(true);
  const initialRefreshStarted = useRef(false);

  const applyServerSession = useCallback((session: {user: AdminUser; csrfToken: string}) => {
    setCsrfToken(session.csrfToken);
    setUser(session.user);
    setPhase('authenticated');
  }, []);

  const exchangeFirebaseForServerSession = useCallback(async () => {
    const idToken = await currentFirebaseAdminIdToken();
    const session = await adminApi<{user: AdminUser; csrfToken: string}>('/firebase-login', {
      method: 'POST',
      body: JSON.stringify({idToken}),
    });
    applyServerSession(session);
    return session.user;
  }, [applyServerSession]);

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
    const configured = isFirebaseAuthConfigured();
    const online = isFirebaseNetworkAvailable();
    const canUseFirebase = configured && online;
    setFirebaseAvailable(canUseFirebase);
    setFirebaseFallbackReason(!configured
      ? 'Firebase is not configured on this computer. The original local login is active.'
      : !online
        ? 'No internet connection. The original local login is active.'
        : '');
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
        applyServerSession(session);
      } catch (sessionError) {
        if (sessionError instanceof Error && 'status' in sessionError && sessionError.status === 401) {
          if (canUseFirebase) {
            try {
              const firebaseUser = await currentFirebaseAdmin();
              if (firebaseUser) {
                await exchangeFirebaseForServerSession();
                setFirebaseFallbackReason('');
                return;
              }
            } catch (firebaseError) {
              setFirebaseAvailable(false);
              setFirebaseFallbackReason(`${firebaseError instanceof Error ? firebaseError.message : 'Firebase Authentication is unavailable.'} Use the original local login.`);
            }
          }
          setUser(null);
          setPhase('guest');
        } else throw sessionError;
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The admin service is unavailable.');
      setPhase('unavailable');
    }
  }, [applyServerSession, exchangeFirebaseForServerSession]);

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
    if (isPagesAdminMode) return;
    const updateFirebaseAvailability = () => {
      const configured = isFirebaseAuthConfigured();
      const online = isFirebaseNetworkAvailable();
      setFirebaseAvailable(configured && online);
      setFirebaseFallbackReason(!configured
        ? 'Firebase is not configured on this computer. The original local login is active.'
        : !online
          ? 'No internet connection. The original local login is active.'
          : '');
    };
    window.addEventListener('online', updateFirebaseAvailability);
    window.addEventListener('offline', updateFirebaseAvailability);
    return () => {
      window.removeEventListener('online', updateFirebaseAvailability);
      window.removeEventListener('offline', updateFirebaseAvailability);
    };
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
    applyServerSession(session);
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseAuthConfigured() || !isFirebaseNetworkAvailable()) {
      const message = isPagesAdminMode
        ? 'Firebase cannot be reached. Check the internet connection and try again.'
        : 'Firebase cannot be reached. Use the original local login.';
      if (!isPagesAdminMode) {
        setFirebaseAvailable(false);
        setFirebaseFallbackReason(message);
      }
      throw new Error(message);
    }
    try {
      const firebaseUser = await loginWithFirebaseGoogle();
      if (isPagesAdminMode) {
        Object.assign(pagesAdminUser, firebaseUser);
        setUser(firebaseUser);
        setPhase('authenticated');
        return;
      }
      await exchangeFirebaseForServerSession();
      setFirebaseAvailable(true);
      setFirebaseFallbackReason('');
    } catch (nextError) {
      if (!isPagesAdminMode) {
        if (isFirebaseUnavailableError(nextError)) setFirebaseAvailable(false);
        setFirebaseFallbackReason(`${nextError instanceof Error ? nextError.message : 'Firebase sign-in is unavailable.'} Use the original local login.`);
        try { await logoutFirebaseAdmin(); } catch {}
      }
      throw nextError;
    }
  };

  const setup = async (values: {displayName: string; email: string; password: string; bootstrapToken?: string}) => {
    const session = await adminApi<{user: AdminUser; csrfToken: string}>('/setup', {method: 'POST', body: JSON.stringify(values)});
    applyServerSession(session);
  };

  const logout = async () => {
    if (isPagesAdminMode) {
      await logoutFirebaseAdmin();
      setUser(null);
      setPhase('guest');
      return;
    }
    await adminApi('/logout', {method: 'POST'});
    if (isFirebaseAuthConfigured()) {
      try { await logoutFirebaseAdmin(); } catch {}
    }
    setCsrfToken('');
    setUser(null);
    setPhase('guest');
  };

  const value = useMemo(() => ({phase, user, error, firebaseAvailable, firebaseFallbackReason, requiresBootstrapToken, refresh, login, loginWithGoogle, setup, logout}), [phase, user, error, firebaseAvailable, firebaseFallbackReason, requiresBootstrapToken, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
