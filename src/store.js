'use strict';

const Store = require('electron-store');

const store = new Store({
  defaults: {
    settings: {
      notificationInterval: 60,
    },
    days: {},
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

module.exports = { getSetting, setSetting, getPlans, savePlans };