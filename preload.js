const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('planner', {
  getWeekInfo: (key) => ipcRenderer.invoke('get-week-info', key),
  getPlans: (key) => ipcRenderer.invoke('get-plans', key),
  savePlans: (key, plans) => ipcRenderer.invoke('save-plans', { key, plans }),
  getWeekKeys: () => ipcRenderer.invoke('get-week-keys'),
  onSetMode: (cb) => ipcRenderer.on('set-mode', (_, mode) => cb(mode)),
});