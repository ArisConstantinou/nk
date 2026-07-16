import {getApp, getApps, initializeApp, type FirebaseOptions} from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import type {AdminUser} from '../types';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const allowedAdminEmails = String(import.meta.env.VITE_FIREBASE_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

export const pagesFirebaseEmailPasswordEnabled = import.meta.env.VITE_FIREBASE_EMAIL_PASSWORD_ENABLED === 'true';

function configurationError() {
  const missing = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return 'Firebase Authentication is not configured for this deployment.';
  if (!allowedAdminEmails.length) return 'No Firebase administrator email is configured for this deployment.';
  return '';
}

function authInstance() {
  const problem = configurationError();
  if (problem) throw new Error(problem);
  const appName = 'nk-pages-admin';
  const app = getApps().some(candidate => candidate.name === appName) ? getApp(appName) : initializeApp(firebaseConfig, appName);
  return getAuth(app);
}

function displayName(user: User) {
  if (user.displayName?.trim()) return user.displayName.trim();
  const emailName = user.email?.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return emailName || 'NK Administrator';
}

function ensureAllowed(user: User) {
  const email = user.email?.trim().toLowerCase() || '';
  if (!email || !allowedAdminEmails.includes(email)) throw new Error('This Firebase account is not authorised for the NK Electrical admin.');
}

export function firebaseUserToAdmin(user: User): AdminUser {
  ensureAllowed(user);
  const stamp = new Date().toISOString();
  return {
    id: user.uid,
    email: user.email || '',
    displayName: displayName(user),
    role: 'owner',
    active: true,
    createdAt: user.metadata.creationTime || stamp,
    updatedAt: user.metadata.lastSignInTime || stamp,
  };
}

export async function currentFirebaseAdmin() {
  const auth = authInstance();
  await auth.authStateReady();
  if (!auth.currentUser) return null;
  try {
    return firebaseUserToAdmin(auth.currentUser);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export function observeFirebaseAdmin(onUser: (user: AdminUser | null) => void, onError: (error: Error) => void) {
  let active = true;
  const auth = authInstance();
  const unsubscribe = onAuthStateChanged(auth, async user => {
    if (!active) return;
    if (!user) {
      onUser(null);
      return;
    }
    try {
      onUser(firebaseUserToAdmin(user));
    } catch (error) {
      await signOut(auth);
      if (active) onError(error instanceof Error ? error : new Error('This Firebase account is not authorised.'));
    }
  }, error => {
    if (active) onError(new Error(firebaseAuthErrorMessage(error)));
  });
  return () => {
    active = false;
    unsubscribe();
  };
}

export async function loginWithFirebaseEmail(email: string, password: string) {
  const auth = authInstance();
  await setPersistence(auth, browserLocalPersistence);
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return firebaseUserToAdmin(credential.user);
  } catch (error) {
    throw new Error(firebaseAuthErrorMessage(error));
  }
}

export async function loginWithFirebaseGoogle() {
  const auth = authInstance();
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  try {
    const credential = await signInWithPopup(auth, provider);
    return firebaseUserToAdmin(credential.user);
  } catch (error) {
    throw new Error(firebaseAuthErrorMessage(error));
  }
}

export async function logoutFirebaseAdmin() {
  await signOut(authInstance());
}

function firebaseAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(code)) return 'The email or password is incorrect.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
  if (code === 'auth/popup-blocked') return 'The browser blocked the Google sign-in window. Allow pop-ups and try again.';
  if (code === 'auth/network-request-failed') return 'Firebase could not be reached. Check the connection and try again.';
  if (code === 'auth/too-many-requests') return 'Too many sign-in attempts. Wait a moment and try again.';
  if (code === 'auth/unauthorized-domain') return 'This website has not been authorised in Firebase Authentication.';
  if (error instanceof Error && error.message) return error.message;
  return 'Firebase could not complete the sign-in request.';
}
