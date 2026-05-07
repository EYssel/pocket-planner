'use strict';

/**
 * Returns ISO 8601 week number and year for a given date.
 * Week starts Monday. Jan 4 is always in week 1.
 */
export function getISOWeek(date: Date): { week: number; year: number } {
  // Use UTC methods to ensure consistent calculation regardless of local timezone
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/**
 * Returns the number of ISO weeks in a given year (52 or 53).
 */
export function weeksInYear(year: number): number {
  const jan1  = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay();
  return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

/**
 * Returns the ISO week key string for today, e.g. "2026-W17".
 */
export function currentWeekKey(): string {
  // getISOWeek now expects a date where we care about its UTC components
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const { week, year } = getISOWeek(utcNow);
  return formatWeekKey(year, week);
}

/**
 * Formats a year + week number into a key string.
 */
export function formatWeekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Parses a week key string into { year, week }.
 */
export function parseWeekKey(key: string): { year: number; week: number } {
  const [yearStr, wStr] = key.split('-W');
  return { year: parseInt(yearStr, 10), week: parseInt(wStr, 10) };
}

/**
 * Returns a new week key offset by `delta` weeks from the given key.
 */
export function offsetWeekKey(key: string, delta: number): string {
  let { year, week } = parseWeekKey(key);
  week += delta;
  while (week < 1)                { year--; week += weeksInYear(year); }
  while (week > weeksInYear(year)) { week -= weeksInYear(year); year++; }
  return formatWeekKey(year, week);
}

/**
 * Returns the week key for the previous week.
 */
export function getPreviousWeekKey(key: string): string {
  return offsetWeekKey(key, -1);
}

export interface WeekInfo {
  key: string;
  cwLabel: string;
  dateRange: string;
  year: number;
  week: number;
}

/**
 * Returns display metadata for a given week key.
 */
export function weekInfoFromKey(key: string): WeekInfo {
  const { year, week } = parseWeekKey(key);
  const jan4    = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday  = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const sunday  = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmt = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;

  return {
    key,
    cwLabel:   `CW ${week}`,
    dateRange: `${fmt(monday)} – ${fmt(sunday)}`,
    year,
    week,
  };
}


/**
 * Returns a day key string for a given date, e.g. "2026-04-23".
 */
export function formatDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's day key. 
 * Maps Saturday/Sunday to the weekend key (-WE).
 */
export function currentDayKey(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday (local)
  
  if (day === 0 || day === 6) {
    return `${currentWeekKey()}-WE`;
  }
  
  return formatDayKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/**
 * Returns the Monday–Friday and Weekend day keys for a given week key.
 */
export function weekDayKeys(weekKey: string): string[] {
  const { year, week } = parseWeekKey(weekKey);
  const jan4    = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday  = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  
  const keys = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return formatDayKey(d);
  });
  
  // Add weekend key
  keys.push(`${weekKey}-WE`);
  return keys;
}

export interface DayInfo {
  key: string;
  dayName: string;
  date: number | string;
  month: string;
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Returns display info for a day key.
 */
export function dayInfoFromKey(dayKey: string): DayInfo {
  if (dayKey.endsWith('-WE')) {
    const weekKey = dayKey.replace('-WE', '');
    const { year, week } = parseWeekKey(weekKey);
    const jan4    = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const monday  = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
    
    const sat = new Date(monday);
    sat.setUTCDate(monday.getUTCDate() + 5);
    const sun = new Date(monday);
    sun.setUTCDate(monday.getUTCDate() + 6);
    
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const todayKey = currentDayKey();
    const isToday = formatDayKey(sat) === todayKey || formatDayKey(sun) === todayKey || dayKey === todayKey;
    
    return {
      key: dayKey,
      dayName: 'Weekend',
      date: `${sat.getUTCDate()}-${sun.getUTCDate()}`,
      month: sat.getUTCMonth() === sun.getUTCMonth() ? monthNames[sat.getUTCMonth()] : `${monthNames[sat.getUTCMonth()]}/${monthNames[sun.getUTCMonth()]}`,
      isToday,
      isWeekend: true,
    };
  }

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
    isWeekend: false,
  };
}

/**
 * Returns the week key for a given day key.
 */
export function weekKeyFromDayKey(dayKey: string): string {
  if (dayKey.endsWith('-WE')) {
    return dayKey.replace('-WE', '');
  }
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const { week, year } = getISOWeek(date);
  return formatWeekKey(year, week);
}
