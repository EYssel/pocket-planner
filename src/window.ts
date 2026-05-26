'use strict';

import { app, BrowserWindow, globalShortcut } from 'electron';
import * as path from 'path';
import { getTaskPrefix } from './messages';
import { getSetting } from './store';

let mainWindow: BrowserWindow | null = null;
let quickAddWindow: BrowserWindow | null = null;
let lastToggleTime = 0;

// Extend the NodeJS Global interface to include isQuitting
declare global {
  var isQuitting: boolean;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createQuickAddWindow(): void {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.show();
    quickAddWindow.focus();
    return;
  }

  const fontSize = getSetting('fontSize');
  const heights = {
    'extra-small': 160,
    'small': 180,
    'medium': 200,
    'large': 240,
    'extra-large': 280,
  };
  const height = heights[fontSize] || 200;

  quickAddWindow = new BrowserWindow({
    width: 500,
    height,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#0f0f0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  quickAddWindow.loadFile(path.join(__dirname, '..', 'index.html'), { hash: 'quick-add' });

  quickAddWindow.once('ready-to-show', () => {
    if (quickAddWindow) {
      quickAddWindow.show();
      quickAddWindow.focus();
    }
  });

  quickAddWindow.on('blur', () => {
    if (quickAddWindow && !quickAddWindow.isDestroyed()) {
      quickAddWindow.close();
    }
  });

  quickAddWindow.on('closed', () => {
    quickAddWindow = null;
  });
}

export function toggleQuickAddWindow(): void {
  const now = Date.now();
  if (now - lastToggleTime < 250) {
    return;
  }
  lastToggleTime = now;

  if (quickAddWindow && !quickAddWindow.isDestroyed() && quickAddWindow.isVisible()) {
    quickAddWindow.close();
  } else {
    createQuickAddWindow();
  }
}

export function closeQuickAddWindow(): void {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.close();
  }
}


export function reRegisterQuickAddShortcut(shortcut: string): void {
  globalShortcut.unregisterAll();

  if (!shortcut || shortcut === 'None') {
    return;
  }

  const sanitizedShortcut = shortcut
    .replace(/\bMinus\b/g, '-')
    .replace(/\bEqual\b/g, '=');

  try {
    const success = globalShortcut.register(sanitizedShortcut, () => {
      toggleQuickAddWindow();
    });
    if (!success) {
      console.error(`Failed to register global shortcut: ${sanitizedShortcut}`);
    }
  } catch (err) {
    console.error(`Error registering global shortcut ${sanitizedShortcut}:`, err);
  }
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
