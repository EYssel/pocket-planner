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

  const icon = nativeImage.createFromPath(path.join(__dirname, '..', '..', 'icon.ico'));
  tray = new Tray(icon);
  tray.setToolTip('Weekly Planner');
  tray.on('click', () => _openWindow!('planner'));
  rebuild();
}
