'use strict';

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { getTaskPrefix } from './messages';

let mainWindow: BrowserWindow | null = null;

// Extend the NodeJS Global interface to include isQuitting
declare global {
  var isQuitting: boolean;
}

export function createWindow(mode: string = 'planner'): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('set-mode', mode);
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    minWidth: 800,
    minHeight: 650,
    icon: process.platform === 'win32' ? path.join(__dirname, '..', 'icon.ico') : undefined,
    title: app.getName(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      // preload.js will be in dist/
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f0f0f',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('set-mode', mode);
    }
  });

  mainWindow.on('close', (e) => {
    if (!global.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

export function updateProgress(doneCount: number, totalCount: number, nextTaskText: string | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  let ratio = -1; // Default to hidden
  if (totalCount > 0) {
    ratio = doneCount / totalCount;
    // Clamp between 0 and 1
    ratio = Math.max(0, Math.min(1, ratio));
  }

  mainWindow.setProgressBar(ratio);

  // Update window title for better Taskbar/App Switcher integration
  let title = app.getName();
  if (nextTaskText) {
    const prefix = getTaskPrefix(doneCount, totalCount);
    const cleanTask = nextTaskText.replace(/\r?\n|\r/g, ' ').trim();
    const truncated = cleanTask.length > 50 ? cleanTask.substring(0, 47) + '...' : cleanTask;
    title += ` - ${prefix} ${truncated}`;
  } else if (totalCount > 0 && doneCount === totalCount) {
    title += ' - All tasks done!';
  }

  try {
    mainWindow.setTitle(title);
  } catch (err) {
    // Ignore title update errors
  }

  if (process.platform === 'darwin') {
    const remaining = totalCount - doneCount;
    app.setBadgeCount(remaining > 0 ? remaining : 0);
  }
}

export function initSingleInstance(): boolean {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  return true;
}
