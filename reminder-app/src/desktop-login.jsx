import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../src/firebase.js';
import { googleLoginError } from '../../src/platform.js';
import '../../src/index.css';

export default function DesktopLogin() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('登入後會自動回到 Windows 的捷徑與提醒。');
  const [done, setDone] = useState(false);
  async function login() {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.idToken && !credential?.accessToken) throw new Error('No Google credential');
      const response = await fetch('/desktop-auth/callback', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${location.hash.slice(1)}` },
        body: JSON.stringify({ idToken: credential.idToken, accessToken: credential.accessToken }),
      });
      if (!response.ok) throw new Error('The desktop login session expired');
      setDone(true);
      setMessage('Google 登入已完成，可以關閉此頁並回到 Windows 工具。');
    } catch (error) { setMessage(googleLoginError(error)); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg"><h1 className="text-2xl font-bold text-slate-900">捷徑與提醒</h1><p className="my-6 text-sm leading-relaxed text-slate-500" role="status">{message}</p>{!done && <button disabled={busy} onClick={login} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Google 登入中…' : '使用 Google 帳號登入'}</button>}</section></main>;
}
