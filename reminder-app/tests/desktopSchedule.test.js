import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSchedules, deliverDue } from '../src/desktopSchedule.js';

const task = { id: 'one', title: '訂便當', dueDate: '2026-10-12', anchorDate: '2026-10-07', reminderTime: '09:00', intervalDays: 1, completed: false };
test('跨裝置重複同步不把即將觸發的通知往後移', () => {
  const first = reconcileSchedules([task], [], new Date(2026, 9, 7, 8));
  const again = reconcileSchedules([task], first, new Date(2026, 9, 7, 9, 1));
  assert.equal(again[0].nextAt, new Date(2026, 9, 7, 9).getTime());
  assert.equal(deliverDue(again, new Date(2026, 9, 7, 9, 1)).due.length, 1);
});
test('完成或刪除立即取消後續通知', () => {
  const first = reconcileSchedules([task], [], new Date(2026, 9, 7, 8));
  assert.deepEqual(reconcileSchedules([{ ...task, completed: true }], first), []);
  assert.deepEqual(reconcileSchedules([], first), []);
});
test('關機後重新啟動只補一次，避免一次彈出多天通知', () => {
  const first = reconcileSchedules([task], [], new Date(2026, 9, 7, 8));
  const result = deliverDue(first, new Date(2026, 9, 10, 12));
  assert.equal(result.due.length, 1);
  assert.equal(result.next[0].nextAt, new Date(2026, 9, 11, 9).getTime());
  assert.equal(deliverDue(result.next, new Date(2026, 9, 10, 12)).due.length, 0);
});
test('編輯提醒時間會重排', () => {
  const first = reconcileSchedules([task], [], new Date(2026, 9, 7, 8));
  const changed = reconcileSchedules([{ ...task, reminderTime: '10:00' }], first, new Date(2026, 9, 7, 8));
  assert.equal(changed[0].nextAt, new Date(2026, 9, 7, 10).getTime());
});
test('修改提醒星期會重排', () => {
  const first = reconcileSchedules([task], [], new Date(2026, 9, 7, 8));
  const changed = reconcileSchedules([{ ...task, weekdays: [5] }], first, new Date(2026, 9, 7, 8));
  assert.equal(changed[0].nextAt, new Date(2026, 9, 9, 9).getTime());
});
