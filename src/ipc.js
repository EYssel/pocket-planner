'use strict';

const { ipcMain } = require('electron');
const { getPlans, savePlans, getWeekKeys } = require('./store');
const { weekInfoFromKey, currentWeekKey } = require('./weekUtils');

function registerHandlers() {
  ipcMain.handle('get-week-info', (_, key) => {
    return weekInfoFromKey(key || currentWeekKey());
  });

  ipcMain.handle('get-plans', (_, key) => {
    return getPlans(key || currentWeekKey());
  });

  ipcMain.handle('save-plans', (_, { key, plans }) => {
    savePlans(key, plans);
    return true;
  });

  ipcMain.handle('get-week-keys', () => {
    return getWeekKeys();
  });
}

module.exports = { registerHandlers };
