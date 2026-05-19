'use strict';

import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, shell } from 'electron';

/**
 * Initializes the auto-updater to check for and notify about updates.
 * This should only be called when the app is packaged.
 */
export function initUpdater(): void {
  if (!app.isPackaged) {
    return;
  }

  // Disable auto-download on macOS because unsigned apps cannot be auto-updated
  if (process.platform === 'darwin') {
    autoUpdater.autoDownload = false;
  }

  // Set up update events if needed (optional)
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-available', info.version, process.platform === 'darwin');
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-not-available', info.version);
    });
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('checking-for-updates');
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

/**
 * Opens the releases page in the user's default browser.
 */
export function openReleasesPage(): void {
  shell.openExternal('https://github.com/EYssel/planner-app/releases/latest');
}
