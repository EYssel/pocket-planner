'use strict';

export interface Task {
  text: string;
  done: boolean;
}

export interface Day {
  key: string;
  dayName: string;
  date: number | string;
  month: string;
  isToday: boolean;
  isWeekend: boolean;
  plans: Task[];
}

export interface WeekData {
  key: string;
  cwLabel: string;
  dateRange: string;
  year: number;
  week: number;
  days: Day[];
}

export interface SettingOptions {
  theme: string;
  notificationInterval: number;
  workStart: number;
  workEnd: number;
  doneTasksCollapsed: boolean;
}

export interface PlannerAPI {
  currentWeekKey: () => Promise<string>;
  offsetWeekKey: (key: string, delta: number) => Promise<string>;
  currentDayKey: () => Promise<string>;
  weekKeyFromDayKey: (dayKey: string) => Promise<string>;
  getSetting: <K extends keyof SettingOptions>(key: K) => Promise<SettingOptions[K]>;
  setSetting: <K extends keyof SettingOptions>(key: K, value: SettingOptions[K]) => Promise<void>;
  getIntervalOptions: () => Promise<{ label: string; minutes: number }[]>;
  getWeek: (weekKey: string) => Promise<WeekData>;
  savePlans: (dayKey: string, plans: Task[]) => Promise<void>;
  onSetMode: (cb: (mode: string) => void) => void;
  addToRecycleBin: (task: Task & { dayKey: string }) => Promise<void>;
  getRecycleBin: () => Promise<(Task & { dayKey: string })[]>;
  restoreFromRecycleBin: (index: number) => Promise<void>;
  clearRecycleBin: () => Promise<void>;
  getPreviousWeekKey: (key: string) => Promise<string>;
  getAppInfo: () => Promise<{ name: string; version: string }>;
  onCheckingForUpdates: (cb: () => void) => void;
  onUpdateAvailable: (cb: (version: string) => void) => void;
  onUpdateNotAvailable: (cb: () => void) => void;
  onUpdateProgress: (cb: (percent: number) => void) => void;
  onUpdateDownloaded: (cb: () => void) => void;
  installUpdate: () => void;
}

declare global {
  interface Window {
    planner: PlannerAPI;
  }
}
