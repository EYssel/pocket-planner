'use strict';

import { WeekData, StaleTask, Plan } from './types';

export let currentWeekKey: string | null = null;
export let weekData: WeekData | null = null;
export let staleTasks: StaleTask[] = [];
export let cleanupQueue: Promise<any> = Promise.resolve();
export let defaultDoneCollapsed = true;

export function setCurrentWeekKey(key: string | null) {
  currentWeekKey = key;
}

export function setWeekData(data: WeekData | null) {
  weekData = data;
}

export function setStaleTasks(tasks: StaleTask[]) {
  staleTasks = tasks;
}

export function setCleanupQueue(promise: Promise<any>) {
  cleanupQueue = promise;
}

export function setDefaultDoneCollapsed(val: boolean) {
  defaultDoneCollapsed = val;
}

export async function loadWeek(
  key: string, 
  skipStaleCheck = false, 
  uiCallbacks: { 
    renderGrid: () => void, 
    updateLabels: (data: WeekData, isToday: boolean) => void,
    checkStaleTasks: () => Promise<void>
  }
) {
  currentWeekKey = key;
  weekData = await window.planner.getWeek(key);
  if (!weekData) throw new Error('No week data returned from backend');
  
  const isToday = (key === await window.planner.currentWeekKey());
  uiCallbacks.updateLabels(weekData, isToday);
  
  uiCallbacks.renderGrid();
  if (!skipStaleCheck) await uiCallbacks.checkStaleTasks();
}

export async function checkStaleTasks(
  currentWeekKey: string | null,
  uiCallbacks: {
    showBanner: (count: number) => void,
    hideBanner: () => void
  }
) {
  if (!currentWeekKey) return;
  
  const actualCurrentWeekKey = await window.planner.currentWeekKey();
  if (currentWeekKey !== actualCurrentWeekKey) {
    uiCallbacks.hideBanner();
    return;
  }

  const prevKey = await window.planner.getPreviousWeekKey(currentWeekKey);
  const prevWeek = await window.planner.getWeek(prevKey);
  
  const newStaleTasks: StaleTask[] = [];
  if (prevWeek && prevWeek.days) {
    prevWeek.days.forEach((day: any) => {
      day.plans.forEach((plan: any, index: number) => {
        if (!plan.done) {
          newStaleTasks.push({ ...plan, dayKey: day.key, originalIndex: index });
        }
      });
    });
  }

  setStaleTasks(newStaleTasks);

  if (staleTasks.length > 0) {
    uiCallbacks.showBanner(staleTasks.length);
  } else {
    uiCallbacks.hideBanner();
  }
}

export async function getPlansForDay(dayKey: string): Promise<Plan[]> {
  const loadedDay = weekData?.days?.find((d: any) => d.key === dayKey);
  if (loadedDay) {
    // This will be provided by UI module later, or we can just call it if we import it.
    // To avoid circular dependency, maybe UI module should provide a way to get this.
    return (window as any).getPlansFromDOM(dayKey);
  }
  
  const weekKey = await window.planner.weekKeyFromDayKey(dayKey);
  const week = await window.planner.getWeek(weekKey);
  const day = week.days.find((d: any) => d.key === dayKey);
  return day ? day.plans : [];
}

export async function saveDay(
  dayKey: string, 
  getPlansFromDOM: (dayKey: string) => Plan[],
  updatePips: (dayKey: string, plans: Plan[]) => void
) {
  const plans = getPlansFromDOM(dayKey).filter(p => p.text.trim() !== '');
  await window.planner.savePlans(dayKey, plans);
  updatePips(dayKey, plans);
}
