'use strict';

import Store from 'electron-store';
import { Task } from '../types';

/**
 * Migrates Saturday and Sunday tasks into the new Weekend key format.
 * Saturday/Sunday: YYYY-MM-DD
 * Weekend: YYYY-Www-WE
 */
export function migrateWeekendMerge(store: Store<any>): void {
  const days: Record<string, Task[]> = store.get('days', {});
  const migratedDays: Record<string, Task[]> = { ...days };
  let migrationNeeded = false;

  const dayKeys = Object.keys(days);
  for (const dayKey of dayKeys) {
    // Regex for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      const [y, m, d] = dayKey.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      const dayOfWeek = date.getUTCDay();

      // If it's Saturday (6) or Sunday (0)
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        const { week, year } = getISOWeek(date);
        const weekendKey = `${year}-W${String(week).padStart(2, '0')}-WE`;
        
        const existingTasks = migratedDays[weekendKey] || [];
        const tasksToMove = days[dayKey];
        
        if (tasksToMove && tasksToMove.length > 0) {
          migratedDays[weekendKey] = [...existingTasks, ...tasksToMove];
          migrationNeeded = true;
        }
        
        // Remove old key
        delete migratedDays[dayKey];
      }
    }
  }

  if (migrationNeeded) {
    store.set('days', migratedDays);
    console.log('✅ Weekend task migration complete.');
  }
}

/**
 * Helper to calculate ISO week for migration logic.
 */
function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}
