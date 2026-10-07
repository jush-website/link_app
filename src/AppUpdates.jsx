import { useCallback, useEffect, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react';
import { createUpdateChecker, UPDATE_INTERVAL } from '../reminder-app/src/updates.js';
import { installedAppInfo, openAppUpdate } from './platform.js';

export default function AppUpdates() {
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const checker = useRef(null);
  const active = useRef(false);

  const check = useCallback(async (force = false) => {
    if (!checker.current) return;
    setChecking(true);
    try {
      const next = await checker.current.check({ force });
      if (active.current) setResult(next);
    } finally { if (active.current) setChecking(false); }
  }, []);

  useEffect(() => {
    let disposed = false;
    active.current = true;
    installedAppInfo().then(value => {
      if (disposed || !value) return;
      setInfo(value);
      checker.current = createUpdateChecker(value);
      check();
    }).catch(() => {
      if (!disposed) { setInfo({ version: '', platform: 'native' }); setResult({ error: '無法讀取目前版本，請重新開啟工具。' }); }
    });
    const resume = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', event => { if (event.isActive) check(); }) : null;
    const interval = setInterval(resume, UPDATE_INTERVAL);
    return () => {
      disposed = true; active.current = false; checker.current = null;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      clearInterval(interval);
      listener?.then(value => value.remove()).catch(() => {});
    };
  }, [check]);

  if (!info) return null;
  const candidate = result?.candidate;
  const expanded = open || (!!candidate && dismissed !== candidate.version);
  return <aside aria-label="應用程式更新" className="fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)]">
    {expanded ? <section className="w-80 max-w-full rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3"><h2 className="font-bold text-slate-800">{candidate ? `有新版 ${candidate.version}` : '應用程式更新'}</h2><button aria-label="收起更新提示" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50" onClick={() => { setOpen(false); setDismissed(candidate?.version ?? ''); }}><X size={17} /></button></div>
      <p className="mt-2 text-xs text-slate-500">目前版本 {info.version || '無法讀取'}{candidate?.prerelease ? ' · 新版為測試版' : ''}</p>
      <p role="status" className="mt-3 text-sm text-slate-600">{checking ? '正在檢查新版…' : result?.error || (candidate ? '可下載新版，原本的事項與帳號資料會保留。' : result?.checkedAt ? '目前已是最新版本。' : '尚未完成版本檢查。')}</p>
      {candidate && <p className="mt-2 text-xs leading-relaxed text-slate-500">{info.platform === 'windows' ? '下載後執行下載工具、解壓新版，再結束舊程式並開啟新版。' : '下載 APK 後由 Android 確認安裝，請直接覆蓋更新。'}</p>}
      {downloadError && <p role="alert" className="mt-2 text-xs text-rose-600">{downloadError}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {candidate && <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700" onClick={async () => { try { setDownloadError(''); await openAppUpdate(candidate.url); } catch { setDownloadError('無法開啟下載，請確認已安裝瀏覽器後重試。'); } }}><ArrowDownToLine size={16} />下載更新</button>}
        <button disabled={checking || !info.version} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50" onClick={() => check(true)}><RefreshCw size={15} className={checking ? 'animate-spin' : ''} />檢查更新</button>
      </div>
    </section> : <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-lg hover:bg-slate-50" onClick={() => { setOpen(true); check(true); }}><RefreshCw size={16} />{candidate ? `新版 ${candidate.version}` : '檢查更新'}</button>}
  </aside>;
}
