const { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, powerMonitor, Tray, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startGoogleLogin } = require('./google-login.cjs');

let mainWindow;
let tray;
let entries = [];
let quitting = false;
let timer;
let scheduleModel;
let dataPath;
let login;

function openWebsite(url) {
  try {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol)) shell.openExternal(parsed.href).catch(() => {});
  } catch { /* 無效或不支援的連結不交給作業系統。 */ }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.setAppUserModelId('com.jush.remember');
  app.on('second-instance', () => showWindow());
  app.on('before-quit', () => { quitting = true; clearInterval(timer); });
  app.on('window-all-closed', () => { /* Windows 保持背景排程；由通知區選單結束。 */ });
  app.whenReady().then(start).catch(error => {
    console.error('Unable to start reminder application:', error.message);
    app.quit();
  });
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function persist() {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  const temporary = `${dataPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(entries), { mode: 0o600 });
  fs.renameSync(temporary, dataPath);
}

function notify(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, icon: path.join(__dirname, 'tray.png') });
  notification.on('click', showWindow);
  notification.show();
}

function tick() {
  const { due, next } = scheduleModel.deliverDue(entries);
  if (!due.length) return;
  // 先保存下一次時間，重新啟動時不重複送出已派送的通知。
  entries = next;
  persist();
  for (const { task } of due) notify(`捷徑與提醒 · ${task.title}`, task.dueDate ? `到期日 ${task.dueDate}。完成後請在清單勾選。` : '完成後請在清單勾選，之後就不再提醒。');
}

function allowedSender(event) {
  const current = event.senderFrame?.url;
  return event.sender === mainWindow.webContents && current?.split('#')[0] === pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
}

async function start() {
  scheduleModel = await import('../src/desktopSchedule.js');
  dataPath = path.join(app.getPath('userData'), 'reminder-schedules.json');
  try {
    const retained = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    entries = scheduleModel.reconcileSchedules(retained.map(entry => entry.task), retained);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Saved schedules could not be read:', error.message);
  }

  mainWindow = new BrowserWindow({
    width: 1220, height: 850, minWidth: 760, minHeight: 620,
    title: '常用捷徑與提醒', backgroundColor: '#f8fafc', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openWebsite(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== pathToFileURL(path.join(__dirname, '../dist/index.html')).href) event.preventDefault();
  });
  mainWindow.on('close', event => {
    if (!quitting) { event.preventDefault(); mainWindow.hide(); }
  });

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
  tray.setToolTip('捷徑與提醒 · 背景提醒中');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '開啟捷徑與提醒', click: showWindow },
    { label: '測試提醒', click: () => notify('捷徑與提醒 · 測試提醒', '桌面通知已啟用。') },
    { type: 'separator' },
    { label: '結束程式（停止此電腦的提醒）', click: () => app.quit() },
  ]));
  tray.on('double-click', showWindow);
  if (process.platform === 'win32' && app.isPackaged) app.setLoginItemSettings({ openAtLogin: true, args: ['--background'] });

  ipcMain.handle('reminders:schedule', (event, tasks) => {
    if (!allowedSender(event)) throw new Error('Unauthorized reminder source');
    entries = scheduleModel.reconcileSchedules(tasks, entries);
    persist();
    tick();
    return { scheduled: entries.length };
  });
  ipcMain.handle('reminders:test', event => {
    if (!allowedSender(event)) throw new Error('Unauthorized reminder source');
    notify('捷徑與提醒 · 測試提醒', '關閉視窗後仍會在背景提醒。');
    return { sent: Notification.isSupported() };
  });
  ipcMain.handle('google:login', async event => {
    if (!allowedSender(event)) throw new Error('Unauthorized login source');
    if (login) throw new Error('Google login is already running');
    login = startGoogleLogin({ directory: path.join(__dirname, '../dist'), openExternal: url => shell.openExternal(url) });
    try { const result = await login; showWindow(); return result; }
    finally { login = null; }
  });

  await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  if (!process.argv.includes('--background')) showWindow();
  tick();
  timer = setInterval(tick, 15000);
  powerMonitor.on('resume', tick);
  app.on('activate', showWindow);
}
