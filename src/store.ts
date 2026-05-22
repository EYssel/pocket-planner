'use strict';

import { app } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { Task, SettingOptions, RecurringTask } from './types';
import { weekDayKeys } from './weekUtils';

interface Schema {
  settings: SettingOptions;
  days: Record<string, Task[]>;
  recycleBin: (Task & { dayKey: string; deletedAt: string })[];
  recurringTasks: RecurringTask[];
}

const isDev = app ? !app.isPackaged : true;

const DEFAULT_SETTINGS: SettingOptions = {
  notificationInterval: 60,
  workStart: 8,
  workEnd: 18,
  theme: 'dark',
  fontSize: 'medium',
  doneTasksCollapsed: true,
  lastRunVersion: '0.0.0',
  quickAddShortcut: 'CommandOrControl+Shift+Space',
};

// We explicitly calculate the path to avoid initialization order issues in main.ts
const getStoreOptions = () => {
  const options: any = {
    name: isDev ? 'config-dev' : 'config',
    defaults: {
      settings: DEFAULT_SETTINGS,
      days: {},
      recycleBin: [],
      recurringTasks: [],
    },
  };

  if (isDev && app) {
    const userDataPath = path.join(app.getPath('appData'), 'weekly-planner-dev');
    options.cwd = userDataPath;
  }

  return options;
};

export const store = new Store<Schema>(getStoreOptions());

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting<K extends keyof SettingOptions>(key: K): SettingOptions[K] {
  const val = store.get(`settings.${key}` as any);
  if (val === undefined) return DEFAULT_SETTINGS[key];
  return val as SettingOptions[K];
}

export function setSetting<K extends keyof SettingOptions>(key: K, value: SettingOptions[K]): void {
  store.set(`settings.${key}` as any, value);
}

// ── Plans (day-keyed) ─────────────────────────────────────────────────────────

export function getPlans(dayKey: string): Task[] {
  return store.get(`days.${dayKey}`, []);
}

export function savePlans(dayKey: string, plans: Task[]): void {
  if (!Array.isArray(plans)) throw new Error('plans must be an array');
  const validated: Task[] = plans.map(p => ({
    text: typeof p.text === 'string' ? p.text.slice(0, 200) : '',
    done: typeof p.done === 'boolean' ? p.done : false,
    notes: typeof p.notes === 'string' ? p.notes : undefined,
    recurringId: typeof p.recurringId === 'string' ? p.recurringId : undefined,
  }));
  store.set(`days.${dayKey}`, validated);
}

// ── Recurring Tasks ───────────────────────────────────────────────────────────

export function getRecurringTasks(): RecurringTask[] {
  return store.get('recurringTasks', []);
}

export function saveRecurringTask(task: RecurringTask): void {
  const tasks = getRecurringTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx !== -1) {
    tasks[idx] = task;
  } else {
    tasks.push(task);
  }
  store.set('recurringTasks', tasks);
}

export function deleteRecurringTask(id: string): void {
  const tasks = getRecurringTasks();
  const filtered = tasks.filter(t => t.id !== id);
  store.set('recurringTasks', filtered);
}

export function generateRecurringTasks(weekKey: string): void {
  const dayKeys = weekDayKeys(weekKey);
  const templates = getRecurringTasks();

  dayKeys.forEach((dayKey, index) => {
    const dayNum = index + 1; // 1-5 for Mon-Fri, 6 for Weekend
    const applicable = templates.filter(t => t.days.includes(dayNum));
    
    if (applicable.length === 0) return;

    const currentPlans = getPlans(dayKey);
    let changed = false;

    applicable.forEach(template => {
      const exists = currentPlans.some(p => p.recurringId === template.id);
      if (!exists) {
        currentPlans.push({
          text: template.text,
          done: false,
          recurringId: template.id
        });
        changed = true;
      }
    });

    if (changed) {
      savePlans(dayKey, currentPlans);
    }
  });
}

// ── Recycle Bin ───────────────────────────────────────────────────────────────

export function getRecycleBin(): (Task & { dayKey: string; deletedAt: string })[] {
  return store.get('recycleBin', []);
}

export function addToRecycleBin(task: Task & { dayKey: string }): void {
  const bin = getRecycleBin();
  bin.push({
    ...task,
    deletedAt: new Date().toISOString(),
  });
  store.set('recycleBin', bin);
}

export function restoreFromRecycleBin(index: number): void {
  const bin = getRecycleBin();
  const [task] = bin.splice(index, 1);
  if (!task) return;

  const { dayKey, text, done, notes } = task;
  const plans = getPlans(dayKey);
  plans.push({ text, done, notes });
  savePlans(dayKey, plans);
  store.set('recycleBin', bin);
}

export function clearRecycleBin(): void {
  store.set('recycleBin', []);
}
