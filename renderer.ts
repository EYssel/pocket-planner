'use strict';

/**
 * Weekly Planner Renderer
 * Handles UI logic, task management, and drag-and-drop.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let currentWeekKey: string | null = null;
let weekData: any = null; // { cwLabel, dateRange, days: [...] }
let staleTasks: any[] = [];   // [{ text, dayKey, originalIndex }]
let cleanupQueue: Promise<any> = Promise.resolve();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const grid        = document.getElementById('week-grid') as HTMLElement;
const cwLabel     = document.getElementById('cw-label') as HTMLElement;
const weekLabel   = document.getElementById('week-label') as HTMLElement;
const prevBtn     = document.getElementById('prev-week') as HTMLButtonElement;
const nextBtn     = document.getElementById('next-week') as HTMLButtonElement;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const flash       = document.getElementById('saved-flash') as HTMLElement;

const staleBanner  = document.getElementById('stale-banner') as HTMLElement;
const staleCount   = document.getElementById('stale-count') as HTMLElement;
const openCleanup  = document.getElementById('open-cleanup') as HTMLElement;
const closeBanner  = document.getElementById('close-banner') as HTMLElement;
const cleanupList  = document.getElementById('cleanup-list') as HTMLElement;
const cleanupModal = document.getElementById('cleanup-overlay') as HTMLElement;
const closeCleanup = document.getElementById('close-cleanup') as HTMLElement;

const recycleBinOverlay = document.getElementById('recycle-bin-overlay') as HTMLElement;
const recycleBinList    = document.getElementById('recycle-bin-list') as HTMLElement;
const openRecycleBin    = document.getElementById('open-recycle-bin') as HTMLElement;
const closeRecycleBin   = document.getElementById('close-recycle-bin') as HTMLElement;
const clearBinBtn       = document.getElementById('clear-bin-btn') as HTMLElement;

const settingsOverlay = document.getElementById('settings-overlay') as HTMLElement;
const openSettings    = document.getElementById('open-settings') as HTMLElement;
const closeSettings   = document.getElementById('close-settings') as HTMLElement;
const intervalSelect  = document.getElementById('interval-select') as HTMLSelectElement;
const workStartInput  = document.getElementById('work-start') as HTMLInputElement;
const workEndInput    = document.getElementById('work-end') as HTMLInputElement;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    setupEventListeners();
    await initTheme();
    await initSettings();

    // Re-size after fonts are loaded to ensure scrollHeight is correct
    (document as any).fonts.ready.then(() => {
      document.querySelectorAll('.task-text').forEach(ta => autoResize(ta as HTMLTextAreaElement));
    });
  } catch (err: any) {
    console.error('Initialization failed:', err);
    if (grid) {
      grid.innerHTML = `<div style="grid-column: 1/8; padding: 40px; text-align: center; color: var(--accent2);">
        <h2 style="margin-bottom: 10px;">Initialization Error</h2>
        <p>${err.message}</p>
      </div>`;
    }
  }
}

async function initTheme() {
  const theme = await window.planner.getSetting('theme');
  applyTheme(theme);
  if (themeSelect) themeSelect.value = theme;
}

async function initSettings() {
  const options = await window.planner.getIntervalOptions();
  intervalSelect.innerHTML = options
    .map(opt => `<option value="${opt.minutes}">${opt.label}</option>`)
    .join('');

  intervalSelect.value = (await window.planner.getSetting('notificationInterval')).toString();
  workStartInput.value = (await window.planner.getSetting('workStart')).toString();
  workEndInput.value   = (await window.planner.getSetting('workEnd')).toString();

  currentWeekKey = await window.planner.currentWeekKey();
  await loadWeek(currentWeekKey);
  await checkStaleTasks();
}

function applyTheme(theme: string) {
  const classes = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
  if (classes.length > 0) document.body.classList.remove(...classes);
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
}

async function loadWeek(key: string) {
  currentWeekKey = key;
  weekData = await window.planner.getWeek(key);
  if (!weekData) throw new Error('No week data returned from backend');
  
  cwLabel.textContent   = weekData.cwLabel;
  weekLabel.textContent = weekData.dateRange;
  nextBtn.disabled = (key === await window.planner.currentWeekKey());
  
  renderGrid();
}

// ── Stale Tasks Detection ─────────────────────────────────────────────────────
async function checkStaleTasks() {
  if (!currentWeekKey) return;
  const prevKey = await window.planner.getPreviousWeekKey(currentWeekKey);
  const prevWeek = await window.planner.getWeek(prevKey);
  
  staleTasks = [];
  if (prevWeek && prevWeek.days) {
    prevWeek.days.forEach((day: any) => {
      day.plans.forEach((plan: any, index: number) => {
        if (!plan.done) {
          staleTasks.push({ ...plan, dayKey: day.key, originalIndex: index });
        }
      });
    });
  }

  if (staleTasks.length > 0) {
    staleCount.textContent = staleTasks.length.toString();
    staleBanner.classList.add('show');
  } else {
    staleBanner.classList.remove('show');
  }
}

function renderCleanupList() {
  cleanupList.innerHTML = '';
  staleTasks.forEach((task, i) => {
    const item = document.createElement('div');
    item.className = 'stale-task-item';
    item.innerHTML = `
      <div class="stale-task-info">
        <div class="stale-task-text">${escapeHtml(task.text)}</div>
        <div class="stale-task-date">From ${task.dayKey}</div>
      </div>
      <div class="stale-task-actions">
        <button class="action-btn" data-index="${i}" data-action="carry" title="Carry Forward">➡️</button>
        <button class="action-btn" data-index="${i}" data-action="done" title="Mark Done">✅</button>
        <button class="action-btn" data-index="${i}" data-action="discard" title="Discard">🗑️</button>
      </div>
    `;
    cleanupList.appendChild(item);
  });
}

// ── Cleanup Actions ───────────────────────────────────────────────────────────
async function handleCleanupAction(index: number, action: string) {
  cleanupQueue = cleanupQueue.then(async () => {
    const task = staleTasks[index];
    if (!task || !currentWeekKey) return;

    const prevKey = await window.planner.getPreviousWeekKey(currentWeekKey);
    const prevWeek = await window.planner.getWeek(prevKey);
    
    const sourceDay = prevWeek.days.find((d: any) => d.key === task.dayKey);
    if (!sourceDay) return;
    const taskIndexInSource = sourceDay.plans.findIndex((p: any) => p.text === task.text && !p.done);

    if (taskIndexInSource === -1) return;

    sourceDay.plans.splice(taskIndexInSource, 1);
    await window.planner.savePlans(task.dayKey, sourceDay.plans);

    if (action === 'carry') {
      const todayKey = await window.planner.currentDayKey();
      const todayPlans = await getPlansForDay(todayKey);
      todayPlans.push({ text: task.text, done: false });
      await window.planner.savePlans(todayKey, todayPlans);
      
      const todayWeekKey = await window.planner.weekKeyFromDayKey(todayKey);
      if (todayWeekKey === currentWeekKey) await loadWeek(currentWeekKey);
    } else if (action === 'done') {
      sourceDay.plans.splice(taskIndexInSource, 0, { ...task, done: true });
      await window.planner.savePlans(task.dayKey, sourceDay.plans);
    } else if (action === 'discard') {
      await window.planner.addToRecycleBin(task);
    }

    staleTasks.splice(index, 1);
    if (staleTasks.length === 0) {
      staleBanner.classList.remove('show');
      cleanupModal.classList.remove('show');
    } else {
      renderCleanupList();
      staleCount.textContent = staleTasks.length.toString();
    }
  });
  return cleanupQueue;
}

// ── Recycle Bin Logic ─────────────────────────────────────────────────────────
async function renderRecycleBin() {
  const bin = await window.planner.getRecycleBin();
  recycleBinList.innerHTML = '';
  
  if (bin.length === 0) {
    recycleBinList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">The bin is empty.</div>';
    return;
  }

  bin.forEach((task: any, i: number) => {
    const item = document.createElement('div');
    item.className = 'bin-task-item';
    item.innerHTML = `
      <div class="bin-task-info">
        <div class="bin-task-text">${escapeHtml(task.text)}</div>
        <div class="bin-task-date">Deleted from ${task.dayKey}</div>
      </div>
      <div class="bin-task-actions">
        <button class="action-btn" data-index="${i}" data-action="restore" title="Restore">🔄</button>
      </div>
    `;
    recycleBinList.appendChild(item);
  });
}

async function handleBinAction(index: number, action: string) {
  if (action === 'restore') {
    const bin = await window.planner.getRecycleBin();
    const task = bin[index];
    if (!task) return;

    // Use dayKey to determine which week to refresh before restoring (as task is removed from bin)
    const restoredWeekKey = await window.planner.weekKeyFromDayKey(task.dayKey);
    
    await window.planner.restoreFromRecycleBin(index);
    
    // Refresh current week if the task was restored to it
    if (restoredWeekKey === currentWeekKey) {
      await loadWeek(currentWeekKey!);
    }
    
    await renderRecycleBin();
    if ((await window.planner.getRecycleBin()).length === 0) {
      recycleBinOverlay.classList.remove('show');
    }
  }
}

async function getPlansForDay(dayKey: string): Promise<any[]> {
  const loadedDay = weekData?.days?.find((d: any) => d.key === dayKey);
  if (loadedDay) return getPlansFromDOM(dayKey);
  
  const weekKey = await window.planner.weekKeyFromDayKey(dayKey);
  const week = await window.planner.getWeek(weekKey);
  const day = week.days.find((d: any) => d.key === dayKey);
  return day ? day.plans : [];
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGrid() {
  if (!grid) return;
  grid.innerHTML = '';
  if (weekData && weekData.days) {
    // Mon - Fri
    for (let i = 0; i < 5; i++) {
      grid.appendChild(buildDayCol(weekData.days[i]));
    }
    // Weekend
    if (weekData.days.length >= 7) {
      grid.appendChild(buildWeekendCol(weekData.days[5], weekData.days[6]));
    }
  }
}

function buildDayCol(day: any) {
  const col = document.createElement('div');
  col.className = 'day-col' + (day.isToday ? ' today' : '');
  col.dataset.dayKey = day.key;
  col.appendChild(createDaySection(day));
  return col;
}

function buildWeekendCol(sat: any, sun: any) {
  const col = document.createElement('div');
  col.className = 'day-col weekend-col';
  col.appendChild(createDaySection(sat));
  col.appendChild(createDaySection(sun));
  return col;
}

function createDaySection(day: any) {
  const section = document.createElement('div');
  section.className = 'day-section' + (day.isToday ? ' today' : '');
  section.dataset.dayKey = day.key;

  section.innerHTML = `
    <div class="day-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div class="day-name">${day.dayName}</div>
        <div style="display: flex; align-items: baseline;">
          <div class="day-date">${day.date}</div>
        </div>
        <div class="day-month">${day.month}</div>
      </div>
    </div>
    <div class="day-tasks" id="tasks-${day.key}"></div>
    <button class="add-task-btn" data-day="${day.key}">+ task</button>
    <div class="day-footer">
      <div class="progress-pips" id="pips-${day.key}"></div>
    </div>
  `;

  const tasksEl = section.querySelector(`#tasks-${day.key}`) as HTMLElement;
  
  // Resize all tasks in this day if the container width changes (e.g. scrollbar appears)
  const ro = new ResizeObserver(() => {
    tasksEl.querySelectorAll('.task-text').forEach(ta => autoResize(ta as HTMLTextAreaElement));
  });
  ro.observe(tasksEl);

  day.plans.forEach((task: any, i: number) => tasksEl.appendChild(buildTaskItem(day.key, task, i)));
  updatePips(day.key, day.plans);
  setupDropTarget(tasksEl, day.key);

  return section;
}

function buildTaskItem(dayKey: string, task: any, index: number) {
  const item = document.createElement('div');
  item.className = 'task-item' + (task.done ? ' done' : '');
  item.dataset.dayKey = dayKey;
  item.dataset.index  = index.toString();
  item.draggable      = true;

  item.innerHTML = `
    <button class="check-btn" title="Toggle">${task.done ? '✓' : ''}</button>
    <textarea class="task-text" placeholder="Task…" rows="1">${escapeHtml(task.text)}</textarea>
    <button class="del-btn" title="Delete">×</button>
  `;

  const ta = item.querySelector('.task-text') as HTMLTextAreaElement;
  requestAnimationFrame(() => autoResize(ta));

  item.addEventListener('dragstart', (e: DragEvent) => {
    item.classList.add('dragging');
    e.dataTransfer?.setData('text/plain', JSON.stringify({ dayKey, index }));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
  });

  return item;
}

function autoResize(ta: HTMLTextAreaElement) {
  if (!ta || !ta.offsetParent) return;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function updatePips(dayKey: string, plans: any[]) {
  const pipsEl = document.getElementById(`pips-${dayKey}`);
  if (!pipsEl) return;
  pipsEl.innerHTML = plans
    .map(p => `<div class="pip${p.done ? ' done' : ''}"></div>`)
    .join('');
}

function escapeHtml(str: string) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getPlansFromDOM(dayKey: string): any[] {
  const items = grid.querySelectorAll(`.task-item[data-day-key="${dayKey}"]`);
  return Array.from(items).map(item => ({
    text: (item.querySelector('.task-text') as HTMLTextAreaElement).value,
    done: item.classList.contains('done'),
  }));
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
function setupDropTarget(tasksEl: HTMLElement, dayKey: string) {
  tasksEl.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (!dragging) return;

    const afterElement = getDragAfterElement(tasksEl, e.clientY);
    if (afterElement == null) {
      if (tasksEl.lastElementChild !== dragging) tasksEl.appendChild(dragging);
    } else {
      if (afterElement !== dragging && afterElement.previousElementSibling !== dragging) {
        tasksEl.insertBefore(dragging, afterElement);
      }
    }
  });

  tasksEl.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    const dataTransferText = e.dataTransfer?.getData('text/plain');
    if (!dataTransferText) return;
    const { dayKey: sourceDayKey } = JSON.parse(dataTransferText);
    await saveDay(sourceDayKey);
    if (sourceDayKey !== dayKey) await saveDay(dayKey);
  });
}

function getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')] as HTMLElement[];
  return draggableElements.reduce((closest: any, child: HTMLElement) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ── Persistence ───────────────────────────────────────────────────────────────
async function saveDay(dayKey: string) {
  const plans = getPlansFromDOM(dayKey).filter(p => p.text.trim() !== '');
  await window.planner.savePlans(dayKey, plans);
  updatePips(dayKey, plans);
  flashSaved();
}

function flashSaved() {
  if (!flash) return;
  flash.classList.add('show');
  clearTimeout((flashSaved as any)._t);
  (flashSaved as any)._t = setTimeout(() => flash.classList.remove('show'), 1600);
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  prevBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey!, -1)));
  nextBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey!, +1)));

  themeSelect?.addEventListener('change', async (e: Event) => {
    const newTheme = (e.target as HTMLSelectElement).value;
    applyTheme(newTheme);
    await window.planner.setSetting('theme' as any, newTheme);
  });

  window.planner.onSetMode(async () => {
    currentWeekKey = await window.planner.currentWeekKey();
    loadWeek(currentWeekKey);
  });

  grid?.addEventListener('click', async (e: MouseEvent) => {
    const item = (e.target as HTMLElement).closest('.task-item') as HTMLElement;
    if (item) {
      const dayKey = item.dataset.dayKey!;
      const checkBtn = (e.target as HTMLElement).closest('.check-btn');
      const delBtn = (e.target as HTMLElement).closest('.del-btn');

      if (checkBtn) {
        item.classList.toggle('done');
        checkBtn.textContent = item.classList.contains('done') ? '✓' : '';
        saveDay(dayKey);
      } else if (delBtn) {
        const text = (item.querySelector('.task-text') as HTMLTextAreaElement).value;
        const isDone = item.classList.contains('done');
        // Remove from DOM immediately for snappy UI and to avoid race conditions in tests
        item.remove();
        await window.planner.addToRecycleBin({ text, done: isDone, dayKey });
        saveDay(dayKey);
      }
    } else {
      const addBtn = (e.target as HTMLElement).closest('.add-task-btn') as HTMLButtonElement;
      if (addBtn) {
        const dayKey = addBtn.dataset.day!;
        const tasksEl = document.getElementById(`tasks-${dayKey}`) as HTMLElement;
        const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
        tasksEl.appendChild(newItem);
        (newItem.querySelector('.task-text') as HTMLTextAreaElement).focus();
      }
    }
  });

  openCleanup?.addEventListener('click', () => { renderCleanupList(); cleanupModal.classList.add('show'); });
  closeBanner?.addEventListener('click', () => { staleBanner.classList.remove('show'); });
  closeCleanup?.addEventListener('click', () => { cleanupModal.classList.remove('show'); });
  cleanupList?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.action-btn') as HTMLButtonElement;
    if (btn) handleCleanupAction(parseInt(btn.dataset.index!, 10), btn.dataset.action!);
  });

  openRecycleBin?.addEventListener('click', () => { renderRecycleBin(); recycleBinOverlay.classList.add('show'); });
  closeRecycleBin?.addEventListener('click', () => { recycleBinOverlay.classList.remove('show'); });
  clearBinBtn?.addEventListener('click', async () => {
    if (confirm('Permanently clear all items in the recycle bin?')) {
      await window.planner.clearRecycleBin();
      renderRecycleBin();
    }
  });
  recycleBinList?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.action-btn') as HTMLButtonElement;
    if (btn) handleBinAction(parseInt(btn.dataset.index!, 10), btn.dataset.action!);
  });

  openSettings?.addEventListener('click',  () => settingsOverlay.classList.add('show'));
  closeSettings?.addEventListener('click', () => settingsOverlay.classList.remove('show'));

  intervalSelect?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('notificationInterval' as any, parseInt((e.target as HTMLSelectElement).value, 10));
  });

  workStartInput?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('workStart' as any, parseInt((e.target as HTMLInputElement).value, 10));
  });

  workEndInput?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('workEnd' as any, parseInt((e.target as HTMLInputElement).value, 10));
  });

  grid?.addEventListener('focusout', (e: FocusEvent) => {
    if ((e.target as HTMLElement).classList.contains('task-text')) {
      const dayKey = (e.target as HTMLElement).closest('.task-item')?.getAttribute('data-day-key');
      if (dayKey) saveDay(dayKey);
    }
  }, true);

  grid?.addEventListener('input', (e: Event) => {
    if ((e.target as HTMLElement).classList.contains('task-text')) autoResize(e.target as HTMLTextAreaElement);
  });

  grid?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!(e.target as HTMLElement).classList.contains('task-text')) return;
    const item = (e.target as HTMLElement).closest('.task-item') as HTMLElement;
    const dayKey = item?.dataset.dayKey!;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const tasksEl = document.getElementById(`tasks-${dayKey}`) as HTMLElement;
      const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
      tasksEl.appendChild(newItem);
      (newItem.querySelector('.task-text') as HTMLTextAreaElement).focus();
    }
    if (e.key === 'Backspace' && (e.target as HTMLTextAreaElement).value === '') {
      e.preventDefault();
      const prev = item.previousElementSibling as HTMLElement;
      item.remove();
      saveDay(dayKey);
      if (prev) (prev.querySelector('.task-text') as HTMLTextAreaElement)?.focus();
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      weekData?.days?.forEach((d: any) => saveDay(d.key));
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.task-text').forEach(ta => autoResize(ta as HTMLTextAreaElement));
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
