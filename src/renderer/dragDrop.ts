'use strict';

export function setupDropTarget(tasksEl: HTMLElement, dayKey: string, callbacks: { saveDay: (dayKey: string) => Promise<void> }) {
  tasksEl.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (!dragging) return;

    // Update dragging item state based on current target
    const isDoneContainer = tasksEl.classList.contains('done-tasks');
    dragging.dataset.dayKey = dayKey;
    dragging.setAttribute('data-day-key', dayKey);
    if (isDoneContainer) {
      dragging.classList.add('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '✓';
    } else {
      dragging.classList.remove('done');
      const checkBtn = dragging.querySelector('.check-btn');
      if (checkBtn) checkBtn.textContent = '';
    }

    const afterElement = getDragAfterElement(tasksEl, e.clientY);
    const addBtn = tasksEl.querySelector('.add-task-btn');
    if (afterElement == null) {
      if (addBtn) {
        if (addBtn.previousElementSibling !== dragging) tasksEl.insertBefore(dragging, addBtn);
      } else {
        if (tasksEl.lastElementChild !== dragging) tasksEl.appendChild(dragging);
      }
    } else {
      if (afterElement !== dragging && afterElement.previousElementSibling !== dragging) {
        tasksEl.insertBefore(dragging, afterElement);
      }
    }
  });

  tasksEl.addEventListener('drop', async (e: DragEvent) => {
    e.preventDefault();
    const dataTransferText = e.dataTransfer?.getData('text/plain');
    if (!dataTransferText) return;
    const { dayKey: sourceDayKey } = JSON.parse(dataTransferText);

    const dragging = document.querySelector('.dragging') as HTMLElement;
    if (dragging) {
      dragging.dataset.dayKey = dayKey;
      dragging.setAttribute('data-day-key', dayKey);
    }
    
    await callbacks.saveDay(sourceDayKey);
    if (sourceDayKey !== dayKey) await callbacks.saveDay(dayKey);

    // Update visibility of done sections for source and target days
    [sourceDayKey, dayKey].forEach(dk => {
      const doneSectionEl = document.getElementById(`done-section-${dk}`);
      const doneTasksEl = document.getElementById(`done-tasks-${dk}`);
      if (doneSectionEl && doneTasksEl) {
        doneSectionEl.classList.toggle('visible', doneTasksEl.children.length > 0);
      }
    });
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
