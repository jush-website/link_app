import { useSyncExternalStore } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createUpdateChecker, UPDATE_INTERVAL } from '../reminder-app/src/updates.js';
import { notifyAppUpdate, onAppUpdateNotificationTap } from '../reminder-app/src/notifications.js';
import { installedAppInfo } from './platform.js';

// 版本檢查只啟動一次；Windows 的浮動提示與 Android 設定視窗讀同一份狀態。
let state = { info: null, result: null, checking: false, settingsRequested: false };
let checker = null;
const listeners = new Set();
const settingsListeners = new Set();

function update(patch) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppUpdates() {
  return useSyncExternalStore(subscribe, () => state);
}

export function useMobileUpdateAvailable() {
  const { info, result } = useAppUpdates();
  return info?.platform === 'android' && !!result?.candidate;
}

export async function checkForUpdates(force = false) {
  const current = checker;
  if (!current) return;
  update({ checking: true });
  try {
    const result = await current.check({ force });
    if (checker !== current) return;
    update({ result });
    if (result?.candidate && state.info?.platform === 'android') notifyAppUpdate(result.candidate).catch(() => {});
  } finally {
    if (checker === current) update({ checking: false });
  }
}

// 點選「有新版本」通知後切到待辦提醒並開啟設定。
export function onSettingsRequest(listener) {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
}

export function finishSettingsRequest() {
  if (state.settingsRequested) update({ settingsRequested: false });
}

export function startUpdateChecks() {
  let disposed = false;
  installedAppInfo().then(info => {
    if (disposed || !info) return;
    checker = createUpdateChecker(info);
    update({ info });
    checkForUpdates();
  }).catch(() => {
    if (!disposed) update({ info: { version: '', platform: Capacitor.getPlatform() === 'android' ? 'android' : 'windows' }, result: { error: '無法讀取目前版本，請重新開啟工具。' } });
  });
  const resume = () => { if (document.visibilityState === 'visible') checkForUpdates(); };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  const native = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', event => { if (event.isActive) checkForUpdates(); }) : null;
  const tap = Capacitor.getPlatform() === 'android' ? onAppUpdateNotificationTap(() => {
    update({ settingsRequested: true });
    for (const listener of settingsListeners) listener();
  }) : null;
  const interval = setInterval(resume, UPDATE_INTERVAL);
  return () => {
    disposed = true; checker = null;
    document.removeEventListener('visibilitychange', resume);
    window.removeEventListener('focus', resume);
    window.removeEventListener('online', resume);
    clearInterval(interval);
    for (const listener of [native, tap]) listener?.then(value => value.remove()).catch(() => {});
  };
}
