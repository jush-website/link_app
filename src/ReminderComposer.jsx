import { useLayoutEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { ALL_WEEKDAYS, weekdayName, weekdaysLabel } from '../reminder-app/src/model.js';

const presets = [['每天', ALL_WEEKDAYS], ['週一至週五', [1, 2, 3, 4, 5]]];
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
      <div className="mt-4 grid grid-cols-2 gap-4"><label className="min-w-0 text-xs font-medium text-slate-500">到期日期<input type="date" className={field + ' mt-2'} value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label><label className="min-w-0 text-xs font-medium text-slate-500">提醒時間<input type="time" className={field + ' mt-2'} value={form.reminderTime} onChange={event => setForm({ ...form, reminderTime: event.target.value })} required /></label></div>
      <div role="group" aria-labelledby="reminder-weekdays-label" className="mt-4 min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><p id="reminder-weekdays-label" className="text-xs font-medium text-slate-500">重複提醒（可複選）</p><div className="flex gap-1.5">{presets.map(([label, days]) => <button key={label} type="button" aria-pressed={form.weekdays.join() === days.join()} className={`rounded-lg border px-2.5 py-1 text-xs ${form.weekdays.join() === days.join() ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`} onClick={() => setForm({ ...form, weekdays: days })}>{label}</button>)}</div></div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">{ALL_WEEKDAYS.map(day => { const selected = form.weekdays.includes(day); return <button key={day} type="button" aria-pressed={selected} aria-label={`週${weekdayName(day)}`} className={`h-11 min-w-0 rounded-xl border text-sm font-bold ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white'}`} onClick={() => setForm({ ...form, weekdays: selected ? form.weekdays.filter(item => item !== day) : [...form.weekdays, day].sort((a, b) => a - b) })}>{weekdayName(day)}</button>; })}</div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">{form.weekdays.length ? `${weekdaysLabel(form.weekdays)} ${form.reminderTime || '--:--'} 提醒，直到完成。` : '請至少選擇一天。'}</p>
      <div className="mt-5 flex items-center justify-end gap-2"><button type="button" disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-50" onClick={onClose}>取消</button><button type="submit" disabled={busy || !ready} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} />{busy ? '儲存中…' : editing ? '儲存修改' : '記下來'}</button></div>
    </form>
  </dialog>;
}
