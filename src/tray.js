'use strict';

const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { getSetting, setSetting } = require('./store');
const { INTERVAL_OPTIONS, reschedule, sendNotification } = require('./notifications');

let tray = null;
let _openWindow = null;

function init(openWindowFn) {
  _openWindow = openWindowFn;
}

function setInterval(minutes) {
  setSetting('notificationInterval', minutes);
  reschedule();
  rebuild();
}

function sendTestNotification() {
  sendNotification('☀️ Test notification', 'Notifications are working.', 'checkin');
}

function rebuild() {
  const current = getSetting('notificationInterval');

  const intervalSubmenu = INTERVAL_OPTIONS.map(opt => ({
    label:   opt.label,
    type:    'radio',
    checked: current === opt.minutes,
    click:   () => setInterval(opt.minutes),
  }));

  const menu = Menu.buildFromTemplate([
    { label: 'Open Planner', click: () => _openWindow('planner') },
    { label: 'Check In',     click: () => _openWindow('checkin') },
    { type: 'separator' },
    { label: 'Notifications', submenu: intervalSubmenu },
    { label: 'Send Test Notification', click: () => sendTestNotification() },
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