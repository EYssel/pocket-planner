'use strict';

/**
 * Weekly Planner Renderer
 * Handles UI logic, task management, and drag-and-drop.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let currentWeekKey = null;
let weekData       = null; // { cwLabel, dateRange, days: [...] }
let staleTasks     = [];   // [{ text, dayKey, originalIndex }]
let cleanupQueue   = Promise.resolve();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const grid        = document.getElementById('week-grid');
const cwLabel     = document.getElementById('cw-label');
const weekLabel   = document.getElementById('week-label');
const prevBtn     = document.getElementById('prev-week');
const nextBtn     = document.getElementById('next-week');
const themeSelect = document.getElementById('theme-select');
const flash       = document.getElementById('saved-flash');

const staleBanner  = document.getElementById('stale-banner');
const staleCount   = document.getElementById('stale-count');
const openCleanup  = document.getElementById('open-cleanup');
const closeBanner  = document.getElementById('close-banner');
const cleanupList  = document.getElementById('cleanup-list');
const cleanupModal = document.getElementById('cleanup-overlay');
const closeCleanup = document.getElementById('close-cleanup');

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    setupEventListeners();
    await initTheme();
    currentWeekKey = await window.planner.currentWeekKey();
    await loadWeek(currentWeekKey);
    await checkStaleTasks();
  } catch (err) {
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

function applyTheme(theme) {
  const classes = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
  if (classes.length > 0) document.body.classList.remove(...classes);
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
}

async function loadWeek(key) {
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
  const prevKey = await window.planner.getPreviousWeekKey(currentWeekKey);
  const prevWeek = await window.planner.getWeek(prevKey);
  
  staleTasks = [];
  if (prevWeek && prevWeek.days) {
    prevWeek.days.forEach(day => {
      day.plans.forEach((plan, index) => {
        if (!plan.done) {
          staleTasks.push({ ...plan, dayKey: day.key, originalIndex: index });
        }
      });
    });
  }

  if (staleTasks.length > 0) {
    staleCount.textContent = staleTasks.length;
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
async function handleCleanupAction(index, action) {
  cleanupQueue = cleanupQueue.then(async () => {
    const task = staleTasks[index];
    if (!task) return;

    const prevKey = await window.planner.getPreviousWeekKey(currentWeekKey);
    const prevWeek = await window.planner.getWeek(prevKey);
    
    const sourceDay = prevWeek.days.find(d => d.key === task.dayKey);
    const taskIndexInSource = sourceDay.plans.findIndex(p => p.text === task.text && !p.done);

    if (taskIndexInSource === -1) return;

    sourceDay.plans.splice(taskIndexInSource, 1);
    await window.planner.savePlans(task.dayKey, sourceDay.plans);

    if (action === 'carry') {
      const todayKey = window.planner.currentDayKey();
      const todayPlans = await getPlansForDay(todayKey);
      todayPlans.push({ text: task.text, done: false });
      await window.planner.savePlans(todayKey, todayPlans);
      
      const todayWeekKey = window.planner.weekKeyFromDayKey(todayKey);
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
      staleCount.textContent = staleTasks.length;
    }
  });
  return cleanupQueue;
}

async function getPlansForDay(dayKey) {
  const loadedDay = weekData?.days?.find(d => d.key === dayKey);
  if (loadedDay) return getPlansFromDOM(dayKey);
  
  const weekKey = window.planner.weekKeyFromDayKey(dayKey);
  const week = await window.planner.getWeek(weekKey);
  const day = week.days.find(d => d.key === dayKey);
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

function buildDayCol(day) {
  const col = document.createElement('div');
  col.className = 'day-col' + (day.isToday ? ' today' : '');
  col.dataset.dayKey = day.key;
  col.appendChild(createDaySection(day));
  return col;
}

function buildWeekendCol(sat, sun) {
  const col = document.createElement('div');
  col.className = 'day-col weekend-col';
  col.appendChild(createDaySection(sat));
  col.appendChild(createDaySection(sun));
  return col;
}

function createDaySection(day) {
  const section = document.createElement('div');
  section.className = 'day-section' + (day.isToday ? ' today' : '');
  section.dataset.dayKey = day.key;

  section.innerHTML = `
    <div class="day-header">
      <div class="day-name">${day.dayName}</div>
      <div class="day-date">${day.date}</div>
      <div class="day-month">${day.month}</div>
    </div>
    <div class="day-tasks" id="tasks-${day.key}"></div>
    <button class="add-task-btn" data-day="${day.key}">+ task</button>
    <div class="day-footer">
      <div class="progress-pips" id="pips-${day.key}"></div>
    </div>
  `;

  const tasksEl = section.querySelector(`#tasks-${day.key}`);
  day.plans.forEach((task, i) => tasksEl.appendChild(buildTaskItem(day.key, task, i)));
  updatePips(day.key, day.plans);
  setupDropTarget(tasksEl, day.key);

  return section;
}

function buildTaskItem(dayKey, task, index) {
  const item = document.createElement('div');
  item.className = 'task-item' + (task.done ? ' done' : '');
  item.dataset.dayKey = dayKey;
  item.dataset.index  = index;
  item.draggable      = true;

  item.innerHTML = `
    <button class="check-btn" title="Toggle">${task.done ? '✓' : ''}</button>
    <textarea class="task-text" placeholder="Task…" rows="1">${escapeHtml(task.text)}</textarea>
    <button class="del-btn" title="Delete">×</button>
  `;

  const ta = item.querySelector('.task-text');
  requestAnimationFrame(() => autoResize(ta));
  ta.addEventListener('input', () => autoResize(ta));

  item.addEventListener('dragstart', (e) => {
    item.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({ dayKey, index }));
    e.dataTransfer.effectAllowed = 'move';
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
  });

  return item;
}

function autoResize(ta) {
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function updatePips(dayKey, plans) {
  const pipsEl = document.getElementById(`pips-${dayKey}`);
  if (!pipsEl) return;
  pipsEl.innerHTML = plans
    .map(p => `<div class="pip${p.done ? ' done' : ''}"></div>`)
    .join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getPlansFromDOM(dayKey) {
  const items = grid.querySelectorAll(`.task-item[data-day-key="${dayKey}"]`);
  return Array.from(items).map(item => ({
    text: item.querySelector('.task-text').value,
    done: item.classList.contains('done'),
  }));
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
function setupDropTarget(tasksEl, dayKey) {
  tasksEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dragging = document.querySelector('.dragging');
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

  tasksEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    const dataTransferText = e.dataTransfer.getData('text/plain');
    if (!dataTransferText) return;
    const { dayKey: sourceDayKey } = JSON.parse(dataTransferText);
    await saveDay(sourceDayKey);
    if (sourceDayKey !== dayKey) await saveDay(dayKey);
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ── Persistence ───────────────────────────────────────────────────────────────
async function saveDay(dayKey) {
  const plans = getPlansFromDOM(dayKey).filter(p => p.text.trim() !== '');
  await window.planner.savePlans(dayKey, plans);
  updatePips(dayKey, plans);
  flashSaved();
}

function flashSaved() {
  if (!flash) return;
  flash.classList.add('show');
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => flash.classList.remove('show'), 1600);
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  prevBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey, -1)));
  nextBtn?.addEventListener('click', async () => loadWeek(await window.planner.offsetWeekKey(currentWeekKey, +1)));

  themeSelect?.addEventListener('change', async (e) => {
    const newTheme = e.target.value;
    applyTheme(newTheme);
    await window.planner.setSetting('theme', newTheme);
  });

  window.planner.onSetMode(async () => {
    currentWeekKey = await window.planner.currentWeekKey();
    loadWeek(currentWeekKey);
  });

  grid?.addEventListener('click', async (e) => {
    const item = e.target.closest('.task-item');
    if (item) {
      const dayKey = item.dataset.dayKey;
      if (e.target.classList.contains('check-btn')) {
        item.classList.toggle('done');
        e.target.textContent = item.classList.contains('done') ? '✓' : '';
        saveDay(dayKey);
      }
      if (e.target.classList.contains('del-btn')) {
        const text = item.querySelector('.task-text').value;
        const isDone = item.classList.contains('done');
        await window.planner.addToRecycleBin({ text, done: isDone, dayKey });
        item.remove();
        saveDay(dayKey);
      }
    } else {
      const addBtn = e.target.closest('.add-task-btn');
      if (addBtn) {
        const dayKey = addBtn.dataset.day;
        const tasksEl = document.getElementById(`tasks-${dayKey}`);
        const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
        tasksEl.appendChild(newItem);
        newItem.querySelector('.task-text').focus();
      }
    }
  });

  openCleanup?.addEventListener('click', () => { renderCleanupList(); cleanupModal.classList.add('show'); });
  closeBanner?.addEventListener('click', () => { staleBanner.classList.remove('show'); });
  closeCleanup?.addEventListener('click', () => { cleanupModal.classList.remove('show'); });
  cleanupList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (btn) handleCleanupAction(parseInt(btn.dataset.index, 10), btn.dataset.action);
  });

  grid?.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('task-text')) {
      const dayKey = e.target.closest('.task-item')?.dataset.dayKey;
      if (dayKey) saveDay(dayKey);
    }
  }, true);

  grid?.addEventListener('input', (e) => {
    if (e.target.classList.contains('task-text')) autoResize(e.target);
  });

  grid?.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('task-text')) return;
    const item = e.target.closest('.task-item');
    const dayKey = item?.dataset.dayKey;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const tasksEl = document.getElementById(`tasks-${dayKey}`);
      const newItem = buildTaskItem(dayKey, { text: '', done: false }, 0);
      tasksEl.appendChild(newItem);
      newItem.querySelector('.task-text').focus();
    }
    if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const prev = item.previousElementSibling;
      item.remove();
      saveDay(dayKey);
      if (prev) prev.querySelector('.task-text')?.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      weekData?.days?.forEach(d => saveDay(d.key));
    }
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
