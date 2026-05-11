'use strict';

import { app } from 'electron';
import * as path from 'path';

// If in development, isolate the app data and name to allow running alongside production
// This MUST run before any other project imports that might initialize the store
if (!app.isPackaged) {
  const devName = 'Weekly Planner Dev';
  app.setName(devName);
  const userDataPath = path.join(app.getPath('appData'), devName);
  app.setPath('userData', userDataPath);
  app.setAppUserModelId(devName);
} else {
  app.setAppUserModelId('Weekly Planner');
}

import { createWindow, initSingleInstance } from './src/window';
import { createTray, init as initTray } from './src/tray';
import { init as initNotifications, reschedule } from './src/notifications';
import { registerHandlers } from './src/ipc';
import { initUpdater } from './src/updater';
import { store } from './src/store';
import { runMigrations } from './src/migrations';

import { initMenu } from './src/menu';

// Bail out immediately if another instance is already running
if (!initSingleInstance()) {
  process.exit(0);
}

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });

  // Run data migrations
  runMigrations(store);

  // Wire up cross-module dependency (avoids circular requires)
  initNotifications(createWindow);
  initTray(createWindow);

  registerHandlers();
  createTray();
  initMenu();
  createWindow('planner');
  reschedule();
  initUpdater();
});

app.on('before-quit', () => {
  global.isQuitting = true;
});

app.on('window-all-closed', (e: Electron.IpcMainEvent | any) => {
  if (!global.isQuitting) {
    e.preventDefault();
  }
});

app.on('activate', () => createWindow('planner'));
