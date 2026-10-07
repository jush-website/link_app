import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, Check, Circle, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { DEFAULT_TIME, dateKey, dueLabel, nextReminder, parseNote, validateTask } from '../reminder-app/src/model.js';
import { enableExactReminders, notificationStatus, requestNotifications, testNotification } from '../reminder-app/src/notifications.js';

const blankForm = () => ({ note: '', dueDate: '', reminderTime: DEFAULT_TIME, intervalDays: 1 });
const field = 'w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white';
const secondary = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50';

export default function RemindersPanel({ store, onGoogleLogin, loggingIn }) {
  const { tasks, user, ready, status, error } = store;
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('active');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permission, setPermission] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const composer = useRef(null);

  useEffect(() => {
    let disposed = false;
    notificationStatus().then(value => { if (!disposed) setPermission(value); }).catch(() => {});
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { disposed = true; clearInterval(timer); };
  }, []);

  const active = tasks.filter(task => !task.completed);
  const done = tasks.filter(task => task.completed);
  const today = active.filter(task => task.dueDate && task.dueDate <= dateKey(now));
  const visible = [...(filter === 'done' ? done : filter === 'today' ? today : active)].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.createdAt - a.createdAt);
  const parsed = parseNote(form.note, now);

  function updateNote(note) {
    const result = parseNote(note, now);
    setForm(previous => ({ ...previous, note, dueDate: result.expression ? result.dueDate : previous.dueDate }));
  }

  async function save(event) {
    event.preventDefault();
    setMessage('');
    if (parsed.invalid && !form.dueDate) { setMessage('文字中的日期不存在，請手動選擇正確日期。'); return; }
    const task = { ...(editing ?? {}), id: editing?.id ?? crypto.randomUUID(), title: editing ? form.note.trim() : parsed.title, note: form.note.trim(), dueDate: form.dueDate, reminderTime: form.reminderTime, intervalDays: Number(form.intervalDays), anchorDate: editing?.anchorDate ?? dateKey(now), createdAt: editing?.createdAt ?? Date.now(), completed: editing?.completed ?? false };
    try {
      validateTask(task);
      setBusy(true);
      await store.put(task);
      setForm(blankForm()); setEditing(null);
      setMessage(user ? '事項已記錄，請查看同步狀態。' : '已儲存在本機；使用 Google 登入後可匯入同步。');
    } catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  }

  async function action(callback) {
    try { await callback(); } catch (failure) { setMessage(failure.message || '操作未完成，請稍後重試。'); }
  }

  function edit(task) {
    setEditing(task);
    setForm({ note: task.title, dueDate: task.dueDate ?? '', reminderTime: task.reminderTime, intervalDays: task.intervalDays });
    composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    composer.current?.querySelector('textarea')?.focus();
  }

  return <section aria-label="待辦提醒" className="min-w-0">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <div><h1 className="flex items-center gap-3 text-2xl font-extrabold text-slate-900 sm:text-3xl"><Bell className="text-indigo-500" />待辦提醒</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">和網站捷徑放在一起，使用同一個 Google 帳號同步。</p><p className="mt-2 text-xs font-medium text-indigo-600" role="status">{status}</p></div>
      <button type="button" className={secondary + ' flex items-center gap-2'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={17} />提醒設定</button>
    </header>
    {(message || error) && <div role={error ? 'alert' : 'status'} className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"><span>{error || message}</span><button aria-label="關閉提醒提示" onClick={() => { setMessage(''); store.setError(''); }}><X size={16} /></button></div>}
    {!user && <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-sm text-indigo-800">訪客事項保存在這台裝置。使用原本的 Google 帳號登入，即可與捷徑一起同步。</p><button className={secondary + ' mt-3'} onClick={onGoogleLogin} disabled={loggingIn}>{loggingIn ? 'Google 登入中…' : '使用 Google 帳號登入'}</button></div>}
    {permission && permission.display !== 'granted' && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">允許通知後，才能提醒你完成事情。</p><button className={secondary} onClick={() => action(async () => setPermission(await requestNotifications()))}>允許通知</button></div>}
    {settingsOpen && <section className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5" aria-label="提醒與同步設定"><h2 className="font-bold text-slate-800">提醒與同步設定</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">預設每天 09:00 提醒，直到你勾選完成。到期後仍會提醒；每件事可自訂時間與間隔。</p><div className="mt-4 flex flex-wrap gap-2"><button className={secondary} onClick={() => action(async () => setPermission(await requestNotifications()))}>允許通知</button><button className={secondary} onClick={() => action(testNotification)}>送出測試通知</button>{permission?.exact !== 'unavailable' && permission?.platform?.includes('Android') && <button className={secondary} onClick={() => action(async () => setPermission(await enableExactReminders()))}>允許精確提醒</button>}{user && <button className={secondary} disabled={!ready} onClick={() => action(async () => setMessage(`已匯入 ${await store.importLocal()} 件本機事項。`))}>匯入本機事項</button>}</div><p className="mt-4 text-xs leading-relaxed text-slate-500">{permission?.platform}。網頁關閉後不會提醒；Windows 關閉視窗後留在通知區繼續運作。Android 的本機提醒可在背景運作，另一端的完成狀態在開啟手機 App 後同步。</p></section>}
    <div className="mb-6 grid grid-cols-3 gap-3">{[['待完成', active.length], ['今日與逾期', today.length], ['已完成', done.length]].map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-indigo-600">{count}</p></div>)}</div>
    <form ref={composer} onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-800">{editing ? '修改提醒事項' : '記下要做的事'}</h2>{editing && <button type="button" className="text-sm text-slate-500" onClick={() => { setEditing(null); setForm(blankForm()); }}>取消編輯</button>}</div>
      <label className="sr-only" htmlFor="reminder-note">事項內容</label><textarea id="reminder-note" className={field + ' min-h-24 resize-y'} value={form.note} onChange={event => updateNote(event.target.value)} placeholder="例如：下週一要訂便當" required maxLength={400} />
      {parsed.expression && !editing && <p className="mt-2 text-xs text-indigo-600">{parsed.invalid ? '日期無效，請手動指定' : `辨識到「${parsed.expression}」，可再調整日期。`}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3"><label className="min-w-0 text-xs font-medium text-slate-500">到期日期<input type="date" className={field + ' mt-2'} value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label><label className="min-w-0 text-xs font-medium text-slate-500">提醒時間<input type="time" className={field + ' mt-2'} value={form.reminderTime} onChange={event => setForm({ ...form, reminderTime: event.target.value })} required /></label><label className="min-w-0 text-xs font-medium text-slate-500">提醒間隔天數<input type="number" className={field + ' mt-2'} min="1" max="30" value={form.intervalDays} onChange={event => setForm({ ...form, intervalDays: event.target.value })} required /></label></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">從記錄後下一個提醒時間開始，直到完成。</p><button type="submit" disabled={busy || !ready} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Plus size={16} />{busy ? '儲存中…' : editing ? '儲存修改' : '記下來'}</button></div>
    </form>
    <div role="group" aria-label="篩選提醒" className="my-6 flex flex-wrap gap-2">{[['active', '待辦事項', active.length], ['today', '今日與逾期', today.length], ['done', '已完成', done.length]].map(([key, label, count]) => <button key={key} type="button" aria-pressed={filter === key} className={`${secondary} ${filter === key ? '!border-indigo-200 !bg-indigo-50 !text-indigo-700' : ''}`} onClick={() => setFilter(key)}>{label} {count}</button>)}</div>
    <div className="space-y-3">{!visible.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">{filter === 'done' ? '還沒有已完成的事項。' : '目前沒有事項，先記下一件要做的事吧。'}</div> : visible.map(task => {
      let next = '請編輯並檢查提醒設定';
      try { next = nextReminder(task, now)?.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? '已停止提醒'; } catch { /* 顯示修正提示。 */ }
      return <article key={task.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><button disabled={!ready} className="mt-1 shrink-0 text-indigo-500" aria-label={`${task.completed ? '重新開啟' : '完成'}「${task.title}」`} onClick={() => action(() => store.put({ ...task, completed: !task.completed }))}>{task.completed ? <Check size={23} /> : <Circle size={23} />}</button><div className="min-w-0 flex-1"><h3 className={`break-words font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h3><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-1"><CalendarDays size={13} />{dueLabel(task, now)}</span><span>每 {task.intervalDays === 1 ? '' : task.intervalDays + ' '}天 {task.reminderTime}</span><span>{task.completed ? '已停止提醒' : `下次 ${next}`}</span></div></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><button disabled={!ready} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-indigo-600" aria-label={`編輯「${task.title}」`} onClick={() => edit(task)}><Pencil size={16} /></button><button disabled={!ready} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`刪除「${task.title}」`} onClick={() => { if (window.confirm(`刪除「${task.title}」？同步後所有裝置都會移除。`)) action(() => store.remove(task)); }}><Trash2 size={16} /></button></div></article>;
    })}</div>
  </section>;
}
