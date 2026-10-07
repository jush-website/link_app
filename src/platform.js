import { Capacitor, registerPlugin } from '@capacitor/core';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth, googleWebClientId } from './firebase.js';

const nativeGoogle = registerPlugin('LinkGoogleAuth');

export async function signInGoogle() {
  if (window.reminderDesktop) {
    const { idToken, accessToken } = await window.reminderDesktop.googleLogin();
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken, accessToken));
  }
  if (Capacitor.getPlatform() === 'android') {
    const { idToken } = await nativeGoogle.signIn({ webClientId: googleWebClientId });
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export function openShortcut(event, url) {
  if (Capacitor.getPlatform() !== 'android') return;
  event.preventDefault();
  nativeGoogle.openExternal({ url }).catch(() => window.alert('無法開啟網站，請確認已安裝瀏覽器。'));
}

export function googleLoginError(error) {
  const messages = {
    'auth/unauthorized-domain': '這個網站尚未允許 Google 登入，請在 Firebase 的授權網域加入目前網站；Windows 登入需允許 localhost。',
    'auth/popup-blocked': 'Google 登入視窗被擋住了，請允許彈出視窗再試。',
    'auth/network-request-failed': '目前無法連線至 Google，請確認網路後再試。',
    'google/cancelled': '已取消 Google 登入。',
    'google/configuration': 'Android 的 Google 登入尚未設定完成，請依安裝說明登記套件與簽章。',
  };
  return messages[error.code] ?? 'Google 登入未完成，請稍後再試。';
}
