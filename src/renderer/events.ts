'use strict';

import * as state from './state';
import * as ui from './ui';
import * as modals from './modals';

export function setupEventListeners(callbacks: {
  loadWeek: (key: string) => Promise<void>,
  saveDay: (dayKey: string) => Promise<void>,
  checkStaleTasks: () => Promise<void>
}) {
  ui.prevBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.offsetWeekKey(state.currentWeekKey!, -1)));
  ui.nextBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.offsetWeekKey(state.currentWeekKey!, +1)));
  ui.todayBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.currentWeekKey()));

  ui.themeSelect?.addEventListener('change', async (e: Event) => {
    const newTheme = (e.target as HTMLSelectElement).value;
    modals.applyTheme(newTheme);
    await window.planner.setSetting('theme' as any, newTheme);
  });

  window.planner.onSetMode(async () => {
    state.setCurrentWeekKey(await window.planner.currentWeekKey());
    callbacks.loadWeek(state.currentWeekKey!);
  });

  ui.grid?.addEventListener('click', async (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const doneHeader = target.closest('.done-header');
    if (doneHeader) {
      const section = doneHeader.closest('.done-section') as HTMLElement;
      const dayKey = (doneHeader.closest('.day-section') as HTMLElement).dataset.dayKey!;
      section.classList.toggle('collapsed');
      localStorage.setItem(`done-collapsed-${dayKey}`, section.classList.contains('collapsed').toString());
      return;
    }

    const item = target.closest('.task-item') as HTMLElement;
    if (item) {
      const dayKey = item.dataset.dayKey!;
      const index = parseInt(item.dataset.index!, 10);
      const checkBtn = target.closest('.check-btn');
      const delBtn = target.closest('.del-btn');

      if (checkBtn) {
        state.toggleTask(dayKey, index);
        await callbacks.saveDay(dayKey);
      } else if (delBtn) {
        const deleted = state.deleteTask(dayKey, index);
        if (deleted) {
          await window.planner.addToRecycleBin({ ...deleted, dayKey });
          await callbacks.saveDay(dayKey);
        }
      }
    } else {
      const addBtn = target.closest('.add-task-btn') as HTMLButtonElement;
      if (addBtn) {
        const dayKey = addBtn.dataset.day!;
        state.addTask(dayKey);
        await callbacks.saveDay(dayKey);
        
        // Focus the new task
        const tasksEl = document.getElementById(`tasks-${dayKey}`);
        if (tasksEl) {
          const items = tasksEl.querySelectorAll('.task-item');
          const lastItem = items[items.length - 1] as HTMLElement;
          if (lastItem) {
            lastItem.classList.add('editing');
            lastItem.querySelector<HTMLTextAreaElement>('.task-edit')?.focus();
          }
        }
      }
    }
  });

  ui.openCleanup?.addEventListener('click', () => { modals.renderCleanupList(); ui.cleanupModal.classList.add('show'); });
  ui.closeBanner?.addEventListener('click', () => { ui.staleBanner.classList.remove('show'); });
  ui.closeCleanup?.addEventListener('click', () => { ui.cleanupModal.classList.remove('show'); });
  ui.cleanupList?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.action-btn') as HTMLButtonElement;
    if (btn) modals.handleCleanupAction(parseInt(btn.dataset.index!, 10), btn.dataset.action!, { loadWeek: callbacks.loadWeek });
  });

  ui.openRecycleBin?.addEventListener('click', () => { modals.renderRecycleBin(); ui.recycleBinOverlay.classList.add('show'); });
  ui.closeRecycleBin?.addEventListener('click', () => { ui.recycleBinOverlay.classList.remove('show'); });
  ui.clearBinBtn?.addEventListener('click', async () => {
    if (confirm('Permanently clear all items in the recycle bin?')) {
      await window.planner.clearRecycleBin();
      modals.renderRecycleBin();
    }
  });
  ui.recycleBinList?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.action-btn') as HTMLButtonElement;
    if (btn) modals.handleBinAction(parseInt(btn.dataset.index!, 10), btn.dataset.action!, { loadWeek: callbacks.loadWeek });
  });

  ui.openSettings?.addEventListener('click',  () => ui.settingsOverlay.classList.add('show'));
  ui.closeSettings?.addEventListener('click', () => ui.settingsOverlay.classList.remove('show'));

  window.planner.onCheckingForUpdates(() => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = '<strong>Checking for updates…</strong>';
    ui.updateProgressContainer.style.display = 'none';
    ui.installUpdateBtn.style.display = 'none';
  });

  window.planner.onUpdateAvailable((version: string) => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = `<strong>Downloading Update</strong> Version ${version} is being prepared…`;
    ui.updateProgressContainer.style.display = 'block';
    ui.updateProgressBar.style.width = '0%';
    ui.installUpdateBtn.style.display = 'inline-block';
    ui.installUpdateBtn.disabled = true;
    ui.installUpdateBtn.textContent = 'Downloading…';
  });

  window.planner.onUpdateNotAvailable(() => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = '<strong>App Up to Date</strong> No updates available at this time.';
    ui.updateProgressContainer.style.display = 'none';
    ui.installUpdateBtn.style.display = 'none';
    
    setTimeout(() => {
      ui.updateBanner.classList.remove('show');
    }, 3000);
  });

  window.planner.onUpdateProgress((percent: number) => {
    ui.updateBanner.classList.add('show');
    ui.updateProgressContainer.style.display = 'block';
    ui.updateProgressBar.style.width = `${percent}%`;
    ui.updateStatus.innerHTML = `<strong>Downloading Update</strong> Progress: ${percent}%`;
  });

  window.planner.onUpdateDownloaded(() => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = '<strong>Update Ready</strong> A new version has been downloaded.';
    ui.updateProgressContainer.style.display = 'none';
    ui.installUpdateBtn.disabled = false;
    ui.installUpdateBtn.textContent = 'Restart to Install';
  });

  ui.installUpdateBtn?.addEventListener('click', () => {
    window.planner.installUpdate();
  });

  ui.closeUpdateBanner?.addEventListener('click', () => {
    ui.updateBanner.classList.remove('show');
  });

  ui.intervalSelect?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('notificationInterval' as any, parseInt((e.target as HTMLSelectElement).value, 10));
  });

  ui.workStartInput?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('workStart' as any, parseInt((e.target as HTMLInputElement).value, 10));
  });

  ui.workEndInput?.addEventListener('change', async (e: Event) => {
    await window.planner.setSetting('workEnd' as any, parseInt((e.target as HTMLInputElement).value, 10));
  });

  ui.collapseDoneSetting?.addEventListener('change', async (e: Event) => {
    const newVal = (e.target as HTMLInputElement).checked;
    state.setDefaultDoneCollapsed(newVal);
    await window.planner.setSetting('doneTasksCollapsed' as any, newVal);
  });

  ui.grid?.addEventListener('focusout', (e: FocusEvent) => {
    if ((e.target as HTMLElement).classList.contains('task-edit')) {
      const dayKey = (e.target as HTMLElement).closest('.task-item')?.getAttribute('data-day-key');
      if (dayKey) callbacks.saveDay(dayKey);
    }
  }, true);

  ui.grid?.addEventListener('input', (e: Event) => {
    if ((e.target as HTMLElement).classList.contains('task-edit')) ui.autoResize(e.target as HTMLTextAreaElement);
  });

  ui.grid?.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (!(e.target as HTMLElement).classList.contains('task-edit')) return;
    const item = (e.target as HTMLElement).closest('.task-item') as HTMLElement;
    const dayKey = item?.dataset.dayKey!;
    const index = parseInt(item.dataset.index!, 10);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      state.addTask(dayKey);
      await callbacks.saveDay(dayKey);
      
      const tasksEl = document.getElementById(`tasks-${dayKey}`);
      if (tasksEl) {
        const items = tasksEl.querySelectorAll('.task-item');
        const lastItem = items[items.length - 1] as HTMLElement;
        if (lastItem) {
          lastItem.classList.add('editing');
          lastItem.querySelector<HTMLTextAreaElement>('.task-edit')?.focus();
        }
      }
    }
    if (e.key === 'Backspace' && (e.target as HTMLTextAreaElement).value === '') {
      e.preventDefault();
      const prev = item.previousElementSibling as HTMLElement;
      state.deleteTask(dayKey, index);
      await callbacks.saveDay(dayKey);
      
      if (prev && prev.classList.contains('task-item')) {
        prev.classList.add('editing');
        const prevEdit = prev.querySelector('.task-edit') as HTMLTextAreaElement;
        prevEdit?.focus();
      }
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      state.weekData?.days?.forEach((d: any) => callbacks.saveDay(d.key));
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.task-edit').forEach(ta => ui.autoResize(ta as HTMLTextAreaElement));
  });
}
