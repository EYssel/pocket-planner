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
    if (appInfo && appInfo.name !== 'weekly-planner') {
      document.title = appInfo.name;
      const logo = document.querySelector('.logo');
      if (logo) logo.textContent = appInfo.name;
      
      const v1 = document.getElementById('app-version');
      const v2 = document.getElementById('settings-version');
      if (v1) v1.textContent = `v${appInfo.version}`;
      if (v2) v2.textContent = `v${appInfo.version}`;
    }

    // Attach buildTaskItem to window so events.ts can use it (to avoid circular dependency if needed)
    // or we can just import it in events.ts. I already imported it in events.ts via window cast, 
    // let's make sure it's available.
    (window as any).buildTaskItem = (dayKey: string, task: Plan, index: number) => 
      ui.buildTaskItem(dayKey, task, index, { saveDay, setupDropTarget: (el: HTMLElement, dk: string) => setupDropTarget(el, dk, { saveDay }) });

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

async function loadWeek(key: string, skipStaleCheck = false) {
  await state.loadWeek(key, skipStaleCheck, {
    renderGrid: () => ui.renderGrid(state.weekData, state.defaultDoneCollapsed, { 
      saveDay, 
      setupDropTarget: (el: HTMLElement, dk: string) => setupDropTarget(el, dk, { saveDay }) 
    }),
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
  await state.saveDay(dayKey, ui.getPlansFromDOM, (dk, plans) => ui.updatePips(dk, plans));
}

// Boot
init();
