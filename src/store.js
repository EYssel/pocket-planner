'use strict';

const path = require('path');
const { app } = require('electron');
const Store = require('electron-store');

const isDev = app ? !app.isPackaged : true;

const store = new Store({
  name: isDev ? 'config-dev' : 'config',
  defaults: {
    settings: {
      notificationInterval: 60,
      theme: 'dark',
    },
    days: {},
    recycleBin: [],
  },
});

// ── Settings ──────────────────────────────────────────────────────────────────

function getSetting(key) {
  return store.get(`settings.${key}`);
}

function setSetting(key, value) {
  store.set(`settings.${key}`, value);
}

// ── Plans (day-keyed) ─────────────────────────────────────────────────────────

function getPlans(dayKey) {
  return store.get(`days.${dayKey}`, []);
}

function savePlans(dayKey, plans) {
  if (!Array.isArray(plans)) throw new Error('plans must be an array');
  const validated = plans.map(p => ({
    text: typeof p.text === 'string' ? p.text : '',
    done: typeof p.done === 'boolean' ? p.done : false,
  }));
  store.set(`days.${dayKey}`, validated);
}

// ── Recycle Bin ───────────────────────────────────────────────────────────────

function getRecycleBin() {
  return store.get('recycleBin', []);
}

function addToRecycleBin(task) {
  const bin = getRecycleBin();
  bin.push({
    ...task,
    deletedAt: new Date().toISOString(),
  });
  store.set('recycleBin', bin);
}

function restoreFromRecycleBin(index) {
  const bin = getRecycleBin();
  const [task] = bin.splice(index, 1);
  if (!task) return;

  const { dayKey, text, done } = task;
  const plans = getPlans(dayKey);
  plans.push({ text, done });
  savePlans(dayKey, plans);
  store.set('recycleBin', bin);
}

function clearRecycleBin() {
  store.set('recycleBin', []);
}

module.exports = { 
  getSetting, 
  setSetting, 
  getPlans, 
  savePlans, 
  getRecycleBin, 
  addToRecycleBin, 
  restoreFromRecycleBin, 
  clearRecycleBin 
};