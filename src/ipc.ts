'use strict';

import { ipcMain } from 'electron';
import { 
  getPlans, 
  savePlans, 
  addToRecycleBin, 
  getRecycleBin, 
  restoreFromRecycleBin,
  clearRecycleBin,
  getSetting, 
  setSetting 
} from './store';
import { reschedule, INTERVAL_OPTIONS } from './notifications';
import { 
  weekInfoFromKey, 
  currentWeekKey, 
  weekDayKeys, 
  dayInfoFromKey, 
  getPreviousWeekKey,
  offsetWeekKey,
  currentDayKey,
  weekKeyFromDayKey
} from './weekUtils';
import { Task, SettingOptions, WeekData } from './types';

export function registerHandlers(): void {
  // Settings handlers
  ipcMain.handle('get-setting', <K extends keyof SettingOptions>(_: any, key: K) => getSetting(key));
  ipcMain.handle('set-setting', <K extends keyof SettingOptions>(_: any, { key, value }: { key: K, value: SettingOptions[K] }) => {
    setSetting(key, value);
    if (['notificationInterval', 'workStart', 'workEnd'].includes(key as string)) {
      reschedule();
    }
    return true;
  });

  ipcMain.handle('get-interval-options', () => INTERVAL_OPTIONS);

  // Utility handlers
  ipcMain.handle('get-current-week-key', () => currentWeekKey());
  ipcMain.handle('get-offset-week-key', (_: any, { key, delta }: { key: string, delta: number }) => offsetWeekKey(key, delta));
  ipcMain.handle('get-current-day-key', () => currentDayKey());
  ipcMain.handle('get-week-key-from-day-key', (_: any, dayKey: string) => weekKeyFromDayKey(dayKey));

  // Returns week metadata + all 7 days with their tasks in one call
  ipcMain.handle('get-week', (_: any, weekKey: string): WeekData => {
    const key  = weekKey || currentWeekKey();
    const info = weekInfoFromKey(key);
    const days = weekDayKeys(key).map(dayKey => ({
      ...dayInfoFromKey(dayKey),
      plans: getPlans(dayKey),
    }));
    return { ...info, days };
  });

  ipcMain.handle('save-plans', (_: any, { dayKey, plans }: { dayKey: string, plans: Task[] }) => {
    savePlans(dayKey, plans);
    return true;
  });

  ipcMain.handle('add-to-recycle-bin', (_: any, task: Task & { dayKey: string }) => {
    addToRecycleBin(task);
    return true;
  });

  ipcMain.handle('get-recycle-bin', () => {
    return getRecycleBin();
  });

  ipcMain.handle('restore-from-recycle-bin', (_: any, index: number) => {
    restoreFromRecycleBin(index);
    return true;
  });

  ipcMain.handle('clear-recycle-bin', () => {
    clearRecycleBin();
    return true;
  });

  ipcMain.handle('get-previous-week-key', (_: any, key: string) => {
    return getPreviousWeekKey(key || currentWeekKey());
  });
}
