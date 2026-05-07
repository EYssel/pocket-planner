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
const todayBtn    = document.getElementById('today-btn') as HTMLButtonElement;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;

const staleBanner  = document.getElementById('stale-banner') as HTMLElement;
const staleCount   = document.getElementById('stale-count') as HTMLElement;
const openCleanup  = document.getElementById('open-cleanup') as HTMLElement;
const closeBanner  = document.getElementById('close-banner') as HTMLElement;
const cleanupList  = document.getElementById('cleanup-list') as HTMLElement;
const cleanupModal = document.getElementById('cleanup-overlay') as HTMLElement;
const closeCleanup = document.getElementById('close-cleanup') as HTMLElement;

const updateBanner           = document.getElementById('update-banner') as HTMLElement;
const updateStatus           = document.getElementById('update-status') as HTMLElement;
const updateProgressContainer = document.getElementById('update-progress-container') as HTMLElement;
const updateProgressBar       = document.getElementById('update-progress-bar') as HTMLElement;
const installUpdateBtn       = document.getElementById('install-update-btn') as HTMLElement;
const closeUpdateBanner      = document.getElementById('close-update-banner') as HTMLElement;

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
    const appInfo = await window.planner.getAppInfo();
    if (appInfo) {
      document.title = appInfo.name;
      const logo = document.querySelector('.logo');
      if (logo) logo.textContent = appInfo.name;
      
      const v1 = document.getElementById('app-version');
      const v2 = document.getElementById('settings-version');
      if (v1) v1.textContent = `v${appInfo.version}`;
      if (v2) v2.textContent = `v${appInfo.version}`;
    }

    setupEventListeners();
    await initTheme();
    await initSettings();

    // Re-size after fonts are loaded to ensure scrollHeight is correct
    (document as any).fonts.ready.then(() => {
      document.querySelectorAll('.task-edit').forEach(ta => autoResize(ta as HTMLTextAreaElement));
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

async function loadWeek(key: string, skipStaleCheck = false) {
  currentWeekKey = key;
  weekData = await window.planner.getWeek(key);
  if (!weekData) throw new Error('No week data returned from backend');
  
  cwLabel.textContent   = weekData.cwLabel;
  weekLabel.textContent = weekData.dateRange;
  todayBtn.disabled = (key === await window.planner.currentWeekKey());
  
  renderGrid();
  if (!skipStaleCheck) await checkStaleTasks();
}

// ── Stale Tasks Detection ─────────────────────────────────────────────────────
async function checkStaleTasks() {
  if (!currentWeekKey) return;
  
  // Only show cleanup banner if we are on the current week
  const actualCurrentWeekKey = await window.planner.currentWeekKey();
  if (currentWeekKey !== actualCurrentWeekKey) {
    staleBanner.classList.remove('show');
    return;
  }

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
        <button class="banner-btn action-btn" data-index="${i}" data-action="carry" title="Carry Forward">➡️</button>
        <button class="banner-btn action-btn" data-index="${i}" data-action="done" title="Mark Done">✅</button>
        <button class="banner-btn action-btn" data-index="${i}" data-action="discard" title="Discard">🗑️</button>
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
      if (todayWeekKey === currentWeekKey) await loadWeek(currentWeekKey, true);
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
    // Render all 6 columns (Mon-Fri + Weekend)
    for (const day of weekData.days) {
      grid.appendChild(buildDayCol(day));
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

function createDaySection(day: any) {
  const section = document.createElement('div');
  section.className = 'day-section' + (day.isToday ? ' today' : '');
  section.dataset.dayKey = day.key;

  section.innerHTML = `
    <div class="day-header">
      <div class="day-name">${day.dayName}</div>
      <div class="day-date">${day.date}</div>
      <div class="day-month">${day.month}</div>
    </div>
    <div class="day-tasks active-tasks" id="tasks-${day.key}"></div>
    <div class="done-section" id="done-section-${day.key}">
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
  
  // Resize all tasks in this day if the container width changes (e.g. scrollbar appears)
  const ro = new ResizeObserver(() => {
    section.querySelectorAll('.task-edit').forEach(ta => autoResize(ta as HTMLTextAreaElement));
  });
  ro.observe(section);

  let hasDoneTasks = false;
  day.plans.forEach((task: any, i: number) => {
    if (task.done) {
      doneTasksEl.appendChild(buildTaskItem(day.key, task, i));
      hasDoneTasks = true;
    } else {
      tasksEl.appendChild(buildTaskItem(day.key, task, i));
    }
  });

  // Add the "+ task" button to the end of the active tasks list
  const addBtn = document.createElement('button');
  addBtn.className = 'add-task-btn';
  addBtn.dataset.day = day.key;
  addBtn.textContent = '+ task';
  tasksEl.appendChild(addBtn);

  if (hasDoneTasks) {
    doneSectionEl.classList.add('visible');
  }

  updatePips(day.key, day.plans);
  setupDropTarget(tasksEl, day.key);
  setupDropTarget(doneTasksEl, day.key);

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
    <div class="task-text-container">
      <div class="task-display" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</div>
      <textarea class="task-edit" placeholder="Task…" rows="1">${escapeHtml(task.text)}</textarea>
    </div>
    <button class="del-btn" title="Delete">×</button>
  `;

  const display = item.querySelector('.task-display') as HTMLElement;
  const edit    = item.querySelector('.task-edit') as HTMLTextAreaElement;

  // Toggle edit mode
  display.addEventListener('click', () => {
    item.classList.add('editing');
    edit.focus();
    autoResize(edit);
  });

  edit.addEventListener('blur', () => {
    if (edit.value.trim() === '') {
      item.remove();
      saveDay(dayKey);
      return;
    }
    item.classList.remove('editing');
    display.textContent = edit.value;
    display.title = edit.value;
    saveDay(dayKey);
  });

  edit.addEventListener('input', () => {
    autoResize(edit);
  });

  item.addEventListener('dragstart', (e: DragEvent) => {
    item.classList.add('dragging');
    document.body.classList.add('dragging-active');
    const currentDayKey = item.dataset.dayKey || dayKey;
    e.dataTransfer?.setData('text/plain', JSON.stringify({ dayKey: currentDayKey, index }));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    document.body.classList.remove('dragging-active');
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
  const tasksEl = document.getElementById(`tasks-${dayKey}`);
  const doneTasksEl = document.getElementById(`done-tasks-${dayKey}`);
  const items: HTMLElement[] = [];
  
  if (tasksEl) items.push(...Array.from(tasksEl.querySelectorAll('.task-item')) as HTMLElement[]);
  if (doneTasksEl) items.push(...Array.from(doneTasksEl.querySelectorAll('.task-item')) as HTMLElement[]);

  return items.map(item => ({
    text: (item.querySelector('.task-edit') as HTMLTextAreaElement).value,
    done: item.parentElement?.classList.contains('done-tasks') || item.classList.contains('done'),
  }));
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
function setupDropTarget(tasksEl: HTMLElement, dayKey: string) {
  tasksEl.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (!dragging) return;

    // Update dragging item state based on current target
    const isDoneContainer = tasksEl.classList.contains('done-tasks');
    dragging.dataset.dayKey = dayKey;
    dragging.setAttribute('data-day-key', dayKey);
    if (isDoneContainer) {
      dragging.classList.add('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '✓';
    } else {
      dragging.classList.remove('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '';
    }

    const afterElement = getDragAfterElement(tasksEl, e.clientY);
    const addBtn = tasksEl.querySelector('.add-task-btn');
    if (afterElement == null) {
      if (addBtn) {
        if (addBtn.previousElementSibling !== dragging) tasksEl.insertBefore(dragging, addBtn);
      } else {
        if (tasksEl.lastElementChild !== dragging) tasksEl.appendChild(dragging);
      }
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

    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (dragging) {
      dragging.dataset.dayKey = dayKey;
      dragging.setAttribute('data-day-key', dayKey);
    }
    
    await saveDay(sourceDayKey);
    if (sourceDayKey !== dayKey) await saveDay(dayKey);

    // Update visibility of done sections for source and target days
    [sourceDayKey, dayKey].forEach(dk => {
      const doneSectionEl = document.getElementById(`done-section-${dk}`);
      const doneTasksEl = document.getElementById(`done-tasks-${dk}`);
      if (doneSectionEl && doneTasksEl) {
        doneSectionEl.classList.toggle('visible', doneTasksEl.children.length > 0);
      }
    });
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
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  prevBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey!, -1)));
  nextBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey!, +1)));
  todayBtn?.addEventListener('click', async () => loadWeek(await window.planner.currentWeekKey()));

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
        const isDone = item.classList.contains('done');
        checkBtn.textContent = isDone ? '✓' : '';

        // Move item to correct container
        const tasksEl = document.getElementById(`tasks-${dayKey}`);
        const doneTasksEl = document.getElementById(`done-tasks-${dayKey}`);
        const doneSectionEl = document.getElementById(`done-section-${dayKey}`);

        if (isDone) {
          doneTasksEl?.appendChild(item);
        } else {
          const addBtn = tasksEl?.querySelector('.add-task-btn');
          if (addBtn) {
            tasksEl?.insertBefore(item, addBtn);
          } else {
            tasksEl?.appendChild(item);
          }
        }

        if (doneSectionEl && doneTasksEl) {
          doneSectionEl.classList.toggle('visible', doneTasksEl.children.length > 0);
        }

        saveDay(dayKey);
      } else if (delBtn) {
        const text = (item.querySelector('.task-edit') as HTMLTextAreaElement).value;
        const isDone = item.classList.contains('done');
        const dayKey = item.dataset.dayKey!;
        
        // Remove from DOM immediately for snappy UI
        item.remove();

        const doneTasksEl = document.getElementById(`done-tasks-${dayKey}`);
        const doneSectionEl = document.getElementById(`done-section-${dayKey}`);
        if (doneSectionEl && doneTasksEl) {
          doneSectionEl.classList.toggle('visible', doneTasksEl.children.length > 0);
        }

        await window.planner.addToRecycleBin({ text, done: isDone, dayKey });
        saveDay(dayKey);
      }
    } else {
      const addBtn = (e.target as HTMLElement).closest('.add-task-btn') as HTMLButtonElement;
      if (addBtn) {
        const dayKey = addBtn.dataset.day!;
        const tasksEl = document.getElementById(`tasks-${dayKey}`) as HTMLElement;
        const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
        tasksEl.insertBefore(newItem, addBtn);
        
        // Enter edit mode immediately
        newItem.classList.add('editing');
        const edit = newItem.querySelector('.task-edit') as HTMLTextAreaElement;
        edit.focus();
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

  window.planner.onUpdateAvailable((version: string) => {
    updateBanner.classList.add('show');
    updateStatus.innerHTML = `<strong>Downloading Update</strong> Version ${version} is being prepared…`;
    updateProgressContainer.style.display = 'block';
    updateProgressBar.style.width = '0%';
    installUpdateBtn.disabled = true;
    installUpdateBtn.textContent = 'Downloading…';
  });

  window.planner.onUpdateProgress((percent: number) => {
    updateBanner.classList.add('show');
    updateProgressContainer.style.display = 'block';
    updateProgressBar.style.width = `${percent}%`;
    updateStatus.innerHTML = `<strong>Downloading Update</strong> Progress: ${percent}%`;
  });

  window.planner.onUpdateDownloaded(() => {
    updateBanner.classList.add('show');
    updateStatus.innerHTML = '<strong>Update Ready</strong> A new version has been downloaded.';
    updateProgressContainer.style.display = 'none';
    installUpdateBtn.disabled = false;
    installUpdateBtn.textContent = 'Restart to Install';
  });

  installUpdateBtn?.addEventListener('click', () => {
    window.planner.installUpdate();
  });

  closeUpdateBanner?.addEventListener('click', () => {
    updateBanner.classList.remove('show');
  });

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
    if ((e.target as HTMLElement).classList.contains('task-edit')) {
      const dayKey = (e.target as HTMLElement).closest('.task-item')?.getAttribute('data-day-key');
      if (dayKey) saveDay(dayKey);
    }
  }, true);

  grid?.addEventListener('input', (e: Event) => {
    if ((e.target as HTMLElement).classList.contains('task-edit')) autoResize(e.target as HTMLTextAreaElement);
  });

  grid?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!(e.target as HTMLElement).classList.contains('task-edit')) return;
    const item = (e.target as HTMLElement).closest('.task-item') as HTMLElement;
    const dayKey = item?.dataset.dayKey!;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const tasksEl = document.getElementById(`tasks-${dayKey}`) as HTMLElement;
      const addBtn = tasksEl.querySelector('.add-task-btn') as HTMLElement;
      const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
      
      if (addBtn) {
        tasksEl.insertBefore(newItem, addBtn);
      } else {
        tasksEl.appendChild(newItem);
      }

      // Enter edit mode immediately
      newItem.classList.add('editing');
      const edit = newItem.querySelector('.task-edit') as HTMLTextAreaElement;
      edit.focus();
    }
    if (e.key === 'Backspace' && (e.target as HTMLTextAreaElement).value === '') {
      e.preventDefault();
      const prev = item.previousElementSibling as HTMLElement;
      item.remove();
      saveDay(dayKey);
      if (prev) {
        prev.classList.add('editing');
        const prevEdit = prev.querySelector('.task-edit') as HTMLTextAreaElement;
        prevEdit?.focus();
      }
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      weekData?.days?.forEach((d: any) => saveDay(d.key));
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.task-edit').forEach(ta => autoResize(ta as HTMLTextAreaElement));
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
