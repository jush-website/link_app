import { nextReminder, validateTask } from './model.js';

function fingerprint(task) {
  return JSON.stringify([task.title, task.dueDate, task.reminderTime, task.intervalDays, task.anchorDate]);
}

export function reconcileSchedules(tasks, previous, now = new Date()) {
  if (!Array.isArray(tasks) || tasks.length > 1000) throw new Error('提醒事項資料無效。');
  const old = new Map(previous.map(entry => [entry.task.id, entry]));
  return tasks.filter(task => !task.completed).map(task => {
    validateTask(task);
    const existing = old.get(task.id);
    const same = existing && fingerprint(existing.task) === fingerprint(task) && Number.isFinite(existing.nextAt);
    return { task, nextAt: same ? existing.nextAt : nextReminder(task, now).getTime() };
  });
}

export function deliverDue(entries, now = new Date()) {
  const due = entries.filter(entry => entry.nextAt <= now.getTime() && !entry.task.completed);
  const next = entries.map(entry => entry.nextAt <= now.getTime() ? { task: entry.task, nextAt: nextReminder(entry.task, now)?.getTime() } : entry).filter(entry => Number.isFinite(entry.nextAt));
  return { due, next };
}
