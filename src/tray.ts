'use strict';

import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;
let _openWindow: ((mode?: string) => void) | null = null;

export function init(openWindowFn: (mode?: string) => void): void {
  _openWindow = openWindowFn;
}

export function rebuild(): void {
  if (!tray || !_openWindow) return;

  const menu = Menu.buildFromTemplate([
    { label: 'Open Planner', click: () => _openWindow!('planner') },
    { label: 'Check In',     click: () => _openWindow!('checkin') },
    { type: 'separator' },
    { label: 'Quit', click: () => { global.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
}

export function createTray(): void {
  if (!_openWindow) return;

  // app.getAppPath() is usually the project root in dev or the resources/app[.asar] in production
  const iconPath = path.join(app.getAppPath(), 'icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  
  if (icon.isEmpty()) {
    console.error('Failed to load tray icon from:', iconPath);
  }

  tray = new Tray(icon);
  tray.setToolTip(app.getName());
  tray.on('click', () => _openWindow!('planner'));
  rebuild();
}
