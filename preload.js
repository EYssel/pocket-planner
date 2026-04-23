'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── Week/day utilities (inlined — require is unreliable across context bridge) ─

function weeksInYear(year) {
  const jan1  = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay();
  return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

function currentWeekKey() {
  const d   = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function offsetWeekKey(key, delta) {
  const [yearStr, wStr] = key.split('-W');
  let year = parseInt(yearStr, 10);
  let week = parseInt(wStr, 10) + delta;
  while (week < 1)                 { year--; week += weeksInYear(year); }
  while (week > weeksInYear(year)) { week -= weeksInYear(year); year++; }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function currentDayKey() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Exposed API ───────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('planner', {
  currentWeekKey: ()           => currentWeekKey(),
  offsetWeekKey:  (key, delta) => offsetWeekKey(key, delta),
  currentDayKey:  ()           => currentDayKey(),

  getWeek:    (weekKey)         => ipcRenderer.invoke('get-week', weekKey),
  savePlans:  (dayKey, plans)   => ipcRenderer.invoke('save-plans', { dayKey, plans }),
  onSetMode:  (cb)              => ipcRenderer.on('set-mode', (_, mode) => cb(mode)),
});