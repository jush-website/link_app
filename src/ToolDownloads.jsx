import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowDownToLine, Monitor, Smartphone, X } from 'lucide-react';
import { compareVersions, RELEASES_URL, selectUpdate } from '../reminder-app/src/updates.js';

const releasesPage = 'https://github.com/jush-website/link_app/releases';
const base = version => `https://github.com/jush-website/link_app/releases/download/link-app-v${version}/`;
const knownDownloads = {
  windows: { version: '0.4.0', url: base('0.4.0') + 'Download-LinkApp-Windows.cmd' },
  android: { version: '0.5.0', url: base('0.5.0') + 'LinkApp-0.5.0-android.apk' },
};
const link = 'flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function DownloadsDialog({ onClose }) {
  const dialog = useRef(null);
  const [downloads, setDownloads] = useState(knownDownloads);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState('');

  useLayoutEffect(() => {
    const element = dialog.current;
    const invoker = document.activeElement;
    element.showModal();
    return () => { element.close(); if (invoker?.isConnected) invoker.focus(); };
  }, []);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    (async () => {
      try {
        const response = await fetch(RELEASES_URL, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) throw new Error('Release query failed');
        const releases = await response.json();
        const selected = { ...knownDownloads };
        let complete = true;
        for (const platform of ['windows', 'android']) {
          const available = selectUpdate(releases, { platform, version: '0.0.0' });
          if (available && compareVersions(available.version, knownDownloads[platform].version) >= 0) selected[platform] = available;
          else complete = false;
        }
        if (!disposed) {
          setDownloads(selected);
          if (!complete) setNotice('目前提供已發布的安裝包，其他版本可到「所有版本與說明」查看。');
        }
      } catch {
        if (!disposed) setNotice('暫時無法查詢新版，仍可下載已發布的安裝包。');
      } finally {
        clearTimeout(timer);
        if (!disposed) setChecking(false);
      }
    })();
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, []);

  return <dialog ref={dialog} aria-labelledby="tool-downloads-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm">
    <div className="p-5 sm:p-7">
      <header className="flex items-start justify-between gap-3"><div><h2 id="tool-downloads-title" className="text-xl font-extrabold">下載桌面工具與手機 App</h2><p className="mt-2 text-sm text-slate-500">使用原本的 Google 帳號，同步捷徑與待辦提醒。</p></div><button type="button" aria-label="關閉工具下載" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X size={20} /></button></header>
      <p role="status" className="mt-4 text-xs text-slate-500">{checking ? '正在查詢可下載的新版…' : notice || '已確認目前可下載的版本。'}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section aria-label="Windows 工具" className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5"><Monitor className="text-indigo-500" size={26} /><h3 className="mt-3 font-bold">Windows 桌面工具</h3><p className="mt-1 text-xs text-slate-500">Windows 10／11 · 64 位元 · {downloads.windows.version}</p><p className="mb-4 mt-3 flex-1 text-sm leading-relaxed text-slate-600">執行下載工具取得完整 ZIP，解壓縮後開啟 Remember.exe。關閉視窗後仍留在通知區提醒。</p><a className={link} href={downloads.windows.url} target="_blank" rel="noopener noreferrer"><ArrowDownToLine size={17} />下載 Windows 工具</a></section>
        <section aria-label="Android App" className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5"><Smartphone className="text-indigo-500" size={26} /><h3 className="mt-3 font-bold">Android 手機 App</h3><p className="mt-1 text-xs text-slate-500">Android 7.0 以上 · APK · {downloads.android.version}</p><p className="mb-4 mt-3 flex-1 text-sm leading-relaxed text-slate-600">下載 APK，依手機提示安裝並允許通知。更新時直接覆蓋安裝，保留原本帳號與事項；由 0.4.x 升級因更換簽章，需先解除安裝一次。</p><a className={link} href={downloads.android.url} target="_blank" rel="noopener noreferrer"><ArrowDownToLine size={17} />下載 Android APK</a></section>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">0.3.0 起可自動偵測新版。舊版需先手動更新一次；下載後由你完成安裝。</p>
      <details className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><summary className="cursor-pointer text-sm font-bold text-indigo-800">Android Google 登入設定</summary><div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600"><p>首次使用此 APK，需在原 Firebase 專案登記 Android App 的套件與簽章。設定完成後，重新開啟 App 登入。</p><p>套件名稱：<code className="select-text font-mono">com.jush.remember</code></p><p>SHA-1：<code className="block select-text break-all font-mono">5A:C8:FD:56:4D:FE:E1:60:8E:EB:6B:E9:D7:B2:58:04:3D:60:9C:D9</code></p><p>在同一 Google Cloud 專案確認 Android OAuth 用戶端使用相同套件及 SHA-1。</p><div className="flex flex-wrap gap-3"><a className="font-medium text-indigo-700 underline" href="https://console.firebase.google.com/project/link-4339d/settings/general" target="_blank" rel="noopener noreferrer">Firebase 專案設定</a><a className="font-medium text-indigo-700 underline" href="https://console.cloud.google.com/apis/credentials?project=link-4339d" target="_blank" rel="noopener noreferrer">Google Cloud 憑證</a></div></div></details>
      <a className="mt-5 inline-block text-sm font-medium text-indigo-600 underline" href={releasesPage} target="_blank" rel="noopener noreferrer">所有版本與說明</a>
    </div>
  </dialog>;
}

function canDownload() {
  return !Capacitor.isNativePlatform() && !window.reminderDesktop;
}

export function DownloadsButton({ className }) {
  const [open, setOpen] = useState(false);
  if (!canDownload()) return null;
  return <><button type="button" onClick={() => setOpen(true)} className={className}><ArrowDownToLine size={17} />下載工具</button>{open && <DownloadsDialog onClose={() => setOpen(false)} />}</>;
}

// 待辦提醒頁的下載工具放在頂列，其他畫面維持右下角浮動按鈕。
export default function ToolDownloads() {
  if (!canDownload()) return null;
  return <aside aria-label="工具下載" className="fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)]"><DownloadsButton className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 shadow-lg hover:bg-indigo-50" /></aside>;
}
