'use strict';

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('planner', {
  // Utility methods (delegated to main process for single source of truth)
  getAppInfo:      ()           => ipcRenderer.invoke('get-app-info'),
  getReleaseNotes: ()           => ipcRenderer.invoke('get-release-notes'),
  currentWeekKey: ()           => ipcRenderer.invoke('get-current-week-key'),
  offsetWeekKey:  (key: string, delta: number) => ipcRenderer.invoke('get-offset-week-key', { key, delta }),
  currentDayKey:  ()           => ipcRenderer.invoke('get-current-day-key'),
  weekKeyFromDayKey: (dayKey: string)  => ipcRenderer.invoke('get-week-key-from-day-key', dayKey),
  getPreviousWorkingDayKey: (dayKey: string) => ipcRenderer.invoke('get-previous-working-day-key', dayKey),
  offsetDayKeyByWeeks: (dayKey: string, delta: number) => ipcRenderer.invoke('offset-day-key-by-weeks', { dayKey, delta }),
  getFirstDayOfWeek: (weekKey: string) => ipcRenderer.invoke('get-first-day-of-week', weekKey),
  getLastDayOfWeek: (weekKey: string) => ipcRenderer.invoke('get-last-day-of-week', weekKey),

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
  onUpdateDownloaded: (cb: () => void) => ipcRenderer.on('update-downloaded', () => cb()),
  onUpdateAvailable: (cb: (version: string, isMac: boolean) => void) => ipcRenderer.on('update-available', (_: any, version: string, isMac: boolean) => cb(version, isMac)),
  onUpdateNotAvailable: (cb: (version: string) => void) => ipcRenderer.on('update-not-available', (_: any, version: string) => cb(version)),
  onCheckingForUpdates: (cb: () => void) => ipcRenderer.on('checking-for-updates', () => cb()),
  onUpdateProgress: (cb: (percent: number) => void) => ipcRenderer.on('update-progress', (_: any, percent: number) => cb(percent)),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  openReleasesPage: () => ipcRenderer.invoke('open-releases-page'),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});
