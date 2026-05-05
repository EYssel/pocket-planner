'use strict';

import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

/**
 * Initializes the auto-updater to check for and notify about updates.
 * This should only be called when the app is packaged.
 */
export function initUpdater(): void {
  if (!app.isPackaged) {
    return;
  }

  // Set up update events if needed (optional)
  autoUpdater.on('update-available', () => {
    console.log('Update available.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded; will install now or on next restart.');
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  // Check for updates and notify the user via system notification
  autoUpdater.checkForUpdatesAndNotify();
}

/**
 * Manually triggers an update check.
 */
export function checkForUpdates(): void {
  if (!app.isPackaged) {
    console.log('Update check skipped: App not packaged.');
    return;
  }
  autoUpdater.checkForUpdatesAndNotify();
}
