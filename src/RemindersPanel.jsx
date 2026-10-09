import { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, Circle, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { ALL_WEEKDAYS, DEFAULT_TIME, dateKey, dueLabel, nextReminder, parseNote, taskWeekdays, validateTask, weekdaysLabel } from '../reminder-app/src/model.js';
import { enableExactReminders, notificationStatus, requestNotifications, testNotification } from '../reminder-app/src/notifications.js';
import ReminderComposer from './ReminderComposer.jsx';
import AppDialog from './AppDialog.jsx';
import { UpdateSettings } from './AppUpdates.jsx';
import { DownloadsButton } from './ToolDownloads.jsx';
import { finishSettingsRequest, useAppUpdates, useMobileUpdateAvailable } from './updateStore.js';

const blankForm = () => ({ note: '', dueDate: '', reminderTime: DEFAULT_TIME, weekdays: ALL_WEEKDAYS });
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const { settingsRequested } = useAppUpdates();
  const updateAvailable = useMobileUpdateAvailable();
  const showSettings = settingsOpen || settingsRequested;

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
    setFormError('');
    if (parsed.invalid && !form.dueDate) { setFormError('文字中的日期不存在，請手動選擇正確日期。'); return; }
    const task = { ...(editing ?? {}), id: editing?.id ?? crypto.randomUUID(), title: editing ? form.note.trim() : parsed.title, note: form.note.trim(), dueDate: form.dueDate, reminderTime: form.reminderTime, weekdays: [...form.weekdays].sort((a, b) => a - b), intervalDays: 1, anchorDate: editing?.anchorDate ?? dateKey(now), createdAt: editing?.createdAt ?? Date.now(), completed: editing?.completed ?? false };
    try {
      validateTask(task);
      setBusy(true);
      await store.put(task);
      setFilter(editing?.completed ? 'done' : 'active');
      setForm(blankForm()); setEditing(null);
      setComposerOpen(false);
      setMessage(user ? '事項已記錄，請查看同步狀態。' : '已儲存在本機；使用 Google 登入後可匯入同步。');
    } catch (failure) { setFormError(failure.message); }
    finally { setBusy(false); }
  }

  async function action(callback) {
    try { await callback(); } catch (failure) { setMessage(failure.message || '操作未完成，請稍後重試。'); }
  }

  function edit(task) {
    setEditing(task);
    setForm({ note: task.title, dueDate: task.dueDate ?? '', reminderTime: task.reminderTime, weekdays: taskWeekdays(task) });
    setFormError('');
    setComposerOpen(true);
  }

  function add() {
    setEditing(null);
    setForm(blankForm());
    setFormError('');
    setComposerOpen(true);
  }

  return <section aria-label="待辦提醒" className="min-w-0">
    <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 sm:mb-5 sm:items-start">
      <div className="min-w-0"><h1 className="sr-only md:not-sr-only md:flex md:items-center md:gap-3 md:text-3xl md:font-extrabold md:text-slate-900"><Bell className="text-indigo-500" />待辦提醒</h1><p className="mt-2 hidden text-sm text-slate-500 md:block">使用原本的 Google 帳號同步。</p><p className="text-xs font-medium text-indigo-600 md:mt-2" role="status">{status}</p></div>
      <div className="flex shrink-0 gap-2"><DownloadsButton className={secondary + ' flex min-h-11 items-center gap-1.5 !border-indigo-200 font-bold !text-indigo-600 hover:!bg-indigo-50'} /><button type="button" className={secondary + ' relative flex min-h-11 min-w-11 items-center justify-center gap-2'} aria-label={updateAvailable ? '設定（有新版本）' : '設定'} aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /><span className="hidden sm:inline">設定</span>{updateAvailable && <span aria-hidden="true" className="absolute right-1 top-1 size-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}</button></div>
    </header>
    {(message || error) && <div role={error ? 'alert' : 'status'} className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"><span>{error || message}</span><button aria-label="關閉提醒提示" onClick={() => { setMessage(''); store.setError(''); }}><X size={16} /></button></div>}
    {!user && <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3"><p className="text-sm text-indigo-800">訪客事項保存在本機，登入 Google 即可同步。</p><button className={secondary + ' mt-2'} onClick={onGoogleLogin} disabled={loggingIn}>{loggingIn ? 'Google 登入中…' : '使用 Google 帳號登入'}</button></div>}
    {permission && permission.display !== 'granted' && <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-sm text-slate-600">允許通知以接收提醒。</p><button className={secondary} onClick={() => action(async () => setPermission(await requestNotifications()))}>允許通知</button></div>}
    {showSettings && <AppDialog title="設定" onClose={() => { setSettingsOpen(false); finishSettingsRequest(); }}><p className="mt-2 text-sm leading-relaxed text-slate-500">預設每天 09:00 提醒，直到你勾選完成。到期後仍會提醒；每件事可自訂時間與要提醒的星期。</p><div className="mt-4 flex flex-wrap gap-2"><button className={secondary} onClick={() => action(async () => setPermission(await requestNotifications()))}>允許通知</button><button className={secondary} onClick={() => action(testNotification)}>送出測試通知</button>{permission?.exact !== 'unavailable' && permission?.platform?.includes('Android') && <button className={secondary} onClick={() => action(async () => setPermission(await enableExactReminders()))}>允許精確提醒</button>}{user && <button className={secondary} disabled={!ready} onClick={() => action(async () => setMessage(`已匯入 ${await store.importLocal()} 件本機事項。`))}>匯入本機事項</button>}</div><p className="mt-4 text-xs leading-relaxed text-slate-500">{permission?.platform}。網頁關閉後不會提醒；Windows 關閉視窗後留在通知區繼續運作。Android 的本機提醒可在背景運作，另一端的完成狀態在開啟手機 App 後同步。</p><UpdateSettings /></AppDialog>}
    {composerOpen && <ReminderComposer form={form} setForm={setForm} editing={editing} parsed={parsed} updateNote={updateNote} onSave={save} onClose={() => setComposerOpen(false)} busy={busy} ready={ready} error={formError} />}
    <button type="button" disabled={!ready} onClick={add} className="fixed bottom-4 right-4 z-30 flex min-h-12 items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50"><Plus size={18} />新增事項</button>
    <div role="group" aria-label="篩選提醒" className="mb-3 flex gap-1.5 sm:gap-2">{[['active', '待辦事項', active.length], ['today', '今日與逾期', today.length], ['done', '已完成', done.length]].map(([key, label, count]) => <button key={key} type="button" aria-pressed={filter === key} className={`${secondary} min-h-11 flex-1 !px-2 text-center whitespace-nowrap sm:flex-none sm:!px-3 ${filter === key ? '!border-indigo-200 !bg-indigo-50 !text-indigo-700' : ''}`} onClick={() => setFilter(key)}>{label} {count}</button>)}</div>
    <div className="space-y-2 sm:space-y-3">{!visible.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">{filter === 'done' ? '還沒有已完成的事項。' : '目前沒有事項，先記下一件要做的事吧。'}</div> : visible.map(task => {
      let next = '請編輯並檢查提醒設定';
      try { next = nextReminder(task, now)?.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? '已停止提醒'; } catch { /* 顯示修正提示。 */ }
      return <article key={task.id} className="flex items-start gap-1.5 sm:gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5"><button disabled={!ready} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-indigo-500 hover:bg-indigo-50" aria-label={`${task.completed ? '重新開啟' : '完成'}「${task.title}」`} onClick={() => action(() => store.put({ ...task, completed: !task.completed }))}>{task.completed ? <Check size={23} /> : <Circle size={23} />}</button><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className={`min-w-0 flex-1 break-words font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h3><div className="flex shrink-0 gap-1"><button disabled={!ready} className="flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-indigo-600" aria-label={`編輯「${task.title}」`} onClick={() => edit(task)}><Pencil size={16} /></button><button disabled={!ready} className="flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={`刪除「${task.title}」`} onClick={() => { if (window.confirm(`刪除「${task.title}」？同步後所有裝置都會移除。`)) action(() => store.remove(task)); }}><Trash2 size={16} /></button></div></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><CalendarDays size={13} />{dueLabel(task, now)}</span><span>{weekdaysLabel(taskWeekdays(task))} {task.reminderTime}</span><span>{task.completed ? '已停止提醒' : `下次 ${next}`}</span></div></div></article>;
    })}</div>
  </section>;
}
