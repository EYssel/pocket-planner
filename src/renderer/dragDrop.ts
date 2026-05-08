'use strict';

import * as state from './state';

export function setupDropTarget(tasksEl: HTMLElement, dayKey: string, callbacks: { saveDay: (dayKey: string) => Promise<void> }) {
  tasksEl.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (!dragging) return;

    // Update dragging item visual state based on current target
    const isDoneContainer = tasksEl.classList.contains('done-tasks') || tasksEl.classList.contains('done-section');
    if (isDoneContainer) {
      dragging.classList.add('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '✓';
    } else {
      dragging.classList.remove('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '';
    }

    // For done-section, we actually want to drop into its inner .done-tasks
    let container = tasksEl;
    if (tasksEl.classList.contains('done-section')) {
      container = tasksEl.querySelector('.done-tasks') as HTMLElement;
    }

    const afterElement = getDragAfterElement(container, e.clientY);
    const addBtn = container.querySelector('.add-task-btn');
    if (afterElement == null) {
      if (addBtn) {
        if (addBtn.previousElementSibling !== dragging) container.insertBefore(dragging, addBtn);
      } else {
        if (container.lastElementChild !== dragging) container.appendChild(dragging);
      }
    } else {
      if (afterElement !== dragging && afterElement.previousElementSibling !== dragging) {
        container.insertBefore(dragging, afterElement);
      }
    }
  });

  tasksEl.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    const dataTransferText = e.dataTransfer?.getData('text/plain');
    if (!dataTransferText) return;
    const { dayKey: sourceDayKey, index: sourceIndex } = JSON.parse(dataTransferText);

    const isDone = tasksEl.classList.contains('done-tasks') || tasksEl.classList.contains('done-section');
    
    let container = tasksEl;
    if (tasksEl.classList.contains('done-section')) {
      container = tasksEl.querySelector('.done-tasks') as HTMLElement;
    }

    const afterElement = getDragAfterElement(container, e.clientY);
    
    let targetIndex = -1;
    if (afterElement) {
      targetIndex = parseInt(afterElement.dataset.index!, 10);
    } else {
      // If no afterElement, it's at the end of the section.
      // For state-first, we need the absolute index in state.plans.
      const day = state.weekData?.days?.find(d => d.key === dayKey);
      if (day) {
        if (isDone) {
          targetIndex = day.plans.length;
        } else {
          // End of active tasks
          targetIndex = day.plans.findIndex(p => p.done);
          if (targetIndex === -1) targetIndex = day.plans.length;
        }
      }
    }

    state.moveTask(sourceDayKey, sourceIndex, dayKey, targetIndex, isDone);
    
    await callbacks.saveDay(sourceDayKey);
    if (sourceDayKey !== dayKey) await callbacks.saveDay(dayKey);
  });
}

export function getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')] as HTMLElement[];
  return draggableElements.reduce((closest: any, child: HTMLElement) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
