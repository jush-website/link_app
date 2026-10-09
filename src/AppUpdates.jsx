import { useEffect, useState } from 'react';
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react';
import { openAppUpdate } from './platform.js';
import { checkForUpdates, startUpdateChecks, useAppUpdates } from './updateStore.js';

function UpdateDetails({ info, result, checking }) {
  const [downloadError, setDownloadError] = useState('');
  const candidate = result?.candidate;
  return <>
    <p className="mt-2 text-xs text-slate-500">目前版本 {info.version || '無法讀取'}{candidate?.prerelease ? ' · 新版為測試版' : ''}</p>
    <p role="status" className="mt-3 text-sm text-slate-600">{checking ? '正在檢查新版…' : result?.error || (candidate ? '可下載新版，原本的事項與帳號資料會保留。' : result?.checkedAt ? '目前已是最新版本。' : '尚未完成版本檢查。')}</p>
    {candidate && <p className="mt-2 text-xs leading-relaxed text-slate-500">{info.platform === 'windows' ? '下載後執行下載工具、解壓新版，再結束舊程式並開啟新版。' : '下載 APK 後由 Android 確認安裝，請直接覆蓋更新。'}</p>}
    {downloadError && <p role="alert" className="mt-2 text-xs text-rose-600">{downloadError}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {candidate && <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700" onClick={async () => { try { setDownloadError(''); await openAppUpdate(candidate.url); } catch { setDownloadError('無法開啟下載，請確認已安裝瀏覽器後重試。'); } }}><ArrowDownToLine size={16} />下載更新</button>}
      <button type="button" disabled={checking || !info.version} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50" onClick={() => checkForUpdates(true)}><RefreshCw size={15} className={checking ? 'animate-spin' : ''} />檢查更新</button>
    </div>
  </>;
}

// Android 的更新放在「設定」視窗；有新版時另有系統通知與設定按鈕紅點。
export function UpdateSettings() {
  const { info, result, checking } = useAppUpdates();
  if (info?.platform !== 'android') return null;
  const candidate = result?.candidate;
  return <section aria-labelledby="app-update-title" className="mt-5 border-t border-slate-100 pt-4">
    <h3 id="app-update-title" className="font-bold text-slate-800">{candidate ? `有新版 ${candidate.version}` : '應用程式更新'}</h3>
    <UpdateDetails info={info} result={result} checking={checking} />
  </section>;
}

// Windows 保留右下角的更新提示。
export default function AppUpdates() {
  const { info, result, checking } = useAppUpdates();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState('');
  useEffect(() => startUpdateChecks(), []);

  if (!info || info.platform === 'android') return null;
  const candidate = result?.candidate;
  const expanded = open || (!!candidate && dismissed !== candidate.version);
  return <aside aria-label="應用程式更新" className="fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)]">
    {expanded ? <section className="w-80 max-w-full rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3"><h2 className="font-bold text-slate-800">{candidate ? `有新版 ${candidate.version}` : '應用程式更新'}</h2><button aria-label="收起更新提示" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50" onClick={() => { setOpen(false); setDismissed(candidate?.version ?? ''); }}><X size={17} /></button></div>
      <UpdateDetails info={info} result={result} checking={checking} />
    </section> : <button aria-label={candidate ? `新版 ${candidate.version}` : '檢查更新'} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-lg hover:bg-slate-50 sm:px-4" onClick={() => { setOpen(true); checkForUpdates(true); }}><RefreshCw size={16} /><span className={candidate ? '' : 'hidden sm:inline'}>{candidate ? `新版 ${candidate.version}` : '檢查更新'}</span></button>}
  </aside>;
}
