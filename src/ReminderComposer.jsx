import { useLayoutEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';

const field = 'w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white';

export default function ReminderComposer({ form, setForm, editing, parsed, updateNote, onSave, onClose, busy, ready, error }) {
  const dialog = useRef(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const invoker = document.activeElement;
    element.showModal();
    element.querySelector('textarea')?.focus();
    return () => { element.close(); if (invoker?.isConnected) invoker.focus(); };
  }, []);

  return <dialog ref={dialog} aria-labelledby="reminder-composer-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }} className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm">
    <form onSubmit={onSave} className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="reminder-composer-title" className="text-lg font-bold">{editing ? '修改提醒事項' : '新增提醒事項'}</h2><p className="mt-1 text-xs text-slate-500">儲存後回到事項清單。</p></div><button type="button" aria-label="關閉事項表單" disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50" onClick={onClose}><X size={19} /></button></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <label className="sr-only" htmlFor="reminder-note">事項內容</label><textarea id="reminder-note" className={field + ' min-h-24 resize-y'} value={form.note} onChange={event => updateNote(event.target.value)} placeholder="例如：下週一要訂便當" required maxLength={400} />
      {parsed.expression && !editing && <p className="mt-2 text-xs text-indigo-600">{parsed.invalid ? '日期無效，請手動指定' : `辨識到「${parsed.expression}」，可再調整日期。`}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3"><label className="min-w-0 text-xs font-medium text-slate-500">到期日期<input type="date" className={field + ' mt-2'} value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label><label className="min-w-0 text-xs font-medium text-slate-500">提醒時間<input type="time" className={field + ' mt-2'} value={form.reminderTime} onChange={event => setForm({ ...form, reminderTime: event.target.value })} required /></label><label className="min-w-0 text-xs font-medium text-slate-500">提醒間隔天數<input type="number" className={field + ' mt-2'} min="1" max="30" value={form.intervalDays} onChange={event => setForm({ ...form, intervalDays: event.target.value })} required /></label></div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">從記錄後下一個提醒時間開始，直到完成。</p>
      <div className="mt-5 flex items-center justify-end gap-2"><button type="button" disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-50" onClick={onClose}>取消</button><button type="submit" disabled={busy || !ready} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} />{busy ? '儲存中…' : editing ? '儲存修改' : '記下來'}</button></div>
    </form>
  </dialog>;
}
