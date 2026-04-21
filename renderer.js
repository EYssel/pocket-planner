// ── State ────────────────────────────────────────────────────────────────────
let plans = [];
let currentMode = 'planner';
let currentWeekKey = null;   // e.g. "2026-W16"
let currentWeekInfo = null;  // { key, cwLabel, dateRange, year, week }

// ── DOM refs ─────────────────────────────────────────────────────────────────
const taskList     = document.getElementById('task-list');
const addBtn       = document.getElementById('add-btn');
const clearDoneBtn = document.getElementById('clear-done-btn');
const cwLabel      = document.getElementById('cw-label');
const weekLabel    = document.getElementById('week-label');
const prevBtn      = document.getElementById('prev-week');
const nextBtn      = document.getElementById('next-week');
const progressRow  = document.getElementById('progress-row');
const progressFill = document.getElementById('progress-fill');
const progressLbl  = document.getElementById('progress-label');
const modeBanner   = document.getElementById('mode-banner');
const modeText     = document.getElementById('mode-text');
const savedFlash   = document.getElementById('saved-flash');

// ── Week key helpers ──────────────────────────────────────────────────────────
function getCurrentISOWeekKey() {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weeksInYear(year) {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay();
  return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

function offsetWeekKey(key, delta) {
  const [yearStr, wStr] = key.split('-W');
  let year = parseInt(yearStr, 10);
  let week = parseInt(wStr, 10) + delta;
  while (week < 1) { year--; week += weeksInYear(year); }
  while (week > weeksInYear(year)) { week -= weeksInYear(year); year++; }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  currentWeekKey = getCurrentISOWeekKey();
  await loadWeek(currentWeekKey);
}

async function loadWeek(key) {
  currentWeekKey = key;
  currentWeekInfo = await window.planner.getWeekInfo(key);
  plans = await window.planner.getPlans(key);

  cwLabel.textContent   = currentWeekInfo.cwLabel;
  weekLabel.textContent = currentWeekInfo.dateRange;
  nextBtn.disabled = (key === getCurrentISOWeekKey());

  renderTasks();
}

// ── Navigation ────────────────────────────────────────────────────────────────
prevBtn.addEventListener('click', () => loadWeek(offsetWeekKey(currentWeekKey, -1)));
nextBtn.addEventListener('click', () => loadWeek(offsetWeekKey(currentWeekKey, +1)));

// ── Mode ──────────────────────────────────────────────────────────────────────
function applyMode(mode) {
  currentMode = mode;
  if (mode === 'checkin') {
    modeText.textContent = 'Morning check-in — how are things going?';
    modeBanner.classList.add('checkin');
  } else {
    modeText.textContent = 'Plan your week — add and prioritise your tasks';
    modeBanner.classList.remove('checkin');
  }
}

window.planner.onSetMode((mode) => {
  currentWeekKey = getCurrentISOWeekKey();
  loadWeek(currentWeekKey);
  applyMode(mode);
});

// ── Render ────────────────────────────────────────────────────────────────────
function renderTasks() {
  taskList.innerHTML = '';

  if (plans.length === 0) {
    taskList.innerHTML = `
      <div class="empty">
        <div class="icon">📋</div>
        No tasks yet.<br>Add something to focus on this week.
      </div>`;
    progressRow.style.display = 'none';
    return;
  }

  plans.forEach((task, i) => {
    const item = document.createElement('div');
    item.className = 'task-item' + (task.done ? ' done' : '');
    item.dataset.index = i;
    item.innerHTML = `
      <button class="check-btn" data-i="${i}" title="Toggle done">✓</button>
      <input class="task-text" type="text" value="${escapeHtml(task.text)}" placeholder="Task…" data-i="${i}" />
      <button class="del-btn" data-i="${i}" title="Delete">×</button>
    `;
    taskList.appendChild(item);
  });

  updateProgress();
}

function updateProgress() {
  const total = plans.length;
  const done  = plans.filter(t => t.done).length;
  if (total === 0) { progressRow.style.display = 'none'; return; }
  progressRow.style.display = 'flex';
  progressFill.style.width = Math.round((done / total) * 100) + '%';
  progressLbl.textContent  = `${done} / ${total}`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  const toSave = plans.filter(t => t.text.trim() !== '');
  await window.planner.savePlans(currentWeekKey, toSave);
  flashSaved();
}

function flashSaved() {
  savedFlash.classList.add('show');
  setTimeout(() => savedFlash.classList.remove('show'), 1800);
}

// ── Events ────────────────────────────────────────────────────────────────────
addBtn.addEventListener('click', () => {
  plans.push({ text: '', done: false });
  renderTasks();
  const inputs = taskList.querySelectorAll('.task-text');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

taskList.addEventListener('click', (e) => {
  const i = parseInt(e.target.dataset.i, 10);
  if (isNaN(i)) return;
  if (e.target.classList.contains('check-btn')) { plans[i].done = !plans[i].done; renderTasks(); save(); }
  if (e.target.classList.contains('del-btn'))   { plans.splice(i, 1); renderTasks(); save(); }
});

taskList.addEventListener('input', (e) => {
  if (e.target.classList.contains('task-text')) {
    const i = parseInt(e.target.dataset.i, 10);
    if (!isNaN(i)) plans[i].text = e.target.value;
  }
});

// Save on blur (focus leaving a task input)
taskList.addEventListener('focusout', (e) => {
  if (e.target.classList.contains('task-text')) save();
});

taskList.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('task-text')) {
    e.preventDefault(); addBtn.click();
  }
  if (e.key === 'Backspace' && e.target.classList.contains('task-text')) {
    const i = parseInt(e.target.dataset.i, 10);
    if (!isNaN(i) && plans[i].text === '') {
      e.preventDefault();
      plans.splice(i, 1);
      renderTasks();
      save();
      const inputs = taskList.querySelectorAll('.task-text');
      if (inputs.length) inputs[Math.max(0, i - 1)].focus();
    }
  }
});

clearDoneBtn.addEventListener('click', () => {
  plans = plans.filter(t => !t.done);
  renderTasks();
  save();
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();