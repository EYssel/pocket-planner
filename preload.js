'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('planner', {
  // Utility methods (delegated to main process for single source of truth)
  currentWeekKey: ()           => ipcRenderer.invoke('get-current-week-key'),
  offsetWeekKey:  (key, delta) => ipcRenderer.invoke('get-offset-week-key', { key, delta }),
  currentDayKey:  ()           => ipcRenderer.invoke('get-current-day-key'),
  weekKeyFromDayKey: (dayKey)  => ipcRenderer.invoke('get-week-key-from-day-key', dayKey),

  // Settings methods
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),

  // Core data methods
  getWeek:    (weekKey)         => ipcRenderer.invoke('get-week', weekKey),
  savePlans:  (dayKey, plans)   => ipcRenderer.invoke('save-plans', { dayKey, plans }),
  onSetMode:  (cb)              => ipcRenderer.on('set-mode', (_, mode) => cb(mode)),

  // Support methods
  addToRecycleBin:      (task)  => ipcRenderer.invoke('add-to-recycle-bin', task),
  getRecycleBin:        ()      => ipcRenderer.invoke('get-recycle-bin'),
  restoreFromRecycleBin: (index) => ipcRenderer.invoke('restore-from-recycle-bin', index),
  clearRecycleBin:      ()      => ipcRenderer.invoke('clear-recycle-bin'),
  getPreviousWeekKey:   (key)   => ipcRenderer.invoke('get-previous-week-key', key),
});
