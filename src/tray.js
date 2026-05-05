'use strict';

const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { getSetting, setSetting } = require('./store');
const { reschedule } = require('./notifications');

let tray = null;
let _openWindow = null;

function init(openWindowFn) {
  _openWindow = openWindowFn;
}

function rebuild() {
  const menu = Menu.buildFromTemplate([
    { label: 'Open Planner', click: () => _openWindow('planner') },
    { label: 'Check In',     click: () => _openWindow('checkin') },
    { type: 'separator' },
    { label: 'Quit', click: () => { global.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'icon.ico'));
  tray = new Tray(icon);
  tray.setToolTip('Weekly Planner');
  tray.on('click', () => _openWindow('planner'));
  rebuild();
}

module.exports = { init, createTray };