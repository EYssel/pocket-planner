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

  [ui.prevBtn, ui.nextBtn].forEach((btn, i) => {
    const delta = i === 0 ? -1 : 1;
    btn?.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      btn.classList.add('drag-over');
    });
    btn?.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
    btn?.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      btn.classList.remove('drag-over');
      const data = e.dataTransfer?.getData('text/plain');
      if (!data) return;
      const { dayKey: sourceDayKey, index: sourceIndex } = JSON.parse(data);
      
      const targetWeekKey = await window.planner.offsetWeekKey(state.currentWeekKey!, delta);
      const targetDayKey = delta === 1 
        ? await window.planner.getFirstDayOfWeek(targetWeekKey) 
        : await window.planner.getLastDayOfWeek(targetWeekKey);

      const task = state.deleteTask(sourceDayKey, sourceIndex);
      
      if (task) {
        // If the target is in the currently loaded week, use state.importTask
        const targetInLoadedWeek = state.weekData?.days?.some(d => d.key === targetDayKey);
        if (targetInLoadedWeek) {
          state.importTask(targetDayKey, task);
        } else {
          // Otherwise, manual save (load plans, push, save)
          const targetPlans = await state.getPlansForDay(targetDayKey);
          targetPlans.push(task);
          // Note: When that week is eventually loaded, loadWeek will maintainInvariant
          await window.planner.savePlans(targetDayKey, targetPlans);
        }
        await callbacks.saveDay(sourceDayKey);
      }
    });
  });

  ui.themeSelect?.addEventListener('change', async (e: Event) => {
    const newTheme = (e.target as HTMLSelectElement).value;
    modals.applyTheme(newTheme);
    await window.planner.setSetting('theme' as any, newTheme);
  });

  window.planner.onSetMode(async () => {
    state.setCurrentWeekKey(await window.planner.currentWeekKey());
    callbacks.loadWeek(state.currentWeekKey!);
  });

  let activeNoteDayKey: string | null = null;
  let activeNoteIndex: number | null = null;

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
      const noteBtn = target.closest('.note-btn');

      if (checkBtn) {
        state.toggleTask(dayKey, index);
        await callbacks.saveDay(dayKey);
      } else if (delBtn) {
        const deleted = state.deleteTask(dayKey, index);
        if (deleted) {
          await window.planner.addToRecycleBin({ ...deleted, dayKey });
          await callbacks.saveDay(dayKey);
        }
      } else if (noteBtn) {
        const task = state.weekData?.days?.find(d => d.key === dayKey)?.plans[index];
        if (task) {
          activeNoteDayKey = dayKey;
          activeNoteIndex = index;
          ui.taskNoteInput.value = task.notes || '';
          ui.noteOverlay.classList.add('show');
          setTimeout(() => ui.taskNoteInput.focus(), 100);
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

  let summaryPlainText = '';

  async function generateSummaryForDay(targetDayKey: string) {
    const prevKey = await window.planner.getPreviousWorkingDayKey(targetDayKey);

    const targetPlans = await state.getPlansForDay(targetDayKey);
    const prevPlans = await state.getPlansForDay(prevKey);

    const prevDone = prevPlans.filter(p => p.done && p.text.trim());
    const prevIncomplete = prevPlans.filter(p => !p.done && p.text.trim());
    const targetTodo = targetPlans.filter(p => p.text.trim());

    const formatNotesHtml = (notes?: string) => {
      if (!notes) return '';
      return `<div class="note-text">${ui.renderMarkdown(notes)}</div>`;
    };

    const formatNotesPlain = (notes?: string) => {
      if (!notes) return '';
      return notes.split('\n').map(line => `    - ${line}`).join('\n');
    };

    // Dynamic Labels
    const todayKey = await window.planner.currentDayKey();
    const isToday = targetDayKey === todayKey;
    const targetLabel = isToday ? 'Today' : targetDayKey;
    const prevLabel = isToday ? 'Yesterday' : 'Previous Day';

    if (ui.summaryModalTitle) {
      ui.summaryModalTitle.textContent = isToday ? "Today's Summary" : `Summary for ${targetDayKey}`;
    }

    // Build HTML for the modal
    ui.summaryContent.innerHTML = `
      <div class="summary-section">
        <div class="summary-title">${prevLabel} (Completed)</div>
        <div class="summary-list">
          ${prevDone.length > 0 
            ? prevDone.map(p => `
                <div class="summary-item" style="flex-direction: column; gap: 0;">
                  <div style="display: flex; gap: 12px;">
                    <span class="summary-item-bullet">✓</span>
                    <span>${ui.escapeHtml(p.text)}</span>
                  </div>
                  ${formatNotesHtml(p.notes)}
                </div>`).join('') 
            : '<div class="summary-empty">None recorded</div>'}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">${prevLabel} (Incomplete)</div>
        <div class="summary-list">
          ${prevIncomplete.length > 0 
            ? prevIncomplete.map(p => `
                <div class="summary-item" style="flex-direction: column; gap: 0;">
                  <div style="display: flex; gap: 12px;">
                    <span class="summary-item-bullet">→</span>
                    <span>${ui.escapeHtml(p.text)}</span>
                  </div>
                  ${formatNotesHtml(p.notes)}
                </div>`).join('') 
            : '<div class="summary-empty">None recorded</div>'}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">${targetLabel} (Planned)</div>
        <div class="summary-list">
          ${targetTodo.length > 0 
            ? targetTodo.map(p => `
                <div class="summary-item" style="flex-direction: column; gap: 0;">
                  <div style="display: flex; gap: 12px;">
                    <span class="summary-item-bullet">•</span>
                    <span>${ui.escapeHtml(p.text)}</span>
                  </div>
                  ${formatNotesHtml(p.notes)}
                </div>`).join('') 
            : `<div class="summary-empty">No tasks planned yet</div>`}
        </div>
      </div>
    `;

    // Build plain text for clipboard
    summaryPlainText = `**${prevLabel}:**\n` +
      (prevDone.length > 0 ? prevDone.map(p => `- [DONE] ${p.text}${p.notes ? '\n' + formatNotesPlain(p.notes) : ''}`).join('\n') : '- No completed tasks') +
      `\n\n**${prevLabel} (Incomplete):**\n` +
      (prevIncomplete.length > 0 ? prevIncomplete.map(p => `- [STILL PENDING] ${p.text}${p.notes ? '\n' + formatNotesPlain(p.notes) : ''}`).join('\n') : '- No incomplete tasks') +
      `\n\n**${targetLabel}:**\n` +
      (targetTodo.length > 0 ? targetTodo.map(p => `- ${p.text}${p.notes ? '\n' + formatNotesPlain(p.notes) : ''}`).join('\n') : '- No tasks planned');

    ui.summaryOverlay.classList.add('show');
  }

  ui.generateSummaryBtn?.addEventListener('click', async () => {
    const todayKey = await window.planner.currentDayKey();
    await generateSummaryForDay(todayKey);
  });

  // Handle grid clicks for contextual summaries
  ui.grid.addEventListener('click', async (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.day-summary-btn') as HTMLButtonElement;
    if (btn && btn.dataset.dayKey) {
      await generateSummaryForDay(btn.dataset.dayKey);
    }
  });

  ui.closeSummary?.addEventListener('click', () => ui.summaryOverlay.classList.remove('show'));

  ui.copySummaryBtn?.addEventListener('click', async () => {
    await window.planner.copyToClipboard(summaryPlainText);

    const originalText = ui.copySummaryBtn.textContent;
    ui.copySummaryBtn.textContent = 'Copied!';

    setTimeout(() => {
      ui.copySummaryBtn.textContent = originalText;
    }, 2000);
  });
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

  ui.saveNoteBtn?.addEventListener('click', async () => {
    if (activeNoteDayKey !== null && activeNoteIndex !== null) {
      const newNotes = ui.taskNoteInput.value.trim();
      state.updateTaskNotes(activeNoteDayKey, activeNoteIndex, newNotes);
      await callbacks.saveDay(activeNoteDayKey);
      ui.noteOverlay.classList.remove('show');
      activeNoteDayKey = null;
      activeNoteIndex = null;
    }
  });

  ui.closeNoteModal?.addEventListener('click', () => {
    ui.noteOverlay.classList.remove('show');
    activeNoteDayKey = null;
    activeNoteIndex = null;
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
    ui.installUpdateBtn.disabled = true;
    ui.installUpdateBtn.textContent = 'Restarting...';
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
