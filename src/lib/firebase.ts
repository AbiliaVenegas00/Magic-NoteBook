import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Add Google Calendar OAuth scope for events synchronization
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

GOOGLE_CALENDAR_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

// Cache the access token in memory (never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Clear access token on sign-out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

/**
 * Signs in with Google and caches the OAuth access token for Google Calendar API.
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string | null }> => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  if (token) {
    cachedAccessToken = token;
  }
  return { user: result.user, accessToken: token };
};

/**
 * Signs out the current user and clears memory cache.
 */
export const signOutUser = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Initialize Firestore with robust multi-tab offline persistence
const firestoreDbId = 
  (firebaseConfigData as Record<string, any>).firestoreDatabaseId || 
  'ai-studio-assignmenttaskca-b5efeee0-0609-4880-8c7c-a2b8352b5e94';

function initializeAppFirestore() {
  try {
    if (typeof window !== 'undefined') {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, firestoreDbId);
    }
  } catch {
    // Fallback if already initialized or in test environment
  }
  return firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
}

export const db = initializeAppFirestore();

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
