'use strict';

const Store = require('electron-store');
const { parseWeekKey } = require('./weekUtils');

const store = new Store({
  defaults: {
    settings: {
      notificationInterval: 60,
    },
    weeks: {},
  },
});

// ── Settings ──────────────────────────────────────────────────────────────────

function getSetting(key) {
  return store.get(`settings.${key}`);
}

function setSetting(key, value) {
  store.set(`settings.${key}`, value);
}

// ── Plans ─────────────────────────────────────────────────────────────────────

function storeKeyForWeek(weekKey) {
  return `weeks.${weekKey}`;
}

function getPlans(weekKey) {
  return store.get(storeKeyForWeek(weekKey), []);
}

function savePlans(weekKey, plans) {
  // Basic validation — ensure plans is an array of { text, done }
  if (!Array.isArray(plans)) throw new Error('plans must be an array');
  const validated = plans.map(p => ({
    text: typeof p.text === 'string' ? p.text : '',
    done: typeof p.done === 'boolean' ? p.done : false,
  }));
  store.set(storeKeyForWeek(weekKey), validated);
}

function getWeekKeys() {
  const weeks = store.get('weeks', {});
  return Object.keys(weeks).sort();
}

module.exports = { getSetting, setSetting, getPlans, savePlans, getWeekKeys };
