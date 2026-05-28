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
        <div class="stale-task-text">${ui.escapeHtml(ui.truncate(task.text))}</div>
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
      todayPlans.push({ text: task.text, done: false, notes: task.notes });
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

export async function renderRecurringList() {
  const tasks = await window.planner.getRecurringTasks();
  ui.recurringList.innerHTML = '';
  
  if (tasks.length === 0) {
    ui.recurringList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No recurring tasks set up.</div>';
    return;
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'WE'];

  tasks.forEach((task) => {
    const item = document.createElement('div');
    item.className = 'stale-task-item'; // Reuse styling
    item.innerHTML = `
      <div class="stale-task-info" style="flex: 1;">
        <div class="stale-task-text">${ui.escapeHtml(task.text)}</div>
        <div class="stale-task-date" style="display: flex; gap: 4px; margin-top: 4px;">
          ${dayNames.map((name, i) => `
            <span style="font-size: 10px; padding: 2px 4px; border-radius: 3px; background: ${task.days.includes(i + 1) ? 'var(--accent)' : 'var(--surface2)'}; color: ${task.days.includes(i + 1) ? 'var(--bg)' : 'var(--muted)'};">
              ${name}
            </span>
          `).join('')}
        </div>
      </div>
      <div class="stale-task-actions">
        <button class="banner-btn action-btn" data-id="${task.id}" data-action="edit" title="Edit">✏️</button>
        <button class="banner-btn action-btn" data-id="${task.id}" data-action="delete" title="Delete Template">🗑️</button>
      </div>
    `;
    ui.recurringList.appendChild(item);
  });
}

export async function handleRecurringAction(id: string, action: string, callbacks: { openSetup: (task: any) => void, loadWeek: (key: string) => Promise<void> }) {
  if (action === 'delete') {
    if (confirm('Stop this recurrence and delete the template? Existing tasks in your weeks will remain.')) {
      await window.planner.deleteRecurringTask(id);
      await renderRecurringList();
      await callbacks.loadWeek(state.currentWeekKey!);
    }
  } else if (action === 'edit') {
    const tasks = await window.planner.getRecurringTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      ui.recurringManagerOverlay.classList.remove('show');
      callbacks.openSetup(task);
    }
  }
}

export function applyAppearance(theme: string, fontSize: string) {
  // Clear existing theme and font classes
  const themeClasses = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
  const fontClasses = Array.from(document.body.classList).filter(c => c.startsWith('font-'));
  if (themeClasses.length > 0) document.body.classList.remove(...themeClasses);
  if (fontClasses.length > 0) document.body.classList.remove(...fontClasses);
  
  if (theme !== 'dark') document.body.classList.add(`theme-${theme}`);
  document.body.classList.add(`font-${fontSize}`);
}

export async function initAppearance() {
  const theme = await window.planner.getSetting('theme');
  const fontSize = await window.planner.getSetting('fontSize');
  if (ui.themeSelect) ui.themeSelect.value = theme;
  if (ui.fontSizeSelect) ui.fontSizeSelect.value = fontSize;
  applyAppearance(theme, fontSize);
}

export async function initReleaseNotes() {
  const { version } = await window.planner.getAppInfo();
  const lastVersion = await window.planner.getSetting('lastRunVersion');

  // Setup settings version button as an on-demand link
  if (ui.settingsVersionBtn) {
    ui.settingsVersionBtn.textContent = `v${version} — What's New?`;
    ui.settingsVersionBtn.addEventListener('click', async () => {
      try {
        ui.settingsOverlay.classList.remove('show');
        const notes = await window.planner.getReleaseNotes();
        
        ui.releaseNotesContent.innerHTML = notes 
          ? await parseMarkdown(notes) 
          : '<div style="padding: 20px; text-align: center; color: var(--muted);">No release notes found for this version.</div>';
        
        ui.releaseNotesOverlay.classList.add('show');
      } catch (err) {
        console.error('Failed to open release notes:', err);
      }
    });
  }

  // Show banner on startup if version has changed
  if (version !== lastVersion) {
    if (ui.releaseNotesBanner) {
      ui.bannerVersion.textContent = `v${version}`;
      ui.releaseNotesBanner.classList.add('show');
    }
    await window.planner.setSetting('lastRunVersion', version);
  }

  ui.viewReleaseNotesBtn?.addEventListener('click', async () => {
    try {
      ui.releaseNotesBanner?.classList.remove('show');
      const notes = await window.planner.getReleaseNotes();
      
      if (ui.releaseNotesContent) {
        ui.releaseNotesContent.innerHTML = notes 
          ? await parseMarkdown(notes) 
          : '<div style="padding: 20px; text-align: center; color: var(--muted);">No release notes found for this version.</div>';
      }
      
      ui.releaseNotesOverlay?.classList.add('show');
    } catch (err) {
      console.error('Failed to open release notes:', err);
    }
  });

  ui.dismissReleaseNotesBtn?.addEventListener('click', () => {
    ui.releaseNotesBanner?.classList.remove('show');
  });

  ui.closeReleaseNotes?.addEventListener('click', () => {
    ui.releaseNotesOverlay?.classList.remove('show');
  });
}

async function parseMarkdown(md: string): Promise<string> {
  const { marked } = await import('marked');
  const renderer = new marked.Renderer();
  
  // Ensure all links open in external browser
  renderer.link = ({ href, title, text }) => {
    const escapedHref = href.replace(/'/g, "\\'");
    return `<a href="#" onclick="window.planner.openExternal('${escapedHref}'); return false;" title="${title || ''}">${text}</a>`;
  };

  // Configure marked for GitHub Flavored Markdown and standard line breaks
  return marked.parse(md, { 
    renderer,
    gfm: true,
    breaks: true
  }) as Promise<string> | string;
}

export function formatShortcutLabel(shortcut: string): string {
  if (!shortcut || shortcut === 'None') return 'None / Disabled';
  return shortcut
    .replace('CommandOrControl', 'Ctrl')
    .replace('CmdOrCtrl', 'Ctrl')
    .replace(/\+/g, ' + ');
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
  const shortcut = await window.planner.getSetting('quickAddShortcut');

  ui.intervalSelect.value = (interval ?? 60).toString();
  ui.collapseDoneSetting.checked = !!collapsedPref;
  state.setDefaultDoneCollapsed(!!collapsedPref);
  ui.workStartInput.value = (workStart ?? 8).toString();
  ui.workEndInput.value   = (workEnd ?? 18).toString();
  if (ui.shortcutDisplayInput) {
    ui.shortcutDisplayInput.value = formatShortcutLabel(shortcut || 'None');
  }

  const { name } = await window.planner.getAppInfo();
  if (!name.includes('Dev') && ui.testNotificationBtn) {
    ui.testNotificationBtn.style.display = 'none';
  }

  const currentWeekKey = await window.planner.currentWeekKey();
  await callbacks.loadWeek(currentWeekKey);
  await callbacks.checkStaleTasks();
}

const OS_INSTRUCTIONS: Record<string, string> = {
  win: `
    <ol>
      <li>Press <code>Win + R</code>, paste <code>%APPDATA%\\weekly-planner</code>, and press Enter to locate your data.</li>
      <li>Locate the file named <code>config.json</code> (or <code>config-dev.json</code> in dev mode) and copy it.</li>
      <li>Download and install <strong>Pocket Planner</strong>. Run it once, then close it completely.</li>
      <li>Press <code>Win + R</code>, paste <code>%APPDATA%\\pocket-planner</code>, and press Enter.</li>
      <li>Paste the copied file in this directory (overwrite the existing <code>config.json</code>).</li>
    </ol>
  `,
  mac: `
    <ol>
      <li>Open Finder, press <code>Cmd + Shift + G</code>, paste <code>~/Library/Application Support/weekly-planner</code>, and press Enter.</li>
      <li>Locate the file named <code>config.json</code> and copy it.</li>
      <li>Download and install <strong>Pocket Planner</strong>. Run it once, then close it completely.</li>
      <li>In Finder, press <code>Cmd + Shift + G</code>, paste <code>~/Library/Application Support/pocket-planner</code>, and press Enter.</li>
      <li>Paste the copied file in this directory (overwrite the existing <code>config.json</code>).</li>
    </ol>
  `,
  linux: `
    <ol>
      <li>Open your terminal and navigate to <code>~/.config/weekly-planner</code>.</li>
      <li>Locate the file named <code>config.json</code> and copy it.</li>
      <li>Download and run the <strong>Pocket Planner</strong> AppImage. Run it once, then close it completely.</li>
      <li>Navigate to <code>~/.config/pocket-planner</code>.</li>
      <li>Paste/move the copied file to this directory, overwriting <code>config.json</code>.</li>
    </ol>
  `
};

export function showMigrationInstructions(os: string) {
  if (ui.rebrandInstructions) {
    ui.rebrandInstructions.innerHTML = OS_INSTRUCTIONS[os] || OS_INSTRUCTIONS.win;
  }
  
  [ui.tabWin, ui.tabMac, ui.tabLinux].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  const activeBtn = os === 'win' ? ui.tabWin : os === 'mac' ? ui.tabMac : ui.tabLinux;
  if (activeBtn) activeBtn.classList.add('active');
}

export function detectUserOS(): string {
  const platform = navigator.platform.toLowerCase();
  const agent = navigator.userAgent.toLowerCase();
  if (platform.includes('mac') || agent.includes('macintosh')) return 'mac';
  if (platform.includes('linux') || agent.includes('linux')) return 'linux';
  return 'win';
}
