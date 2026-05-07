'use strict';

import { WeekData, StaleTask, Plan } from './types';

export let currentWeekKey: string | null = null;
export let weekData: WeekData | null = null;
export let staleTasks: StaleTask[] = [];
export let cleanupQueue: Promise<any> = Promise.resolve();
export let defaultDoneCollapsed = true;

type RenderCallback = (dayKey?: string) => void;
let renderCallback: RenderCallback | null = null;

export function setRenderCallback(cb: RenderCallback) {
  renderCallback = cb;
}

function notifyChange(dayKey?: string) {
  if (renderCallback) {
    renderCallback(dayKey);
  }
}

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
    return loadedDay.plans;
  }
  
  const weekKey = await window.planner.weekKeyFromDayKey(dayKey);
  const week = await window.planner.getWeek(weekKey);
  const day = week.days.find((d: any) => d.key === dayKey);
  return day ? day.plans : [];
}

export async function saveDay(
  dayKey: string, 
  updatePips?: (dayKey: string, plans: Plan[]) => void
) {
  const day = weekData?.days?.find((d: any) => d.key === dayKey);
  if (!day) return;

  const plans = day.plans.filter(p => p.text.trim() !== '');
  await window.planner.savePlans(dayKey, plans);
  if (updatePips) updatePips(dayKey, plans);
}

export function addTask(dayKey: string): void {
  const day = weekData?.days?.find(d => d.key === dayKey);
  if (day) {
    day.plans.push({ text: '', done: false });
    notifyChange(dayKey);
  }
}

export function updateTask(dayKey: string, index: number, text: string): void {
  const day = weekData?.days?.find(d => d.key === dayKey);
  if (day && day.plans[index]) {
    day.plans[index].text = text;
  }
}

export function toggleTask(dayKey: string, index: number): void {
  const day = weekData?.days?.find(d => d.key === dayKey);
  if (day && day.plans[index]) {
    day.plans[index].done = !day.plans[index].done;
    notifyChange(dayKey);
  }
}

export function deleteTask(dayKey: string, index: number): { text: string, done: boolean } | null {
  const day = weekData?.days?.find(d => d.key === dayKey);
  if (day && day.plans[index]) {
    const [deleted] = day.plans.splice(index, 1);
    notifyChange(dayKey);
    return deleted;
  }
  return null;
}

export function moveTask(
  sourceDayKey: string, 
  sourceIndex: number, 
  targetDayKey: string, 
  targetIndex: number, 
  isDone?: boolean
): void {
  const sourceDay = weekData?.days?.find(d => d.key === sourceDayKey);
  const targetDay = weekData?.days?.find(d => d.key === targetDayKey);
  
  if (sourceDay && targetDay && sourceDay.plans[sourceIndex]) {
    const [task] = sourceDay.plans.splice(sourceIndex, 1);
    if (isDone !== undefined) task.done = isDone;
    
    const actualTargetIndex = Math.min(Math.max(0, targetIndex), targetDay.plans.length);
    targetDay.plans.splice(actualTargetIndex, 0, task);
    
    notifyChange(sourceDayKey);
    if (sourceDayKey !== targetDayKey) notifyChange(targetDayKey);
  }
}
