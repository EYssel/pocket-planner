const { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const cron = require('node-cron');
const Store = require('electron-store');

const store = new Store();

let mainWindow = null;
let tray = null;

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow(mode = 'planner') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('set-mode', mode);
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 780,
    height: 620,
    minWidth: 640,
    minHeight: 500,
    icon: path.join(__dirname, 'icon.ico'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f0f0f',
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('set-mode', mode);
  });

  mainWindow.on('close', (e) => {
    // Hide to tray instead of quitting
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────

let isQuitting = false;

const INTERVAL_OPTIONS = [
  { label: 'Every 30 minutes', minutes: 30 },
  { label: 'Every hour',       minutes: 60 },
  { label: 'Every 2 hours',    minutes: 120 },
  { label: 'Every 4 hours',    minutes: 240 },
  { label: 'Off',              minutes: 0 },
];

function getIntervalMinutes() {
  return store.get('notificationInterval', 60);
}

function setIntervalMinutes(minutes) {
  store.set('notificationInterval', minutes);
  rescheduleNotifications();
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  const current = getIntervalMinutes();

  const intervalSubmenu = INTERVAL_OPTIONS.map(opt => ({
    label: opt.label,
    type: 'radio',
    checked: current === opt.minutes,
    click: () => setIntervalMinutes(opt.minutes),
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Planner', click: () => createWindow('planner') },
    { label: 'Check In',     click: () => createWindow('checkin') },
    { type: 'separator' },
    { label: 'Notifications', submenu: intervalSubmenu },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  tray = new Tray(icon);
  tray.setToolTip('Weekly Planner');
  tray.on('click', () => createWindow('planner'));
  rebuildTrayMenu();
}

// ── Notifications ─────────────────────────────────────────────────────────────

let cronJobs = [];

function sendNotification(title, body, mode) {
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title, body, silent: false });
  notif.on('click', () => createWindow(mode));
  notif.show();
}

function rescheduleNotifications() {
  // Destroy existing jobs
  cronJobs.forEach(j => j.stop());
  cronJobs = [];

  const minutes = getIntervalMinutes();
  if (minutes === 0) return;

  // Work hours: 08:00–18:00, Mon–Fri
  const WORK_START = 8;
  const WORK_END   = 18;

  let cronExpr;
  if (minutes < 60) {
    // Sub-hour: e.g. every 30 min → "*/30 8-17 * * 1-5"
    cronExpr = `*/${minutes} ${WORK_START}-${WORK_END - 1} * * 1-5`;
  } else {
    // Hourly or more: e.g. every 2h → "0 8-18/2 * * 1-5"
    const hours = minutes / 60;
    cronExpr = `0 ${WORK_START}-${WORK_END}/${hours} * * 1-5`;
  }

  const job = cron.schedule(cronExpr, () => {
    const hour = new Date().getHours();
    const isMonday = new Date().getDay() === 1;
    const isFirstFireOfDay = hour === WORK_START;

    if (isMonday && isFirstFireOfDay) {
      sendNotification('📋 Plan your week', 'Take 5 minutes to set your priorities for the week ahead.', 'planner');
    } else {
      sendNotification('☀️ Check in', 'How are your plans going?', 'checkin');
    }
  });

  cronJobs.push(job);
}

function scheduleNotifications() {
  rescheduleNotifications();
}

// ── Week helpers ──────────────────────────────────────────────────────────────

// Returns ISO week number and year for a given date (ISO 8601: week starts Monday)
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function weekKey(year, week) {
  return `weeks.${year}-W${String(week).padStart(2, '0')}`;
}

function weekInfoFromKey(key) {
  // key format: "2026-W16"
  const [yearStr, wStr] = key.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Find Monday of this ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (d) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return {
    key,
    cwLabel: `CW ${week}`,
    dateRange: `${fmt(monday)} – ${fmt(friday)}`,
    year,
    week,
  };
}

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle('get-week-info', (_, key) => {
  if (key) return weekInfoFromKey(key);
  const { week, year } = getISOWeek(new Date());
  return weekInfoFromKey(`${year}-W${String(week).padStart(2, '0')}`);
});

ipcMain.handle('get-plans', (_, key) => {
  const { week, year } = key ? (() => { const [y,w] = key.split('-W'); return { year: parseInt(y), week: parseInt(w) }; })()
                               : getISOWeek(new Date());
  const k = weekKey(year, week);
  return store.get(k, []);
});

ipcMain.handle('save-plans', (_, { key, plans }) => {
  const [yearStr, wStr] = key.split('-W');
  const k = weekKey(parseInt(yearStr), parseInt(wStr));
  store.set(k, plans);
  return true;
});

ipcMain.handle('get-week-keys', () => {
  const weeks = store.get('weeks', {});
  return Object.keys(weeks).sort();
});

// ── Single instance ───────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone launched a second instance — focus the existing window
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });
  createTray();
  createWindow('planner');
  scheduleNotifications();
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault();
});

app.on('activate', () => {
  createWindow('planner');
});