'use strict';

import { app } from 'electron';
import * as path from 'path';
import { createWindow, initSingleInstance } from './src/window';
import { createTray, init as initTray } from './src/tray';
import { init as initNotifications, reschedule } from './src/notifications';
import { registerHandlers } from './src/ipc';

// Declare global isQuitting (also handled in window.ts, but let's be safe)
declare global {
  var isQuitting: boolean;
}

global.isQuitting = false;

// If in development, isolate the app data and name to allow running alongside production
if (!app.isPackaged) {
  const devName = 'Weekly Planner Dev';
  app.setName(devName);
  const userDataPath = path.join(app.getPath('appData'), devName);
  app.setPath('userData', userDataPath);
  app.setAppUserModelId(devName);
} else {
  app.setAppUserModelId('Weekly Planner');
}

// Bail out immediately if another instance is already running
if (!initSingleInstance()) {
  process.exit(0);
}

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

app.on('window-all-closed', (e: Electron.IpcMainEvent | any) => {
  if (!global.isQuitting) {
    e.preventDefault();
  }
});

app.on('activate', () => createWindow('planner'));
