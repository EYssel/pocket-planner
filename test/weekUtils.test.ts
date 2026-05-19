'use strict';

import {
  formatWeekKey,
  parseWeekKey,
  offsetWeekKey,
  getISOWeek,
  weeksInYear,
  getPreviousWeekKey,
  weekInfoFromKey,
  formatDayKey,
  weekDayKeys,
  dayInfoFromKey,
  weekKeyFromDayKey,
} from '../src/weekUtils';

describe('weekUtils', () => {
  describe('formatWeekKey', () => {
    test('should format year and week correctly', () => {
      expect(formatWeekKey(2026, 17)).toBe('2026-W17');
      expect(formatWeekKey(2026, 5)).toBe('2026-W05');
    });
  });

  describe('parseWeekKey', () => {
    test('should parse week key string correctly', () => {
      expect(parseWeekKey('2026-W17')).toEqual({ year: 2026, week: 17 });
      expect(parseWeekKey('2026-W05')).toEqual({ year: 2026, week: 5 });
    });
  });

  describe('offsetWeekKey', () => {
    test('should offset forward within the same year', () => {
      expect(offsetWeekKey('2026-W17', 1)).toBe('2026-W18');
    });

    test('should offset backward within the same year', () => {
      expect(offsetWeekKey('2026-W17', -1)).toBe('2026-W16');
    });

    test('should handle year rollover forward', () => {
      // 2025 has 52 weeks
      expect(offsetWeekKey('2025-W52', 1)).toBe('2026-W01');
      // 2026 has 53 weeks
      expect(offsetWeekKey('2026-W53', 1)).toBe('2027-W01');
    });

    test('should handle year rollover backward', () => {
      expect(offsetWeekKey('2026-W01', -1)).toBe('2025-W52');
      expect(offsetWeekKey('2027-W01', -1)).toBe('2026-W53');
    });
  });

  describe('getISOWeek', () => {
    test('should return correct week for a specific date', () => {
      const date = new Date(Date.UTC(2026, 4, 4)); // May 4, 2026
      const { week, year } = getISOWeek(date);
      expect(week).toBe(19);
      expect(year).toBe(2026);
    });

    test('should handle end of year correctly', () => {
      const date = new Date(Date.UTC(2025, 11, 29)); // Dec 29, 2025 (Monday)
      const { week, year } = getISOWeek(date);
      expect(week).toBe(1);
      expect(year).toBe(2026);
    });
  });

  describe('weeksInYear', () => {
    test('should return 52 or 53 correctly', () => {
      expect(weeksInYear(2025)).toBe(52);
      expect(weeksInYear(2026)).toBe(53);
      expect(weeksInYear(2027)).toBe(52);
    });
  });

  describe('getPreviousWeekKey', () => {
    test('should return the previous week key', () => {
      expect(getPreviousWeekKey('2026-W01')).toBe('2025-W52');
    });
  });

  describe('weekInfoFromKey', () => {
    test('should return correct metadata for a week', () => {
      const info = weekInfoFromKey('2026-W19');
      expect(info.cwLabel).toBe('CW 19');
      expect(info.dateRange).toBe('4 May – 10 May');
      expect(info.year).toBe(2026);
      expect(info.week).toBe(19);
    });
  });

  describe('formatDayKey', () => {
    test('should format date to YYYY-MM-DD', () => {
      const date = new Date(Date.UTC(2026, 4, 4));
      expect(formatDayKey(date)).toBe('2026-05-04');
    });
  });

  describe('weekDayKeys', () => {
    test('should return 6 keys for a week (5 weekdays + 1 merged weekend)', () => {
      const days = weekDayKeys('2026-W19');
      expect(days).toHaveLength(6);
      expect(days[0]).toBe('2026-05-04'); // Monday
      expect(days[5]).toBe('2026-W19-WE'); // Weekend
    });
  });

  describe('dayInfoFromKey', () => {
    test('should return info for a weekday', () => {
      const info = dayInfoFromKey('2026-05-04');
      expect(info.dayName).toBe('Mon');
      expect(info.date).toBe(4);
      expect(info.month).toBe('May');
      expect(info.isWeekend).toBe(false);
    });

    test('should return info for a weekend', () => {
      const info = dayInfoFromKey('2026-W19-WE');
      expect(info.dayName).toBe('Weekend');
      expect(info.date).toBe('9-10');
      expect(info.isWeekend).toBe(true);
    });
  });

  describe('weekKeyFromDayKey', () => {
    test('should return the correct week key for a day', () => {
      expect(weekKeyFromDayKey('2026-05-04')).toBe('2026-W19');
      expect(weekKeyFromDayKey('2025-12-29')).toBe('2026-W01');
    });
  });
});
