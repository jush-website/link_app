import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { nextReminder } from '../reminder-app/src/model.js';
import { syncReminderSchedules } from '../reminder-app/src/notifications.js';

// 放在原 App 的外層，切回捷徑頁也不會停止提醒或 Firestore 同步。
export function useReminderNotifications({ tasks, ready, setError }) {
  const current = useRef({ tasks, ready });
  useEffect(() => { current.current = { tasks, ready }; }, [tasks, ready]);

  useEffect(() => {
    syncReminderSchedules(ready ? tasks : []).catch(() => setError('系統提醒排程未更新，請檢查通知設定。'));
  }, [tasks, ready, setError]);

  useEffect(() => {
    const resume = () => {
      if (current.current.ready) syncReminderSchedules(current.current.tasks).catch(() => setError('系統提醒排程未更新。'));
    };
    const visibility = () => { if (document.visibilityState === 'visible') resume(); };
    document.addEventListener('visibilitychange', visibility);
    const nativeListener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', event => { if (event.isActive) resume(); }) : null;
    let previous = new Date();
    const fired = new Set();
    const timer = setInterval(() => {
      const now = new Date();
      if (current.current.ready && !Capacitor.isNativePlatform() && !window.reminderDesktop && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        for (const task of current.current.tasks) {
          try {
            const expected = nextReminder(task, previous);
            const key = `${task.id}:${expected?.getTime()}`;
            if (expected && expected <= now && !fired.has(key)) {
              fired.add(key);
              new Notification(`捷徑與提醒 · ${task.title}`, { body: '完成後請勾選，之後就不再提醒。' });
            }
          } catch { /* 舊資料無效時不排程；清單仍可編輯。 */ }
        }
      }
      previous = now;
    }, 10000);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      nativeListener?.then(listener => listener.remove()).catch(() => {});
    };
  }, [setError]);
}
