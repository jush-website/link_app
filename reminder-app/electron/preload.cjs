const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminderDesktop', {
  schedule: tasks => ipcRenderer.invoke('reminders:schedule', tasks),
  testNotification: () => ipcRenderer.invoke('reminders:test'),
  googleLogin: () => ipcRenderer.invoke('google:login'),
});
