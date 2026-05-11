'use strict';

import { StaleTask } from './types';
import * as state from './state';
import * as ui from './ui';

export function renderCleanupList() {
  ui.cleanupList.innerHTML = '';
  state.staleTasks.forEach((task, i) => {
    const item = document.createElement('div');
    item.className = 'stale-task-item';
    item.innerHTML = `
      <div class="stale-task-info">
        <div class="stale-task-text">${ui.escapeHtml(task.text)}</div>
        <div class="stale-task-date">From ${task.dayKey}</div>
      </div>
      <div class="stale-task-actions">
        <button class="banner-btn action-btn" data-index="${i}" data-action="carry" title="Carry Forward">➡️</button>
        <button class="banner-btn action-btn" data-index="${i}" data-action="done" title="Mark Done">✅</button>
        <button class="banner-btn action-btn" data-index="${i}" data-action="discard" title="Discard">🗑️</button>
      </div>
    `;
    ui.cleanupList.appendChild(item);
  });
}

export async function handleCleanupAction(index: number, action: string, callbacks: { loadWeek: (key: string, skipStaleCheck: boolean) => Promise<void> }) {
  state.setCleanupQueue(state.cleanupQueue.then(async () => {
    const task = state.staleTasks[index];
    if (!task || !state.currentWeekKey) return;

    const prevKey = await window.planner.getPreviousWeekKey(state.currentWeekKey);
    const prevWeek = await window.planner.getWeek(prevKey);
    
    const sourceDay = prevWeek.days.find((d: any) => d.key === task.dayKey);
    if (!sourceDay) return;
    const taskIndexInSource = sourceDay.plans.findIndex((p: any) => p.text === task.text && !p.done);

    if (taskIndexInSource === -1) return;

    sourceDay.plans.splice(taskIndexInSource, 1);
    await window.planner.savePlans(task.dayKey, sourceDay.plans);

    if (action === 'carry') {
      const todayKey = await window.planner.currentDayKey();
      const todayPlans = await state.getPlansForDay(todayKey);
      todayPlans.push({ text: task.text, done: false });
      await window.planner.savePlans(todayKey, todayPlans);
      
      const todayWeekKey = await window.planner.weekKeyFromDayKey(todayKey);
      if (todayWeekKey === state.currentWeekKey) await callbacks.loadWeek(state.currentWeekKey, true);
    } else if (action === 'done') {
      sourceDay.plans.splice(taskIndexInSource, 0, { ...task, done: true });
      await window.planner.savePlans(task.dayKey, sourceDay.plans);
    } else if (action === 'discard') {
      await window.planner.addToRecycleBin(task);
    }

    state.staleTasks.splice(index, 1);
    if (state.staleTasks.length === 0) {
      ui.staleBanner.classList.remove('show');
      ui.cleanupModal.classList.remove('show');
    } else {
      renderCleanupList();
      ui.staleCount.textContent = state.staleTasks.length.toString();
    }
  }));
  return state.cleanupQueue;
}

export async function renderRecycleBin() {
  const bin = await window.planner.getRecycleBin();
  ui.recycleBinList.innerHTML = '';
  
  if (bin.length === 0) {
    ui.recycleBinList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">The bin is empty.</div>';
    return;
  }

  bin.forEach((task: any, i: number) => {
    const item = document.createElement('div');
    item.className = 'bin-task-item';
    item.innerHTML = `
      <div class="bin-task-info">
        <div class="bin-task-text">${ui.escapeHtml(task.text)}</div>
        <div class="bin-task-date">Deleted from ${task.dayKey}</div>
      </div>
      <div class="bin-task-actions">
        <button class="action-btn" data-index="${i}" data-action="restore" title="Restore">🔄</button>
      </div>
    `;
    ui.recycleBinList.appendChild(item);
  });
}

export async function handleBinAction(index: number, action: string, callbacks: { loadWeek: (key: string) => Promise<void> }) {
  if (action === 'restore') {
    const bin = await window.planner.getRecycleBin();
    const task = bin[index];
    if (!task) return;

    const restoredWeekKey = await window.planner.weekKeyFromDayKey(task.dayKey);
    
    await window.planner.restoreFromRecycleBin(index);
    
    if (restoredWeekKey === state.currentWeekKey) {
      await callbacks.loadWeek(state.currentWeekKey!);
    }
    
    await renderRecycleBin();
    if ((await window.planner.getRecycleBin()).length === 0) {
      ui.recycleBinOverlay.classList.remove('show');
    }
  }
}

export function applyTheme(theme: string) {
  const classes = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
  if (classes.length > 0) document.body.classList.remove(...classes);
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
}

export async function initTheme() {
  const theme = await window.planner.getSetting('theme');
  applyTheme(theme);
  if (ui.themeSelect) ui.themeSelect.value = theme;
}

export async function initReleaseNotes() {
  const { version } = await window.planner.getAppInfo();
  const lastVersion = await window.planner.getSetting('lastRunVersion');

  if (version !== lastVersion) {
    const notes = await window.planner.getReleaseNotes();
    if (notes) {
      ui.releaseNotesContent.innerHTML = parseMarkdown(notes);
      ui.releaseNotesOverlay.classList.add('show');
    }
    await window.planner.setSetting('lastRunVersion', version);
  }

  ui.closeReleaseNotes.addEventListener('click', () => {
    ui.releaseNotesOverlay.classList.remove('show');
  });
}

function parseMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\n<ul>/gim, '')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="#" style="color: var(--accent);">$1</a>')
    .replace(/\n/gim, '<br>');
}

export async function initSettings(callbacks: { loadWeek: (key: string) => Promise<void>, checkStaleTasks: () => Promise<void> }) {
  const options = await window.planner.getIntervalOptions();
  ui.intervalSelect.innerHTML = options
    .map(opt => `<option value="${opt.minutes}">${opt.label}</option>`)
    .join('');

  const interval = await window.planner.getSetting('notificationInterval');
  const collapsedPref = await window.planner.getSetting('doneTasksCollapsed');
  const workStart = await window.planner.getSetting('workStart');
  const workEnd = await window.planner.getSetting('workEnd');

  ui.intervalSelect.value = (interval ?? 60).toString();
  ui.collapseDoneSetting.checked = !!collapsedPref;
  state.setDefaultDoneCollapsed(!!collapsedPref);
  ui.workStartInput.value = (workStart ?? 8).toString();
  ui.workEndInput.value   = (workEnd ?? 18).toString();

  const currentWeekKey = await window.planner.currentWeekKey();
  await callbacks.loadWeek(currentWeekKey);
  await callbacks.checkStaleTasks();
}
