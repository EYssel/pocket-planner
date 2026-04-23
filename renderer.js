'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentWeekKey = null;
let weekData       = null; // { cwLabel, dateRange, days: [...] }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const grid      = document.getElementById('week-grid');
const cwLabel   = document.getElementById('cw-label');
const weekLabel = document.getElementById('week-label');
const prevBtn   = document.getElementById('prev-week');
const nextBtn   = document.getElementById('next-week');
const flash     = document.getElementById('saved-flash');

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  currentWeekKey = window.planner.currentWeekKey();
  await loadWeek(currentWeekKey);
}

async function loadWeek(key) {
  currentWeekKey = key;
  weekData = await window.planner.getWeek(key);
  cwLabel.textContent   = weekData.cwLabel;
  weekLabel.textContent = weekData.dateRange;
  nextBtn.disabled = (key === window.planner.currentWeekKey());
  renderGrid();
}

// ── Navigation ────────────────────────────────────────────────────────────────
prevBtn.addEventListener('click', () => loadWeek(window.planner.offsetWeekKey(currentWeekKey, -1)));
nextBtn.addEventListener('click', () => loadWeek(window.planner.offsetWeekKey(currentWeekKey, +1)));

// ── Mode (from notifications) ─────────────────────────────────────────────────
window.planner.onSetMode(() => {
  currentWeekKey = window.planner.currentWeekKey();
  loadWeek(currentWeekKey);
});

// ── Render ────────────────────────────────────────────────────────────────────
function renderGrid() {
  grid.innerHTML = '';
  weekData.days.forEach(day => grid.appendChild(buildDayCol(day)));
}

function buildDayCol(day) {
  const col = document.createElement('div');
  col.className = 'day-col' + (day.isToday ? ' today' : '');
  col.dataset.dayKey = day.key;

  // Header
  col.innerHTML = `
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

  // Render tasks into the tasks div
  const tasksEl = col.querySelector(`#tasks-${day.key}`);
  day.plans.forEach((task, i) => tasksEl.appendChild(buildTaskItem(day.key, task, i)));
  updatePips(day.key, day.plans);

  return col;
}

function buildTaskItem(dayKey, task, index) {
  const item = document.createElement('div');
  item.className = 'task-item' + (task.done ? ' done' : '');
  item.dataset.dayKey = dayKey;
  item.dataset.index  = index;

  item.innerHTML = `
    <button class="check-btn" title="Toggle">${task.done ? '✓' : ''}</button>
    <textarea class="task-text" placeholder="Task…" rows="1">${escapeHtml(task.text)}</textarea>
    <button class="del-btn" title="Delete">×</button>
  `;

  // Auto-resize textarea
  const ta = item.querySelector('.task-text');
  requestAnimationFrame(() => autoResize(ta));
  ta.addEventListener('input', () => autoResize(ta));

  return item;
}

function autoResize(ta) {
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
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Helper: get live plans for a day from the DOM ─────────────────────────────
function getPlansFromDOM(dayKey) {
  const items = grid.querySelectorAll(`.task-item[data-day-key="${dayKey}"]`);
  return Array.from(items).map(item => ({
    text: item.querySelector('.task-text').value,
    done: item.classList.contains('done'),
  }));
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveDay(dayKey) {
  const plans = getPlansFromDOM(dayKey).filter(p => p.text.trim() !== '');
  await window.planner.savePlans(dayKey, plans);
  // Update pip row without full re-render
  updatePips(dayKey, plans);
  flashSaved();
}

function flashSaved() {
  flash.classList.add('show');
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => flash.classList.remove('show'), 1600);
}

// ── Events (delegated on grid) ────────────────────────────────────────────────
grid.addEventListener('click', (e) => {
  const item   = e.target.closest('.task-item');
  const dayKey = item?.dataset.dayKey;
  if (!item || !dayKey) return;

  if (e.target.classList.contains('check-btn')) {
    item.classList.toggle('done');
    const isDone = item.classList.contains('done');
    e.target.textContent = isDone ? '✓' : '';
    saveDay(dayKey);
  }

  if (e.target.classList.contains('del-btn')) {
    item.remove();
    saveDay(dayKey);
  }
});

// Add task button
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-task-btn');
  if (!btn) return;
  const dayKey  = btn.dataset.day;
  const tasksEl = document.getElementById(`tasks-${dayKey}`);
  const plans   = getPlansFromDOM(dayKey);
  const newItem = buildTaskItem(dayKey, { text: '', done: false }, plans.length);
  tasksEl.appendChild(newItem);
  newItem.querySelector('.task-text').focus();
});

// Save on blur of any task textarea
grid.addEventListener('focusout', (e) => {
  if (e.target.classList.contains('task-text')) {
    const dayKey = e.target.closest('.task-item')?.dataset.dayKey;
    if (dayKey) saveDay(dayKey);
  }
});

// Textarea live input
grid.addEventListener('input', (e) => {
  if (e.target.classList.contains('task-text')) autoResize(e.target);
});

// Enter to add next task; Backspace on empty to delete
grid.addEventListener('keydown', (e) => {
  if (!e.target.classList.contains('task-text')) return;
  const item   = e.target.closest('.task-item');
  const dayKey = item?.dataset.dayKey;

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const tasksEl = document.getElementById(`tasks-${dayKey}`);
    const plans   = getPlansFromDOM(dayKey);
    const newItem = buildTaskItem(dayKey, { text: '', done: false }, plans.length);
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

// Ctrl+S saves all days
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    weekData.days.forEach(d => saveDay(d.key));
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();