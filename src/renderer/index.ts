'use strict';

import * as state from './state';
import * as ui from './ui';
import * as modals from './modals';
import { setupEventListeners } from './events';
import { setupDropTarget } from './dragDrop';
import { WeekData, Plan } from './types';

async function init() {
  try {
    const appInfo = await window.planner.getAppInfo();
    if (appInfo) {
      if (appInfo.name !== 'weekly-planner') {
        document.title = appInfo.name;
        const logo = document.querySelector('.logo');
        if (logo) logo.textContent = appInfo.name;
      }
      
      const v1 = document.getElementById('app-version');
      const v2 = document.getElementById('settings-version');
      if (v1) v1.textContent = `v${appInfo.version}`;
      if (v2) v2.textContent = `v${appInfo.version}`;
    }

    state.setRenderCallback((dayKey?: string) => {
      if (dayKey) {
        ui.renderDay(dayKey, state.weekData, state.defaultDoneCollapsed, getCallbacks());
      } else {
        ui.renderGrid(state.weekData, state.defaultDoneCollapsed, getCallbacks());
      }
    });

    // Attach buildTaskItem to window for global access if needed
    (window as any).buildTaskItem = (dayKey: string, task: Plan, index: number) => 
      ui.buildTaskItem(dayKey, task, index, getCallbacks());

    setupEventListeners({
      loadWeek,
      saveDay,
      checkStaleTasks
    });

    await modals.initTheme();
    await modals.initSettings({
      loadWeek,
      checkStaleTasks
    });
    await modals.initReleaseNotes();

    (document as any).fonts.ready.then(() => {
      document.querySelectorAll('.task-edit').forEach(ta => ui.autoResize(ta as HTMLTextAreaElement));
    });
  } catch (err: any) {
    console.error('Initialization failed:', err);
    if (ui.grid) {
      ui.grid.innerHTML = `<div style="grid-column: 1/8; padding: 40px; text-align: center; color: var(--accent2);">
        <h2 style="margin-bottom: 10px;">Initialization Error</h2>
        <p>${err.message}</p>
      </div>`;
    }
  }
}

function getCallbacks() {
  return { 
    saveDay, 
    updateTask: state.updateTask,
    deleteTask: state.deleteTask,
    setupDropTarget: (el: HTMLElement, dk: string) => setupDropTarget(el, dk, { saveDay }) 
  };
}

async function loadWeek(key: string, skipStaleCheck = false) {
  await state.loadWeek(key, skipStaleCheck, {
    renderGrid: () => ui.renderGrid(state.weekData, state.defaultDoneCollapsed, getCallbacks()),
    updateLabels: (data: WeekData, isToday: boolean) => {
      ui.cwLabel.textContent   = data.cwLabel;
      ui.weekLabel.textContent = data.dateRange;
      ui.todayBtn.disabled = isToday;
    },
    checkStaleTasks
  });
}

async function checkStaleTasks() {
  await state.checkStaleTasks(state.currentWeekKey, {
    showBanner: (count: number) => {
      ui.staleCount.textContent = count.toString();
      ui.staleBanner.classList.add('show');
    },
    hideBanner: () => {
      ui.staleBanner.classList.remove('show');
    }
  });
}

async function saveDay(dayKey: string) {
  await state.saveDay(dayKey, (dk, plans) => ui.updatePips(dk, plans));
}

// Boot
init();
