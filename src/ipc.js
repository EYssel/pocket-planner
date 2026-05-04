'use strict';

const { ipcMain } = require('electron');
const { getPlans, savePlans, addToRecycleBin, getRecycleBin } = require('./store');
const { 
  weekInfoFromKey, 
  currentWeekKey, 
  weekDayKeys, 
  dayInfoFromKey, 
  getPreviousWeekKey,
  offsetWeekKey,
  currentDayKey,
  weekKeyFromDayKey
} = require('./weekUtils');

function registerHandlers() {
  // Utility handlers
  ipcMain.handle('get-current-week-key', () => currentWeekKey());
  ipcMain.handle('get-offset-week-key', (_, { key, delta }) => offsetWeekKey(key, delta));
  ipcMain.handle('get-current-day-key', () => currentDayKey());
  ipcMain.handle('get-week-key-from-day-key', (_, dayKey) => weekKeyFromDayKey(dayKey));

  // Returns week metadata + all 5 days with their tasks in one call
  ipcMain.handle('get-week', (_, weekKey) => {
    const key  = weekKey || currentWeekKey();
    const info = weekInfoFromKey(key);
    const days = weekDayKeys(key).map(dayKey => ({
      ...dayInfoFromKey(dayKey),
      plans: getPlans(dayKey),
    }));
    return { ...info, days };
  });

  ipcMain.handle('save-plans', (_, { dayKey, plans }) => {
    savePlans(dayKey, plans);
    return true;
  });

  ipcMain.handle('add-to-recycle-bin', (_, task) => {
    addToRecycleBin(task);
    return true;
  });

  ipcMain.handle('get-recycle-bin', () => {
    return getRecycleBin();
  });

  ipcMain.handle('get-previous-week-key', (_, key) => {
    return getPreviousWeekKey(key || currentWeekKey());
  });
}

module.exports = { registerHandlers };