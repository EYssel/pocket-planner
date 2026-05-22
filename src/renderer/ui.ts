'use strict';

import { Plan, DayData, WeekData } from './types';

// DOM refs
export const grid        = document.getElementById('week-grid') as HTMLElement;
export const cwLabel     = document.getElementById('cw-label') as HTMLElement;
export const weekLabel   = document.getElementById('week-label') as HTMLElement;
export const prevBtn     = document.getElementById('prev-week') as HTMLButtonElement;
export const nextBtn     = document.getElementById('next-week') as HTMLButtonElement;
export const todayBtn    = document.getElementById('today-btn') as HTMLButtonElement;
export const themeSelect    = document.getElementById('theme-select') as HTMLSelectElement;
export const fontSizeSelect = document.getElementById('font-size-select') as HTMLSelectElement;

export const staleBanner  = document.getElementById('stale-banner') as HTMLElement;
export const staleCount   = document.getElementById('stale-count') as HTMLElement;
export const openCleanup  = document.getElementById('open-cleanup') as HTMLElement;
export const closeBanner  = document.getElementById('close-banner') as HTMLElement;
export const cleanupList  = document.getElementById('cleanup-list') as HTMLElement;
export const cleanupModal = document.getElementById('cleanup-overlay') as HTMLElement;
export const closeCleanup = document.getElementById('close-cleanup') as HTMLElement;

export const updateBanner           = document.getElementById('update-banner') as HTMLElement;
export const updateStatus           = document.getElementById('update-status') as HTMLElement;
export const updateProgressContainer = document.getElementById('update-progress-container') as HTMLElement;
export const updateProgressBar       = document.getElementById('update-progress-bar') as HTMLElement;
export const installUpdateBtn       = document.getElementById('install-update-btn') as HTMLButtonElement;
export const copyMacCmdBtn          = document.getElementById('copy-mac-cmd-btn') as HTMLButtonElement;
export const closeUpdateBanner      = document.getElementById('close-update-banner') as HTMLElement;

export const recycleBinOverlay = document.getElementById('recycle-bin-overlay') as HTMLElement;
export const recycleBinList    = document.getElementById('recycle-bin-list') as HTMLElement;
export const openRecycleBin    = document.getElementById('open-recycle-bin') as HTMLElement;
export const generateSummaryBtn = document.getElementById('generate-summary') as HTMLButtonElement;
export const closeRecycleBin   = document.getElementById('close-recycle-bin') as HTMLElement;
export const clearBinBtn       = document.getElementById('clear-bin-btn') as HTMLElement;

export const settingsOverlay = document.getElementById('settings-overlay') as HTMLElement;
export const openSettings    = document.getElementById('open-settings') as HTMLElement;
export const closeSettings   = document.getElementById('close-settings') as HTMLElement;

export const syncRecurringBtn      = document.getElementById('sync-recurring') as HTMLButtonElement;
export const openRecurringManager  = document.getElementById('open-recurring-manager') as HTMLElement;
export const closeRecurringManager = document.getElementById('close-recurring-manager') as HTMLElement;
export const recurringManagerOverlay = document.getElementById('recurring-manager-overlay') as HTMLElement;
export const recurringList          = document.getElementById('recurring-list') as HTMLElement;

export const recurrenceSetupOverlay = document.getElementById('recurrence-setup-overlay') as HTMLElement;
export const closeRecurrenceSetup   = document.getElementById('close-recurrence-setup') as HTMLElement;
export const saveRecurrenceBtn      = document.getElementById('save-recurrence-btn') as HTMLButtonElement;
export const stopRecurrenceBtn      = document.getElementById('stop-recurrence-btn') as HTMLButtonElement;
export const recurrenceTaskText     = document.getElementById('recurrence-task-text') as HTMLElement;

export const summaryOverlay = document.getElementById('summary-overlay') as HTMLElement;
export const summaryContent = document.getElementById('summary-content') as HTMLElement;
export const closeSummary   = document.getElementById('close-summary') as HTMLElement;
export const copySummaryBtn = document.getElementById('copy-summary-btn') as HTMLButtonElement;

export const noteOverlay     = document.getElementById('note-overlay') as HTMLElement;
export const taskNoteInput   = document.getElementById('task-note-input') as HTMLTextAreaElement;
export const saveNoteBtn     = document.getElementById('save-note-btn') as HTMLButtonElement;
export const closeNoteModal  = document.getElementById('close-note-modal') as HTMLButtonElement;

export const releaseNotesOverlay = document.getElementById('release-notes-overlay') as HTMLElement;
export const releaseNotesContent = document.getElementById('release-notes-content') as HTMLElement;
export const closeReleaseNotes   = document.getElementById('close-release-notes') as HTMLElement;

export const releaseNotesBanner = document.getElementById('release-notes-banner') as HTMLElement;
export const bannerVersion      = document.getElementById('banner-version') as HTMLElement;
export const viewReleaseNotesBtn = document.getElementById('view-release-notes-btn') as HTMLButtonElement;
export const dismissReleaseNotesBtn = document.getElementById('dismiss-release-notes-btn') as HTMLButtonElement;
export const settingsVersionBtn = document.getElementById('settings-version-btn') as HTMLButtonElement;

export const summaryModalTitle = document.getElementById('summary-modal-title') as HTMLElement;

export const intervalSelect  = document.getElementById('interval-select') as HTMLSelectElement;
export const testNotificationBtn = document.getElementById('test-notification-btn') as HTMLButtonElement;
export const collapseDoneSetting = document.getElementById('collapse-done-setting') as HTMLInputElement;
export const workStartInput  = document.getElementById('work-start') as HTMLInputElement;
export const workEndInput    = document.getElementById('work-end') as HTMLInputElement;

export function renderGrid(weekData: WeekData | null, defaultDoneCollapsed: boolean, callbacks: any) {
  if (!grid) return;
  grid.innerHTML = '';
  if (weekData && weekData.days) {
    for (const day of weekData.days) {
      grid.appendChild(buildDayCol(day, defaultDoneCollapsed, callbacks));
    }
  }
}

export function renderDay(dayKey: string, weekData: WeekData | null, defaultDoneCollapsed: boolean, callbacks: any) {
  const day = weekData?.days?.find(d => d.key === dayKey);
  if (!day) return;
  
  const oldCol = document.querySelector(`.day-col[data-day-key="${dayKey}"]`);
  if (!oldCol) return;
  
  const newCol = buildDayCol(day, defaultDoneCollapsed, callbacks);
  oldCol.replaceWith(newCol);
}

export function buildDayCol(day: DayData, defaultDoneCollapsed: boolean, callbacks: any) {
  const col = document.createElement('div');
  col.className = 'day-col' + (day.isToday ? ' today' : '');
  col.dataset.dayKey = day.key;
  col.appendChild(createDaySection(day, defaultDoneCollapsed, callbacks));
  return col;
}

export function createDaySection(day: DayData, defaultDoneCollapsed: boolean, callbacks: any) {
  const section = document.createElement('div');
  section.className = 'day-section' + (day.isToday ? ' today' : '');
  section.dataset.dayKey = day.key;

  const stored = localStorage.getItem(`done-collapsed-${day.key}`);
  const isCollapsed = stored !== null ? stored === 'true' : defaultDoneCollapsed;

  section.innerHTML = `
    <div class="day-header">
      <div class="day-name">${day.dayName}</div>
      <div class="day-date">${day.date}</div>
      <div class="day-month">${day.month}</div>
      <button class="icon-btn day-summary-btn" data-day-key="${day.key}" title="Summary for ${day.dayName}">📋</button>
    </div>
    <div class="day-tasks active-tasks" id="tasks-${day.key}"></div>
    <div class="done-section ${isCollapsed ? 'collapsed' : ''}" id="done-section-${day.key}">
      <div class="done-header">Done Tasks</div>
      <div class="day-tasks done-tasks" id="done-tasks-${day.key}"></div>
    </div>
    <div class="day-footer">
      <div class="progress-pips" id="pips-${day.key}"></div>
    </div>
  `;

  const tasksEl = section.querySelector(`#tasks-${day.key}`) as HTMLElement;
  const doneTasksEl = section.querySelector(`#done-tasks-${day.key}`) as HTMLElement;
  const doneSectionEl = section.querySelector(`#done-section-${day.key}`) as HTMLElement;
  
  const ro = new ResizeObserver(() => {
    section.querySelectorAll('.task-edit').forEach(ta => autoResize(ta as HTMLTextAreaElement));
  });
  ro.observe(section);

  let hasDoneTasks = false;
  day.plans.forEach((task: Plan, i: number) => {
    if (task.done) {
      doneTasksEl.appendChild(buildTaskItem(day.key, task, i, callbacks));
      hasDoneTasks = true;
    } else {
      tasksEl.appendChild(buildTaskItem(day.key, task, i, callbacks));
    }
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-task-btn';
  addBtn.dataset.day = day.key;
  addBtn.textContent = '+ task';
  addBtn.title = 'Add a new task';
  tasksEl.appendChild(addBtn);

  if (hasDoneTasks) {
    doneSectionEl.classList.add('visible');
  }

  updatePips(day.key, day.plans, section);
  callbacks.setupDropTarget(tasksEl, day.key);
  callbacks.setupDropTarget(doneSectionEl, day.key);

  return section;
}

export function buildTaskItem(dayKey: string, task: Plan, index: number, callbacks: any) {
  const item = document.createElement('div');
  item.className = 'task-item' + (task.done ? ' done' : '');
  item.dataset.dayKey = dayKey;
  item.dataset.index  = index.toString();
  item.draggable      = true;

  item.innerHTML = `
    <button class="check-btn" title="Toggle">${task.done ? '✓' : ''}</button>
    <div class="task-text-container">
      <div class="task-display" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</div>
      <textarea class="task-edit" placeholder="Task…" rows="1">${escapeHtml(task.text)}</textarea>
    </div>
    <button class="recur-btn ${task.recurringId ? 'is-recurring' : ''}" title="${task.recurringId ? 'Edit Recurrence' : 'Make Recurring'}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
    </button>
    <button class="note-btn ${task.notes ? 'has-notes' : ''}" title="Task Notes">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    </button>
    <button class="del-btn" title="Delete">×</button>
  `;

  const display = item.querySelector('.task-display') as HTMLElement;
  const edit    = item.querySelector('.task-edit') as HTMLTextAreaElement;

  display.addEventListener('click', () => {
    item.classList.add('editing');
    edit.focus();
    autoResize(edit);
  });

  edit.addEventListener('blur', () => {
    const newText = edit.value.trim();
    if (newText === '') {
      callbacks.deleteTask(dayKey, index);
      callbacks.saveDay(dayKey);
      return;
    }
    item.classList.remove('editing');
    display.textContent = newText;
    display.title = newText;
    callbacks.updateTask(dayKey, index, newText);
    callbacks.saveDay(dayKey);
  });

  edit.addEventListener('input', () => {
    autoResize(edit);
    callbacks.updateTask(dayKey, index, edit.value);
  });

  item.addEventListener('dragstart', (e: DragEvent) => {
    item.classList.add('dragging');
    document.body.classList.add('dragging-active');
    e.dataTransfer?.setData('text/plain', JSON.stringify({ dayKey, index }));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    document.body.classList.remove('dragging-active');
  });

  return item;
}

export function autoResize(ta: HTMLTextAreaElement) {
  if (!ta || !ta.offsetParent) return;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function updatePips(dayKey: string, plans: Plan[], container?: HTMLElement) {
  const pipsEl = container 
    ? container.querySelector(`#pips-${dayKey}`) as HTMLElement
    : document.getElementById(`pips-${dayKey}`);
    
  if (!pipsEl) return;
  pipsEl.innerHTML = [...plans]
    .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
    .map(p => `<div class="pip${p.done ? ' done' : ''}"></div>`)
    .join('');
}

export function escapeHtml(str: string) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  
  // First, escape HTML to prevent XSS
  let html = escapeHtml(text);

  // Parse markdown links: [label](url)
  // We use a temporary placeholder for the URL to avoid double-processing by the plain URL regex
  const links: string[] = [];
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
    const index = links.length;
    links.push(`<a href="#" onclick="window.planner.openExternal('${url}'); return false;">${label}</a>`);
    return `__LINK_PLACEHOLDER_${index}__`;
  });

  // Parse plain URLs that aren't already part of a markdown link
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  html = html.replace(urlRegex, (url) => {
    return `<a href="#" onclick="window.planner.openExternal('${url}'); return false;">${url}</a>`;
  });

  // Restore placeholders
  links.forEach((linkHtml, i) => {
    html = html.replace(`__LINK_PLACEHOLDER_${i}__`, linkHtml);
  });

  return html;
}
