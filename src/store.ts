'use strict';

import { app } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { Task, SettingOptions } from './types';

interface Schema {
  settings: SettingOptions;
  days: Record<string, Task[]>;
  recycleBin: (Task & { dayKey: string; deletedAt: string })[];
}

const isDev = app ? !app.isPackaged : true;

const DEFAULT_SETTINGS: SettingOptions = {
  notificationInterval: 60,
  workStart: 8,
  workEnd: 18,
  theme: 'dark',
  doneTasksCollapsed: true,
  lastRunVersion: '0.0.0',
};

// We explicitly calculate the path to avoid initialization order issues in main.ts
const getStoreOptions = () => {
  const options: any = {
    name: isDev ? 'config-dev' : 'config',
    defaults: {
      settings: DEFAULT_SETTINGS,
      days: {},
      recycleBin: [],
    },
  };

  if (isDev && app) {
    const userDataPath = path.join(app.getPath('appData'), 'Weekly Planner Dev');
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
    text: typeof p.text === 'string' ? p.text : '',
    done: typeof p.done === 'boolean' ? p.done : false,
  }));
  store.set(`days.${dayKey}`, validated);
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

  const { dayKey, text, done } = task;
  const plans = getPlans(dayKey);
  plans.push({ text, done });
  savePlans(dayKey, plans);
  store.set('recycleBin', bin);
}

export function clearRecycleBin(): void {
  store.set('recycleBin', []);
}
