import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../src/firebase.js';

// 僅供本機 Auth emulator；不把測試登入或未簽章 JWT 編入正式 App。
export async function loginGoogle(email) {
  if (auth.app.options.projectId !== 'demo-remember') throw new Error('This fixture must never authenticate against production');
  const encode = value => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  const now = Math.floor(Date.now() / 1000);
  const jwt = `${encode({ alg: 'none' })}.${encode({ iss: 'https://accounts.google.com', aud: 'demo-remember', sub: `emulator-${email}`, email, email_verified: true, name: 'Google 整合測試', iat: now, exp: now + 3600 })}.`;
  return signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
}
