import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, nextReminder, reminderSeries, validateTask, weekdaysLabel } from '../src/model.js';

const now = new Date(2026, 9, 7, 10, 30);
const task = { title: '訂便當', dueDate: '2026-10-12', anchorDate: '2026-10-07', reminderTime: '09:00', intervalDays: 1, completed: false };

test('下周一辨識為下一個日曆週的週一，保留原始文字', () => {
  assert.deepEqual(parseNote('下周一要訂便當', now), { title: '訂便當', note: '下周一要訂便當', dueDate: '2026-10-12', expression: '下周一', invalid: false });
  assert.equal(parseNote('下週一訂便當', new Date(2026, 9, 11)).dueDate, '2026-10-12');
  assert.equal(parseNote('下週一訂便當', new Date(2026, 9, 12)).dueDate, '2026-10-19');
});
test('相對日期、跨年日期與無日期的事項', () => {
  assert.equal(parseNote('後天繳費', now).dueDate, '2026-10-09');
  assert.equal(parseNote('明天買菜', new Date(2026, 11, 31)).dueDate, '2027-01-01');
  assert.equal(parseNote('1/2 看醫生', new Date(2026, 11, 31)).dueDate, '2027-01-02');
  assert.equal(parseNote('記得買菜', now).dueDate, '');
});
test('拒絕不存在的日期，不自動修正為另一日', () => {
  assert.equal(parseNote('2026-02-30 繳費', now).invalid, true);
  assert.equal(parseNote('2月30日繳費', now).invalid, true);
  assert.throws(() => validateTask({ ...task, dueDate: '2026-02-30' }));
});
test('提醒時間未到時當天提醒，已過則隔天提醒', () => {
  assert.equal(nextReminder(task, new Date(2026, 9, 7, 8)).getTime(), new Date(2026, 9, 7, 9).getTime());
  assert.equal(nextReminder(task, now).getTime(), new Date(2026, 9, 8, 9).getTime());
});
test('到期後仍提醒，完成後停止', () => {
  assert.equal(nextReminder(task, new Date(2026, 9, 13, 10)).getTime(), new Date(2026, 9, 14, 9).getTime());
  assert.equal(nextReminder({ ...task, completed: true }, now), null);
  assert.deepEqual(reminderSeries({ ...task, completed: true }, now), []);
});
test('只在勾選的星期提醒，生成的通知時刻不重複', () => {
  // 2026-10-07 是週三；勾選週一、三、五。
  const custom = { ...task, weekdays: [1, 3, 5] };
  const dates = reminderSeries(custom, now, 4);
  assert.deepEqual(dates.map(date => date.getTime()), [new Date(2026, 9, 9, 9), new Date(2026, 9, 12, 9), new Date(2026, 9, 14, 9), new Date(2026, 9, 16, 9)].map(Number));
  assert.equal(nextReminder(custom, new Date(2026, 9, 7, 8)).getTime(), new Date(2026, 9, 7, 9).getTime());
  assert.equal(nextReminder({ ...task, weekdays: [3] }, now).getTime(), new Date(2026, 9, 14, 9).getTime());
  assert.equal(nextReminder({ ...task, weekdays: [7] }, now).getTime(), new Date(2026, 9, 11, 9).getTime());
});
test('舊資料沒有 weekdays 時每天提醒，不再依間隔天數', () => {
  assert.equal(nextReminder({ ...task, intervalDays: 3 }, now).getTime(), new Date(2026, 9, 8, 9).getTime());
});
test('星期顯示文字', () => {
  assert.equal(weekdaysLabel([1, 2, 3, 4, 5, 6, 7]), '每天');
  assert.equal(weekdaysLabel([5, 1, 2, 3, 4]), '週一至週五');
  assert.equal(weekdaysLabel([6, 7]), '週末');
  assert.equal(weekdaysLabel([1, 3, 7]), '每週一、三、日');
});
test('拒絕空事項、非法時間與星期', () => {
  for (const invalid of [{ title: '' }, { reminderTime: '25:00' }, { weekdays: [] }, { weekdays: [0] }, { weekdays: [8] }, { weekdays: [1.5] }, { weekdays: [1, 1] }, { weekdays: '1' }]) assert.throws(() => validateTask({ ...task, ...invalid }));
});
