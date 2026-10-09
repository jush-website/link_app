export const DEFAULT_TIME = '09:00';
// 星期採 ISO 編號：1 = 週一 … 7 = 週日，與 Android java.time.DayOfWeek 相同。
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

// 舊資料沒有 weekdays 時視為每天提醒。
export function taskWeekdays(task) {
  return task.weekdays ?? ALL_WEEKDAYS;
}

export function weekdayName(day) {
  return WEEKDAY_NAMES[day - 1];
}

export function weekdaysLabel(weekdays) {
  const days = [...weekdays].sort((a, b) => a - b);
  if (days.length === 7) return '每天';
  if (days.join() === '1,2,3,4,5') return '週一至週五';
  if (days.join() === '6,7') return '週末';
  return `每週${days.map(weekdayName).join('、')}`;
}

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// 「下週」以週一為起點，避免星期日輸入時誤判為兩週後。
export function parseNote(input, now = new Date()) {
  const text = input.trim();
  let match;
  let due = null;
  let expression = '';
  let invalid = false;
  if ((match = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) {
    expression = match[0];
    due = localDate(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`);
    invalid = !due;
  } else if ((match = text.match(/(下(?:週|周|星期)|(?:這|本)?(?:週|周|星期))([一二三四五六日天])/))) {
    expression = match[0];
    const weekday = '一二三四五六日'.indexOf(match[2] === '天' ? '日' : match[2]);
    const monday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -((now.getDay() + 6) % 7));
    due = addDays(monday, weekday + (match[1].startsWith('下') ? 7 : 0));
    if (!match[1].startsWith('下') && !/^[這本]/.test(match[1]) && dateKey(due) < dateKey(now)) due = addDays(due, 7);
  } else if ((match = text.match(/今天|明天|後天|后天/))) {
    expression = match[0];
    due = addDays(now, match[0] === '今天' ? 0 : match[0] === '明天' ? 1 : 2);
  } else if ((match = text.match(/(\d{1,2})(?:月|\/)(\d{1,2})(?:日|號)?/))) {
    expression = match[0];
    const key = year => `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    due = localDate(key(now.getFullYear()));
    if (due && dateKey(due) < dateKey(now)) due = localDate(key(now.getFullYear() + 1));
    invalid = !due;
  }
  const title = (expression && !invalid ? text.replace(expression, '').trim().replace(/^要\s*/, '') : text).replace(/^[，,：:\s]+/, '');
  return { title, note: text, dueDate: due ? dateKey(due) : '', expression, invalid };
}

export function validateTask(task) {
  if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200) throw new Error('請填寫 1–200 字的事項。');
  if (task.dueDate && !localDate(task.dueDate)) throw new Error('請填寫有效的到期日期。');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.reminderTime)) throw new Error('請選擇有效的提醒時間。');
  const weekdays = taskWeekdays(task);
  if (!Array.isArray(weekdays) || !weekdays.length || weekdays.length > 7 || new Set(weekdays).size !== weekdays.length || !weekdays.every(day => Number.isInteger(day) && day >= 1 && day <= 7)) throw new Error('請至少選擇一個提醒的星期。');
  if (!localDate(task.anchorDate)) throw new Error('提醒起始日期無效。');
  return task;
}

// 使用日曆日計算，避免跨夏令時間時把「每天」變成固定 24 小時。
export function nextReminder(task, now = new Date()) {
  if (task.completed) return null;
  validateTask(task);
  const [hour, minute] = task.reminderTime.split(':').map(Number);
  const weekdays = taskWeekdays(task);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(today, offset);
    date.setHours(hour, minute, 0, 0);
    if (date > now && weekdays.includes(date.getDay() || 7)) return date;
  }
  return null;
}

export function reminderSeries(task, now = new Date(), count = 60) {
  const dates = [];
  for (let next = nextReminder(task, now); next && dates.length < count; next = nextReminder(task, next)) dates.push(next);
  return dates;
}

export function reminderBody(task) {
  return `${task.dueDate ? `到期日 ${task.dueDate}。` : ''}${weekdaysLabel(taskWeekdays(task))} ${task.reminderTime} 提醒，完成後停止。`;
}

export function dueLabel(task, now = new Date()) {
  if (!task.dueDate) return '未指定到期日';
  const today = dateKey(now);
  if (task.dueDate === today) return '今天到期';
  if (task.dueDate < today) return '已過期 · 繼續提醒';
  return `${task.dueDate.slice(5).replace('-', '/')} 到期`;
}
