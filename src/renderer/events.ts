'use strict';

import * as state from './state';
import * as ui from './ui';
import * as modals from './modals';

const KEY_CODE_MAP: Record<string, string> = {
  // Letters
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',

  // Digits
  Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',

  // Special keys
  Space: 'Space',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Tab: 'Tab',
  Enter: 'Enter',
  NumpadEnter: 'Enter',

  // Arrows
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',

  // Page navigation
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',

  // Function keys
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  F13: 'F13', F14: 'F14', F15: 'F15', F16: 'F16', F17: 'F17', F18: 'F18',
  F19: 'F19', F20: 'F20', F21: 'F21', F22: 'F22', F23: 'F23', F24: 'F24',

  // Punctuation / Symbols
  Minus: 'Minus',
  Equal: 'Equal',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Slash: '/',
  
  // Numpad symbols
  NumpadMultiply: '*',
  NumpadAdd: 'Plus',
  NumpadSubtract: 'Minus',
  NumpadDecimal: '.',
  NumpadDivide: '/'
};

export function setupEventListeners(callbacks: {
  loadWeek: (key: string) => Promise<void>,
  saveDay: (dayKey: string) => Promise<void>,
  checkStaleTasks: () => Promise<void>
}) {
  ui.prevBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.offsetWeekKey(state.currentWeekKey!, -1)));
  ui.nextBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.offsetWeekKey(state.currentWeekKey!, +1)));
  ui.todayBtn?.addEventListener('click', async () => callbacks.loadWeek(await window.planner.currentWeekKey()));

  ui.syncRecurringBtn?.addEventListener('click', async () => {
    if (state.currentWeekKey) {
      ui.syncRecurringBtn.classList.add('rotating');
      await state.syncRecurringTasks(state.currentWeekKey, { loadWeek: callbacks.loadWeek });
      ui.syncRecurringBtn.classList.remove('rotating');
    }
  });

  ui.openRecurringManager?.addEventListener('click', async () => {
    await modals.renderRecurringList();
    ui.recurringManagerOverlay.classList.add('show');
  });

  ui.closeRecurringManager?.addEventListener('click', () => {
    ui.recurringManagerOverlay.classList.remove('show');
  });

  ui.recurringList?.addEventListener('click', async (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.action-btn') as HTMLButtonElement;
    if (btn) {
      await modals.handleRecurringAction(btn.dataset.id!, btn.dataset.action!, { 
        openSetup: openRecurrenceSetup,
        loadWeek: callbacks.loadWeek 
      });
    }
  });

  let activeRecurrenceTask: any = null;

  function openRecurrenceSetup(taskTemplate: any) {
    activeRecurrenceTask = taskTemplate;
    ui.recurrenceTaskText.textContent = taskTemplate.text;
    
    // Reset checks
    const checks = ui.recurrenceSetupOverlay.querySelectorAll('.day-check') as NodeListOf<HTMLInputElement>;
    checks.forEach(c => {
      c.checked = taskTemplate.days ? taskTemplate.days.includes(parseInt(c.value, 10)) : false;
    });

    ui.stopRecurrenceBtn.style.display = taskTemplate.id ? 'inline-block' : 'none';
    ui.recurrenceSetupOverlay.classList.add('show');
  }

  ui.saveRecurrenceBtn?.addEventListener('click', async () => {
    if (activeRecurrenceTask) {
      const checks = ui.recurrenceSetupOverlay.querySelectorAll('.day-check') as NodeListOf<HTMLInputElement>;
      const selectedDays = Array.from(checks).filter(c => c.checked).map(c => parseInt(c.value, 10));
      
      if (selectedDays.length === 0) {
        alert('Please select at least one day.');
        return;
      }

      const template = {
        id: activeRecurrenceTask.id || `rec-${Date.now()}`,
        text: activeRecurrenceTask.text,
        days: selectedDays
      };

      await window.planner.saveRecurringTask(template);
      
      // If we upgraded a task, update its recurringId in the current view
      if (activeRecurrenceTask.dayKey !== undefined) {
        const day = state.weekData?.days?.find(d => d.key === activeRecurrenceTask.dayKey);
        if (day && day.plans[activeRecurrenceTask.index]) {
          day.plans[activeRecurrenceTask.index].recurringId = template.id;
          await callbacks.saveDay(activeRecurrenceTask.dayKey);
        }
      }

      ui.recurrenceSetupOverlay.classList.remove('show');
      await state.syncRecurringTasks(state.currentWeekKey!, { loadWeek: callbacks.loadWeek });
    }
  });

  ui.stopRecurrenceBtn?.addEventListener('click', async () => {
    if (activeRecurrenceTask && activeRecurrenceTask.id) {
      if (confirm('Stop this recurrence and delete the template? Existing tasks in your weeks will remain.')) {
        await window.planner.deleteRecurringTask(activeRecurrenceTask.id);
        ui.recurrenceSetupOverlay.classList.remove('show');
        await callbacks.loadWeek(state.currentWeekKey!);
      }
    }
  });

  ui.closeRecurrenceSetup?.addEventListener('click', () => {
    ui.recurrenceSetupOverlay.classList.remove('show');
    activeRecurrenceTask = null;
  });

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

  ui.themeSelect?.addEventListener('change', async () => {
    const theme = ui.themeSelect.value;
    const fontSize = ui.fontSizeSelect.value;
    modals.applyAppearance(theme, fontSize);
    await window.planner.setSetting('theme' as any, theme);
  });

  ui.fontSizeSelect?.addEventListener('change', async () => {
    const theme = ui.themeSelect.value;
    const fontSize = ui.fontSizeSelect.value;
    modals.applyAppearance(theme, fontSize);
    await window.planner.setSetting('fontSize' as any, fontSize);
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
      const recurBtn = target.closest('.recur-btn');

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
      } else if (recurBtn) {
        const task = state.weekData?.days?.find(d => d.key === dayKey)?.plans[index];
        if (task) {
          if (task.recurringId) {
            const templates = await window.planner.getRecurringTasks();
            const template = templates.find(t => t.id === task.recurringId);
            if (template) {
              openRecurrenceSetup({ ...template, dayKey, index });
            } else {
              // Template missing? treat as new
              openRecurrenceSetup({ text: task.text, dayKey, index });
            }
          } else {
            openRecurrenceSetup({ text: task.text, dayKey, index });
          }
        }
      }
    } else {
      const addBtn = target.closest('.add-task-btn') as HTMLButtonElement;
      if (addBtn) {
        const dayKey = addBtn.dataset.day!;
        state.addTask(dayKey);
        
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
                    <span>${ui.escapeHtml(ui.truncate(p.text))}</span>
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
                    <span>${ui.escapeHtml(ui.truncate(p.text))}</span>
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
                    <span>${ui.escapeHtml(ui.truncate(p.text))}</span>
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

  // Configurable shortcut recording
  let originalShortcutText = '';
  let recordedShortcut = '';

  ui.shortcutDisplayInput?.addEventListener('focus', () => {
    originalShortcutText = ui.shortcutDisplayInput.value;
    ui.shortcutDisplayInput.value = '';
    ui.shortcutDisplayInput.placeholder = 'Press key combination...';
    ui.shortcutDisplayInput.classList.add('recording');
    recordedShortcut = '';
  });

  ui.shortcutDisplayInput?.addEventListener('blur', () => {
    ui.shortcutDisplayInput.classList.remove('recording');
    ui.shortcutDisplayInput.placeholder = 'Click to record...';
    if (!recordedShortcut) {
      ui.shortcutDisplayInput.value = originalShortcutText;
    }
  });

  ui.shortcutDisplayInput?.addEventListener('keydown', async (e: KeyboardEvent) => {
    e.preventDefault();
    
    if (e.key === 'Escape') {
      recordedShortcut = '';
      ui.shortcutDisplayInput.blur();
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    // If it's a modifier key, update the display with the modifier combination so far
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      const displayModifiers: string[] = [];
      if (e.ctrlKey || e.metaKey) displayModifiers.push('Ctrl');
      if (e.altKey) displayModifiers.push('Alt');
      if (e.shiftKey) displayModifiers.push('Shift');
      ui.shortcutDisplayInput.value = displayModifiers.join(' + ') + (displayModifiers.length > 0 ? ' + ...' : '');
      return;
    }

    // Map other keys
    let key = '';
    const code = e.code;
    if (code && KEY_CODE_MAP[code]) {
      key = KEY_CODE_MAP[code];
    } else {
      // Fallback mapping for keys without code layout or layout-independent cases
      key = e.key;
      if (key === ' ' || key === '\u00A0') {
        key = 'Space';
      } else if (key === '+') {
        key = 'Plus';
      } else if (key === '-') {
        key = 'Minus';
      } else if (key.length === 1) {
        key = key.toUpperCase();
      } else if (key === 'ArrowUp') {
        key = 'Up';
      } else if (key === 'ArrowDown') {
        key = 'Down';
      } else if (key === 'ArrowLeft') {
        key = 'Left';
      } else if (key === 'ArrowRight') {
        key = 'Right';
      } else if (key.match(/^F[1-9][0-2]?$/)) {
        // F1-F12 keys are fine as-is
      } else {
        // Ignore other keys like Tab, Backspace, CapsLock, etc. if not matched
        return;
      }
    }

    if (modifiers.length > 0) {
      recordedShortcut = [...modifiers, key].join('+');
      await window.planner.setSetting('quickAddShortcut', recordedShortcut);
      ui.shortcutDisplayInput.value = modals.formatShortcutLabel(recordedShortcut);
      ui.shortcutDisplayInput.blur();
    }
  });

  ui.clearShortcutBtn?.addEventListener('click', async () => {
    recordedShortcut = 'None';
    await window.planner.setSetting('quickAddShortcut', recordedShortcut);
    if (ui.shortcutDisplayInput) {
      ui.shortcutDisplayInput.value = modals.formatShortcutLabel(recordedShortcut);
    }
  });

  // plans-updated live refresh
  window.planner.onPlansUpdated(async (data: { dayKey: string }) => {
    if (state.currentWeekKey) {
      const weekKey = await window.planner.weekKeyFromDayKey(data.dayKey);
      if (weekKey === state.currentWeekKey) {
        await callbacks.loadWeek(state.currentWeekKey);
      }
    }
  });

  window.planner.onCheckingForUpdates(() => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = '<strong>Checking for updates…</strong>';
    ui.updateProgressContainer.style.display = 'none';
    ui.installUpdateBtn.style.display = 'none';
  });

  window.planner.onUpdateAvailable((version: string, isMac: boolean) => {
    ui.updateBanner.classList.add('show');
    if (isMac) {
      ui.updateStatus.innerHTML = `<strong>Update Available</strong> Version ${version} is ready. Run <code>brew upgrade weekly-planner</code> or download manual update.`;
      ui.updateProgressContainer.style.display = 'none';
      ui.installUpdateBtn.style.display = 'inline-block';
      ui.installUpdateBtn.disabled = false;
      ui.installUpdateBtn.textContent = 'Download Update';
      
      // Setup macOS specific button
      ui.copyMacCmdBtn.style.display = 'inline-block';
      const cmd = `xattr -cr "/Applications/Weekly Planner.app" 2>/dev/null; xattr -cr ~/Downloads/Weekly*Planner*${version}*.dmg 2>/dev/null`;
      ui.copyMacCmdBtn.onclick = async () => {
        await window.planner.copyToClipboard(cmd);
        const originalText = ui.copyMacCmdBtn.textContent;
        ui.copyMacCmdBtn.textContent = 'Copied Command!';
        setTimeout(() => ui.copyMacCmdBtn.textContent = originalText, 2000);
      };
      
      // Override install button to open releases page
      ui.installUpdateBtn.onclick = () => {
        window.planner.openReleasesPage();
      };
    } else {
      ui.updateStatus.innerHTML = `<strong>Downloading Update</strong> Version ${version} is being prepared…`;
      ui.updateProgressContainer.style.display = 'block';
      ui.updateProgressBar.style.width = '0%';
      ui.installUpdateBtn.style.display = 'inline-block';
      ui.installUpdateBtn.disabled = true;
      ui.installUpdateBtn.textContent = 'Downloading…';
      ui.copyMacCmdBtn.style.display = 'none';
    }
  });

  window.planner.onUpdateNotAvailable(() => {
    ui.updateBanner.classList.add('show');
    ui.updateStatus.innerHTML = '<strong>App Up to Date</strong> No updates available at this time.';
    ui.updateProgressContainer.style.display = 'none';
    ui.installUpdateBtn.style.display = 'none';
    ui.copyMacCmdBtn.style.display = 'none';
    
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
    ui.copyMacCmdBtn.style.display = 'none';

    // Ensure it's bound to install
    ui.installUpdateBtn.onclick = () => {
      ui.installUpdateBtn.disabled = true;
      ui.installUpdateBtn.textContent = 'Restarting...';
      window.planner.installUpdate();
    };
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

  ui.testNotificationBtn?.addEventListener('click', async () => {
    await window.planner.testNotification();
  });

  ui.grid?.addEventListener('focusout', async (e: FocusEvent) => {
    if ((e.target as HTMLElement).classList.contains('task-edit')) {
      const item = (e.target as HTMLElement).closest('.task-item') as HTMLElement;
      const dayKey = item?.getAttribute('data-day-key');
      const index = parseInt(item?.dataset.index || '-1', 10);
      if (dayKey) {
        await callbacks.saveDay(dayKey);
        
        // If it's a recurring task, update the template if text changed
        const task = state.weekData?.days?.find(d => d.key === dayKey)?.plans[index];
        if (task && task.recurringId) {
          const templates = await window.planner.getRecurringTasks();
          const template = templates.find(t => t.id === task.recurringId);
          if (template && template.text !== task.text) {
            template.text = task.text;
            await window.planner.saveRecurringTask(template);
            // Optionally reload to update other instances in view
            // but that might be jarring while typing/focusing out.
          }
        }
      }
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
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      ui.searchOverlay.classList.add('show');
      setTimeout(() => ui.searchInput.focus(), 100);
      performSearch();
    }
    if (e.key === 'Escape') {
      if (ui.searchOverlay.classList.contains('show')) {
        ui.searchOverlay.classList.remove('show');
        ui.searchInput.value = '';
        ui.searchResultsList.innerHTML = '';
      }
    }
  });

  // ── Global Search Event Listeners ──────────────────────────────────────────

  let searchTimeout: any = null;
  let activeSearchScope = 'all';
  let activeSearchStatus = 'all';

  const performSearch = async () => {
    const query = ui.searchInput.value.trim();
    if (!query) {
      ui.searchResultsList.innerHTML = '';
      return;
    }

    const results = await window.planner.searchPlans(query, {
      scope: activeSearchScope,
      status: activeSearchStatus
    });

    ui.renderSearchResults(results, query);
  };

  const debouncedSearch = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 200);
  };

  ui.openSearchBtn?.addEventListener('click', () => {
    ui.searchOverlay.classList.add('show');
    setTimeout(() => ui.searchInput.focus(), 100);
    performSearch();
  });

  ui.closeSearchModalBtn?.addEventListener('click', () => {
    ui.searchOverlay.classList.remove('show');
    ui.searchInput.value = '';
    ui.searchResultsList.innerHTML = '';
  });

  ui.searchInput?.addEventListener('input', debouncedSearch);

  ui.searchScopeFilters?.addEventListener('click', (e: MouseEvent) => {
    const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
    if (chip) {
      ui.searchScopeFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeSearchScope = chip.dataset.value || 'all';
      performSearch();
    }
  });

  ui.searchStatusFilters?.addEventListener('click', (e: MouseEvent) => {
    const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
    if (chip) {
      ui.searchStatusFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeSearchStatus = chip.dataset.value || 'all';
      performSearch();
    }
  });

  ui.searchResultsList?.addEventListener('click', async (e: MouseEvent) => {
    const item = (e.target as HTMLElement).closest('.search-result-item') as HTMLElement;
    if (!item) return;

    const dayKey = item.dataset.dayKey!;
    const weekKey = item.dataset.weekKey!;
    const index = parseInt(item.dataset.index!, 10);

    ui.searchOverlay.classList.remove('show');
    ui.searchInput.value = '';
    ui.searchResultsList.innerHTML = '';

    await callbacks.loadWeek(weekKey);

    const doneSection = document.getElementById(`done-section-${dayKey}`);
    const taskItem = document.querySelector(`.task-item[data-day-key="${dayKey}"][data-index="${index}"]`) as HTMLElement;
    
    if (taskItem && taskItem.classList.contains('done')) {
      if (doneSection && doneSection.classList.contains('collapsed')) {
        doneSection.classList.remove('collapsed');
        localStorage.setItem(`done-collapsed-${dayKey}`, 'false');
      }
    }

    const targetItem = document.querySelector(`.task-item[data-day-key="${dayKey}"][data-index="${index}"]`) as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetItem.classList.remove('highlight-flash');
      void targetItem.offsetWidth;
      targetItem.classList.add('highlight-flash');
      setTimeout(() => {
        targetItem.classList.remove('highlight-flash');
      }, 2500);
    }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.task-edit').forEach(ta => ui.autoResize(ta as HTMLTextAreaElement));
  });
}
