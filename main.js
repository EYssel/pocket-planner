'use strict';

const { app } = require('electron');

const { createWindow, initSingleInstance } = require('./src/window');
const { createTray, init: initTray }       = require('./src/tray');
const { init: initNotifications, reschedule } = require('./src/notifications');
const { registerHandlers }                 = require('./src/ipc');

global.isQuitting = false;

app.setAppUserModelId('Weekly Planner');

// Bail out immediately if another instance is already running
if (!initSingleInstance()) process.exit(0);

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });

  // Wire up cross-module dependency (avoids circular requires)
  initNotifications(createWindow);
  initTray(createWindow);

  registerHandlers();
  createTray();
  createWindow('planner');
  reschedule();
});

app.on('window-all-closed', (e) => {
  if (!global.isQuitting) e.preventDefault();
});

app.on('activate', () => createWindow('planner'));