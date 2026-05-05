'use strict';

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('planner', {
  // Utility methods (delegated to main process for single source of truth)
  getAppInfo:      ()           => ipcRenderer.invoke('get-app-info'),
  currentWeekKey: ()           => ipcRenderer.invoke('get-current-week-key'),
  offsetWeekKey:  (key: string, delta: number) => ipcRenderer.invoke('get-offset-week-key', { key, delta }),
  currentDayKey:  ()           => ipcRenderer.invoke('get-current-day-key'),
  weekKeyFromDayKey: (dayKey: string)  => ipcRenderer.invoke('get-week-key-from-day-key', dayKey),

  // Settings methods
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', { key, value }),
  getIntervalOptions: () => ipcRenderer.invoke('get-interval-options'),

  // Core data methods
  getWeek:    (weekKey: string)         => ipcRenderer.invoke('get-week', weekKey),
  savePlans:  (dayKey: string, plans: any[])   => ipcRenderer.invoke('save-plans', { dayKey, plans }),
  onSetMode:  (cb: (mode: string) => void)              => ipcRenderer.on('set-mode', (_: any, mode: string) => cb(mode)),

  // Support methods
  addToRecycleBin:      (task: any)  => ipcRenderer.invoke('add-to-recycle-bin', task),
  getRecycleBin:        ()      => ipcRenderer.invoke('get-recycle-bin'),
  restoreFromRecycleBin: (index: number) => ipcRenderer.invoke('restore-from-recycle-bin', index),
  clearRecycleBin:      ()      => ipcRenderer.invoke('clear-recycle-bin'),
  getPreviousWeekKey: (key: string) => ipcRenderer.invoke('get-previous-week-key', key),
});
