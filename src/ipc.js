'use strict';

const { ipcMain } = require('electron');
const { getPlans, savePlans } = require('./store');
const { weekInfoFromKey, currentWeekKey, weekDayKeys, dayInfoFromKey } = require('./weekUtils');

function registerHandlers() {
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
}

module.exports = { registerHandlers };