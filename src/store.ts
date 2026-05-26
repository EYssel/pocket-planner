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
  recurringGenerations: Record<string, Record<string, string[]>>;
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
      recurringGenerations: {},
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
  let result = val === undefined ? DEFAULT_SETTINGS[key] : val;
  if (key === 'quickAddShortcut' && typeof result === 'string') {
    result = result
      .replace(/\bMinus\b/g, '-')
      .replace(/\bEqual\b/g, '=') as any;
  }
  return result as SettingOptions[K];
}

export function setSetting<K extends keyof SettingOptions>(key: K, value: SettingOptions[K]): void {
  let val = value;
  if (key === 'quickAddShortcut' && typeof val === 'string') {
    val = val
      .replace(/\bMinus\b/g, '-')
      .replace(/\bEqual\b/g, '=') as any;
  }
  store.set(`settings.${key}` as any, val);
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
  
  // Get or initialize the generation record for this week (weekKey -> templateId -> array of dayKeys)
  const generations = store.get(`recurringGenerations.${weekKey}` as any, {}) as Record<string, string[]>;
  let generationsChanged = false;

  // Load plans for all days in the week to avoid repetitive file reads
  const plansMap: Record<string, Task[]> = {};
  dayKeys.forEach(dayKey => {
    plansMap[dayKey] = getPlans(dayKey);
  });

  const changedDays = new Set<string>();

  templates.forEach(template => {
    template.days.forEach(dayNum => {
      const dayKey = dayKeys[dayNum - 1];
      if (!dayKey) return;

      const templateGens = generations[template.id] || [];
      const alreadyGenerated = templateGens.includes(dayKey);

      if (!alreadyGenerated) {
        const existsOnDay = plansMap[dayKey].some(p => p.recurringId === template.id);
        if (!existsOnDay) {
          plansMap[dayKey].push({
            text: template.text,
            done: false,
            recurringId: template.id
          });
          changedDays.add(dayKey);
        }

        if (!generations[template.id]) {
          generations[template.id] = [];
        }
        generations[template.id].push(dayKey);
        generationsChanged = true;
      }
    });
  });

  changedDays.forEach(dayKey => {
    savePlans(dayKey, plansMap[dayKey]);
  });

  if (generationsChanged) {
    store.set(`recurringGenerations.${weekKey}` as any, generations);
  }
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

  const { dayKey, text, done, notes, recurringId } = task;
  const plans = getPlans(dayKey);
  plans.push({ text, done, notes, recurringId });
  savePlans(dayKey, plans);
  store.set('recycleBin', bin);
}

export function clearRecycleBin(): void {
  store.set('recycleBin', []);
}
