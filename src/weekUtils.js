'use strict';

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

/**
 * Returns a day key string for a given date, e.g. "2026-04-23".
 */
function formatDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's day key.
 */
function currentDayKey() {
  const now = new Date();
  return formatDayKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/**
 * Returns the Monday–Friday day keys for a given week key.
 */
function weekDayKeys(weekKey) {
  const { year, week } = parseWeekKey(weekKey);
  const jan4    = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday  = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return formatDayKey(d);
  });
}

/**
 * Returns display info for a day key.
 */
function dayInfoFromKey(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    key:      dayKey,
    dayName:  dayNames[date.getUTCDay()],
    date:     date.getUTCDate(),
    month:    monthNames[date.getUTCMonth()],
    isToday:  dayKey === currentDayKey(),
    isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
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
  formatDayKey,
  currentDayKey,
  weekDayKeys,
  dayInfoFromKey,
};