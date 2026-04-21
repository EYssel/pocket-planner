'use strict';

// NOTE: these functions are intentionally inlined from src/weekUtils.js.
// require('./src/weekUtils') is unreliable in preload across packaged builds.
// Keep in sync manually if weekUtils.js changes.

/**
 * Returns ISO 8601 week number and year for a given date.
 * Week starts Monday. Jan 4 is always in week 1.
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/**
 * Returns the number of ISO weeks in a given year (52 or 53).
 */
function weeksInYear(year) {
  const jan1  = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay();
  return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

/**
 * Returns the ISO week key string for today, e.g. "2026-W17".
 */
function currentWeekKey() {
  const { week, year } = getISOWeek(new Date());
  return formatWeekKey(year, week);
}

/**
 * Formats a year + week number into a key string.
 */
function formatWeekKey(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Parses a week key string into { year, week }.
 */
function parseWeekKey(key) {
  const [yearStr, wStr] = key.split('-W');
  return { year: parseInt(yearStr, 10), week: parseInt(wStr, 10) };
}

/**
 * Returns a new week key offset by `delta` weeks from the given key.
 */
function offsetWeekKey(key, delta) {
  let { year, week } = parseWeekKey(key);
  week += delta;
  while (week < 1)                { year--; week += weeksInYear(year); }
  while (week > weeksInYear(year)) { week -= weeksInYear(year); year++; }
  return formatWeekKey(year, week);
}

/**
 * Returns display metadata for a given week key.
 */
function weekInfoFromKey(key) {
  const { year, week } = parseWeekKey(key);
  const jan4    = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday  = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const friday  = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (d) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return {
    key,
    cwLabel:   `CW ${week}`,
    dateRange: `${fmt(monday)} – ${fmt(friday)}`,
    year,
    week,
  };
}

module.exports = {
  getISOWeek,
  weeksInYear,
  currentWeekKey,
  formatWeekKey,
  parseWeekKey,
  offsetWeekKey,
  weekInfoFromKey,
};
