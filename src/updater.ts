'use strict';

import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';

/**
 * Initializes the auto-updater to check for and notify about updates.
 * This should only be called when the app is packaged.
 */
export function initUpdater(): void {
  if (!app.isPackaged) {
    return;
  }

  // Set up update events if needed (optional)
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-available', info.version);
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`Download progress: ${percent}%`);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-progress', percent);
    });
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded; will install now or on next restart.');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded');
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  // Check for updates (no system notification)
  autoUpdater.checkForUpdates();
}

/**
 * Manually triggers an update check.
 */
export function checkForUpdates(): void {
  if (!app.isPackaged) {
    console.log('Update check skipped: App not packaged.');
    return;
  }
  autoUpdater.checkForUpdates();
}
