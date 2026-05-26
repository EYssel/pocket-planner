'use strict';

/**
 * Controller to handle click-and-drag resizing of specific modals in the application,
 * and persist their custom sizes in the configuration via `window.planner`.
 */

export async function initModalResizing(): Promise<void> {
  const resizableModals = document.querySelectorAll('.modal.resizable');
  if (resizableModals.length === 0) return;

  // Retrieve saved modal sizes from configuration
  let savedSizes: Record<string, { width: number; height: number }> = {};
  try {
    const rawSizes = await window.planner.getSetting('modalSizes');
    if (rawSizes && typeof rawSizes === 'object') {
      savedSizes = rawSizes as Record<string, { width: number; height: number }>;
    }
  } catch (err) {
    console.error('Failed to load saved modal sizes:', err);
  }

  resizableModals.forEach((modal) => {
    const modalEl = modal as HTMLElement;
    const overlay = modalEl.closest('.modal-overlay');
    if (!overlay) return;
    
    const modalId = overlay.id;
    if (!modalId) return;

    // Apply saved size if exists
    if (savedSizes[modalId]) {
      const { width, height } = savedSizes[modalId];
      modalEl.style.width = `${width}px`;
      modalEl.style.height = `${height}px`;
    }

    const handle = modalEl.querySelector('.modal-resize-handle') as HTMLElement | null;
    if (!handle) return;

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      // Only handle primary button click (usually left click)
      if (e.button !== 0) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = modalEl.offsetWidth;
      const startHeight = modalEl.offsetHeight;

      // Cursor styling during resize
      document.body.style.cursor = 'se-resize';

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth + deltaX;
        let newHeight = startHeight + deltaY;

        // Apply boundary constraints (min: 400x300, max: 95% of viewport)
        const minWidth = 400;
        const minHeight = 300;
        const maxWidth = window.innerWidth * 0.95;
        const maxHeight = window.innerHeight * 0.95;

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        modalEl.style.width = `${newWidth}px`;
        modalEl.style.height = `${newHeight}px`;
      };

      const onPointerUp = async (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        
        document.body.style.cursor = '';

        // Persist the final dimensions
        const finalWidth = modalEl.offsetWidth;
        const finalHeight = modalEl.offsetHeight;

        try {
          const currentSettingsSizes = await window.planner.getSetting('modalSizes') || {};
          const updatedSizes = {
            ...currentSettingsSizes,
            [modalId]: { width: finalWidth, height: finalHeight }
          };
          await window.planner.setSetting('modalSizes', updatedSizes);
        } catch (err) {
          console.error(`Failed to save modal sizes for ${modalId}:`, err);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  });
}
