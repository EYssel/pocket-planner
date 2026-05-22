'use strict';

import { app, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Configure isolated names, data paths, and AppUserModelIDs
if (!app.isPackaged) {
  const devName = 'Weekly Planner Dev';
  const devFolder = 'weekly-planner-dev';
  
  app.setName(devName);
  const userDataPath = path.join(app.getPath('appData'), devFolder);
  app.setPath('userData', userDataPath);
  app.setAppUserModelId(devName);
} else {
  const prodName = 'Weekly Planner';
  const prodFolder = 'weekly-planner';
  
  app.setName(prodName);
  const userDataPath = path.join(app.getPath('appData'), prodFolder);
  app.setPath('userData', userDataPath);
  app.setAppUserModelId(prodName);
}

import { createWindow, initSingleInstance, reRegisterQuickAddShortcut } from './src/window';
import { createTray, init as initTray } from './src/tray';
import { init as initNotifications, reschedule } from './src/notifications';
import { registerHandlers } from './src/ipc';
import { initUpdater } from './src/updater';
import { store, getSetting } from './src/store';
import { runMigrations } from './src/migrations';

import { initMenu } from './src/menu';

// Declare global isQuitting (also handled in window.ts, but let's be safe)
declare global {
  var isQuitting: boolean;
}

global.isQuitting = false;

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

  // Register global shortcut
  reRegisterQuickAddShortcut(getSetting('quickAddShortcut'));
});

app.on('before-quit', () => {
  global.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e: Electron.IpcMainEvent | any) => {
  if (!global.isQuitting) {
    e.preventDefault();
  }
});

app.on('activate', () => createWindow('planner'));
