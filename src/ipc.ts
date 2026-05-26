'use strict';

import { ipcMain, app, clipboard, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { RecurringTask } from './types';
import { 
  store,
  getPlans, 
  savePlans, 
  addToRecycleBin, 
  getRecycleBin, 
  restoreFromRecycleBin,
  clearRecycleBin,
  getSetting, 
  setSetting,
  getRecurringTasks,
  saveRecurringTask,
  deleteRecurringTask,
  generateRecurringTasks
} from './store';
import { reschedule, triggerManualNotification, INTERVAL_OPTIONS } from './notifications';
import { updateTooltip } from './tray';
import { updateProgress, reRegisterQuickAddShortcut, closeQuickAddWindow, getMainWindow } from './window';
import { initMenu } from './menu';
import { 
  weekInfoFromKey, 
  currentWeekKey, 
  weekDayKeys, 
  dayInfoFromKey, 
  getPreviousWeekKey,
  offsetWeekKey,
  currentDayKey,
  weekKeyFromDayKey,
  getPreviousWorkingDayKey,
  offsetDayKeyByWeeks,
  getFirstDayOfWeek,
  getLastDayOfWeek,
  parseWeekKey
} from './weekUtils';
import { Task, SettingOptions, WeekData, SearchResult } from './types';

export function registerHandlers(): void {
  // App info
  ipcMain.handle('get-app-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
  }));

  ipcMain.handle('install-update', () => {
    global.isQuitting = true;
    autoUpdater.quitAndInstall();
  });

  // Settings handlers
  ipcMain.handle('get-setting', <K extends keyof SettingOptions>(_: any, key: K) => getSetting(key));
  ipcMain.handle('set-setting', <K extends keyof SettingOptions>(_: any, { key, value }: { key: K, value: SettingOptions[K] }) => {
    setSetting(key, value);
    if (['notificationInterval', 'workStart', 'workEnd'].includes(key as string)) {
      reschedule();
    }
    if (key === 'quickAddShortcut') {
      reRegisterQuickAddShortcut(value as string);
      initMenu();
    }
    return true;
  });

  ipcMain.handle('close-quick-add', () => {
    closeQuickAddWindow();
    return true;
  });

  ipcMain.handle('get-interval-options', () => INTERVAL_OPTIONS);

  // Utility handlers
  ipcMain.handle('get-current-week-key', () => currentWeekKey());
  ipcMain.handle('get-offset-week-key', (_: any, { key, delta }: { key: string, delta: number }) => offsetWeekKey(key, delta));
  ipcMain.handle('get-current-day-key', () => currentDayKey());
  ipcMain.handle('get-week-key-from-day-key', (_: any, dayKey: string) => weekKeyFromDayKey(dayKey));
  ipcMain.handle('get-previous-working-day-key', (_: any, dayKey: string) => {
    return getPreviousWorkingDayKey(dayKey || currentDayKey());
  });
  ipcMain.handle('offset-day-key-by-weeks', (_: any, { dayKey, delta }: { dayKey: string, delta: number }) => {
    return offsetDayKeyByWeeks(dayKey, delta);
  });
  ipcMain.handle('get-first-day-of-week', (_: any, weekKey: string) => getFirstDayOfWeek(weekKey));
  ipcMain.handle('get-last-day-of-week', (_: any, weekKey: string) => getLastDayOfWeek(weekKey));

  // Returns week metadata + all 7 days with their tasks in one call
  ipcMain.handle('get-week', (_: any, weekKey: string): WeekData => {
    const key  = weekKey || currentWeekKey();
    const info = weekInfoFromKey(key);
    const days = weekDayKeys(key).map(dayKey => ({
      ...dayInfoFromKey(dayKey),
      plans: getPlans(dayKey),
    }));
    return { ...info, days };
  });

  ipcMain.handle('save-plans', (event: any, { dayKey, plans }: { dayKey: string, plans: Task[] }) => {
    savePlans(dayKey, plans);
    const mainWin = getMainWindow();
    const isSenderMainWindow = event && event.sender && mainWin && event.sender === mainWin.webContents;
    if (mainWin && !mainWin.isDestroyed() && !isSenderMainWindow) {
      mainWin.webContents.send('plans-updated', { dayKey });
    }
    return true;
  });

  ipcMain.handle('add-to-recycle-bin', (_: any, task: Task & { dayKey: string }) => {
    addToRecycleBin(task);
    return true;
  });

  ipcMain.handle('get-recycle-bin', () => {
    return getRecycleBin();
  });

  ipcMain.handle('get-recurring-tasks', () => {
    return getRecurringTasks();
  });

  ipcMain.handle('save-recurring-task', (_: any, task: RecurringTask) => {
    saveRecurringTask(task);
    return true;
  });

  ipcMain.handle('delete-recurring-task', (_: any, id: string) => {
    deleteRecurringTask(id);
    return true;
  });

  ipcMain.handle('sync-recurring-tasks', (_: any, weekKey: string) => {
    generateRecurringTasks(weekKey);
    return true;
  });

  ipcMain.handle('restore-from-recycle-bin', (_: any, index: number) => {
    restoreFromRecycleBin(index);
    return true;
  });

  ipcMain.handle('clear-recycle-bin', () => {
    clearRecycleBin();
    return true;
  });

  ipcMain.handle('get-previous-week-key', (_: any, key: string) => {
    return getPreviousWeekKey(key || currentWeekKey());
  });

  ipcMain.handle('copy-to-clipboard', (_: any, text: string) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('open-external', async (_: any, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('open-releases-page', async () => {
    await shell.openExternal('https://github.com/EYssel/planner-app/releases/latest');
    return true;
  });

  ipcMain.on('update-os-state', (_: any, { nextTaskText, doneCount, totalCount }: { nextTaskText: string | null, doneCount: number, totalCount: number }) => {
    updateTooltip(nextTaskText, doneCount, totalCount);
    updateProgress(doneCount, totalCount, nextTaskText);
  });

  ipcMain.handle('test-notification', () => {
    triggerManualNotification();
    return true;
  });

  ipcMain.handle('get-release-notes', () => {
    try {
      const possiblePaths = [
        path.join(app.getAppPath(), 'CHANGELOG.md'),
        path.join(path.dirname(app.getPath('exe')), 'CHANGELOG.md'),
        path.join(path.dirname(app.getPath('exe')), 'resources', 'CHANGELOG.md'),
        path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'CHANGELOG.md'),
      ];

      let changelogPath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          changelogPath = p;
          break;
        }
      }

      if (!changelogPath) return '';
      
      const content = fs.readFileSync(changelogPath, 'utf8');
      const version = app.getVersion();
      
      // Look for the header containing the version
      const escapedVersion = version.replace(/\./g, '\\.');
      const headerRegex = new RegExp(`#+ .*${escapedVersion}.*`, 'i');
      const match = content.match(headerRegex);
      
      if (!match || match.index === undefined) return '';
      
      const startIndex = match.index;
      const rest = content.slice(startIndex + match[0].length);
      // Find the next version header
      const nextHeaderMatch = rest.match(/#+ .*\d+\.\d+\.\d+.*/);
      
      const notes = nextHeaderMatch 
        ? rest.slice(0, nextHeaderMatch.index).trim()
        : rest.trim();
      
      // Filter sections to only include Features and Bug Fixes
      const sections = notes.split(/(?=### )/);
      const filteredSections = sections.filter(section => {
        const trimmed = section.trim();
        return trimmed.startsWith('### Features') || trimmed.startsWith('### Bug Fixes');
      });
      
      const filteredNotes = filteredSections.join('\n').trim();
      if (!filteredNotes) return '';

      // Clean up the notes: remove commit links and redundant "What's New" headers
      const cleanedNotes = filteredNotes
        .replace(/\s*\(\[([a-f0-9]+)\]\(https:\/\/github\.com\/.*?\)\)/gi, '')
        .replace(/#+ What's New( in Weekly Planner)?/gi, '')
        .trim();
      
      return cleanedNotes;
    } catch (err) {
      console.error('Failed to read release notes:', err);
      return '';
    }
  });

  ipcMain.handle('search-plans', (_: any, { query, options }: { query: string, options: { status: string; scope: string } }): SearchResult[] => {
    const queryLower = (query || '').toLowerCase().trim();
    if (!queryLower) return [];

    const days = store.get('days') || {};
    const results: SearchResult[] = [];

    for (const [dayKey, plans] of Object.entries(days)) {
      if (!Array.isArray(plans)) continue;
      
      let dayName = '';
      let dateLabel = '';
      let weekKey = '';
      try {
        const info = dayInfoFromKey(dayKey);
        dayName = info.dayName;
        dateLabel = typeof info.date === 'number' ? `${info.month} ${info.date}` : `${info.month} ${info.date}`;
        weekKey = weekKeyFromDayKey(dayKey);
      } catch (err) {
        console.error('Error parsing dayKey in search:', dayKey, err);
        continue;
      }

      plans.forEach((task, taskIndex) => {
        if (options.status === 'pending' && task.done) return;
        if (options.status === 'done' && !task.done) return;

        const textMatch = options.scope !== 'notes' && task.text.toLowerCase().includes(queryLower);
        const notesMatch = options.scope !== 'text' && !!task.notes && task.notes.toLowerCase().includes(queryLower);

        if (textMatch || notesMatch) {
          results.push({
            dayKey,
            weekKey,
            dayName,
            dateLabel,
            text: task.text,
            done: task.done,
            notes: task.notes,
            taskIndex
          });
        }
      });
    }

    results.sort((a, b) => {
      const getSortTime = (key: string) => {
        if (key.endsWith('-WE')) {
          const wk = key.replace('-WE', '');
          const { year, week } = parseWeekKey(wk);
          const jan4 = new Date(Date.UTC(year, 0, 4));
          const jan4Day = jan4.getUTCDay() || 7;
          const monday = new Date(jan4);
          monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
          return monday.getTime() + 5 * 86400000; // Saturday time
        } else {
          const [y, m, d] = key.split('-').map(Number);
          return Date.UTC(y, m - 1, d);
        }
      };
      return getSortTime(b.dayKey) - getSortTime(a.dayKey);
    });

    return results;
  });
}
