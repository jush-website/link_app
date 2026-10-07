import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// 沿用原捷徑系統的 default app：Google 帳號及既有瀏覽器登入不分成兩套。
const emulated = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const firebaseConfig = {
  apiKey: "AIzaSyBoJ_uCgQhXi2YvleASpBGl4G8E5g8nIUM",
  authDomain: "link-4339d.firebaseapp.com",
  projectId: "link-4339d",
  storageBucket: "link-4339d.firebasestorage.app",
  messagingSenderId: "1033240032653",
  appId: "1:1033240032653:web:949e87e2a492bfbfae79c4",
  measurementId: "G-9LVYQ90N1T"
};
const app = initializeApp(emulated ? { apiKey: 'demo-remember-key', projectId: 'demo-remember', appId: 'demo-remember-app' } : firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const appId = 'my-shortcut-app';
let guestAuthentication;
export function ensureGuestAuth() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!guestAuthentication) {
    guestAuthentication = (globalThis.__initial_auth_token ? signInWithCustomToken(auth, globalThis.__initial_auth_token) : signInAnonymously(auth)).finally(() => { guestAuthentication = null; });
  }
  return guestAuthentication;
}
export const googleWebClientId = "1033240032653-6ulnmcj5ar68hmvggejq23bjt3r8r9ad.apps.googleusercontent.com";
if (emulated) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9095', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
}
