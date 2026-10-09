import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { validateTask } from './model.js';

const scheduler = registerPlugin('ReminderScheduler');
const UPDATE_NOTIFICATION_ID = 2147483601;
const UPDATE_NOTIFIED_KEY = 'link-app-update-notified';
let queue = Promise.resolve();

export async function notificationStatus() {
  if (window.reminderDesktop) return { display: 'granted', exact: 'granted', platform: 'Windows 桌面背景提醒' };
  if (Capacitor.getPlatform() === 'android') {
    const { display } = await LocalNotifications.checkPermissions();
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return { display, exact: exact_alarm, platform: 'Android 系統提醒' };
  }
  return { display: typeof Notification !== 'undefined' ? Notification.permission : 'unavailable', exact: 'unavailable', platform: '瀏覽器試用 · 關閉頁面後不提醒' };
}

export async function requestNotifications() {
  if (window.reminderDesktop) return notificationStatus();
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.requestPermissions();
  } else if (typeof Notification !== 'undefined') {
    await Notification.requestPermission();
  }
  return notificationStatus();
}

export async function enableExactReminders() {
  if (Capacitor.getPlatform() === 'android') await LocalNotifications.changeExactNotificationSetting();
  return notificationStatus();
}

export function syncReminderSchedules(tasks) {
  const safe = tasks.filter(task => !task.completed).map(task => validateTask(task));
  const operation = async () => {
    if (window.reminderDesktop) return window.reminderDesktop.schedule(safe);
    if (Capacitor.getPlatform() === 'android') return scheduler.update({ tasks: safe });
    return { scheduled: 0 };
  };
  // 排程更新依序執行，避免快速完成／修改時舊排程覆蓋新排程。
  const result = queue.then(operation, operation);
  queue = result.catch(() => {});
  return result;
}

export async function testNotification() {
  if (window.reminderDesktop) {
    const result = await window.reminderDesktop.testNotification();
    if (result?.sent === false) throw new Error('此裝置無法送出系統通知，請檢查 Windows 通知設定。');
    return result;
  }
  if (Capacitor.getPlatform() === 'android') {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') throw new Error('請先允許通知。');
    await LocalNotifications.schedule({ notifications: [{ id: 2147483600, title: '捷徑與提醒 · 測試提醒', body: '通知已啟用，之後會依設定提醒你。' }] });
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('捷徑與提醒 · 測試提醒', { body: '通知已啟用。瀏覽器試用需保持頁面開啟。' });
  } else throw new Error('請先允許通知。');
}

// 每個新版只通知一次；尚未允許通知時不記錄，允許後下次檢查再通知。
export async function notifyAppUpdate(candidate) {
  if (Capacitor.getPlatform() !== 'android') return false;
  let notified = null;
  try { notified = localStorage.getItem(UPDATE_NOTIFIED_KEY); } catch { /* 無法讀取時照常通知。 */ }
  if (notified === candidate.version) return false;
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return false;
  await LocalNotifications.schedule({ notifications: [{ id: UPDATE_NOTIFICATION_ID, title: '捷徑與提醒 · 有新版本', body: `新版 ${candidate.version} 可以更新，點此開啟「設定」下載。`, extra: { kind: 'app-update' } }] });
  try { localStorage.setItem(UPDATE_NOTIFIED_KEY, candidate.version); } catch { /* 下次檢查可能再通知一次。 */ }
  return true;
}

export function onAppUpdateNotificationTap(callback) {
  return LocalNotifications.addListener('localNotificationActionPerformed', event => {
    if (event.notification?.extra?.kind === 'app-update') callback();
  });
}
