/**
 * @jest-environment jsdom
 */

'use strict';

// Ensure PointerEvent exists in JSDOM test environment
if (!global.PointerEvent) {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params: any = {}) {
      super(type, params);
      Object.defineProperty(this, 'clientX', { value: params.clientX || 0, configurable: true, enumerable: true });
      Object.defineProperty(this, 'clientY', { value: params.clientY || 0, configurable: true, enumerable: true });
      Object.defineProperty(this, 'button', { value: params.button || 0, configurable: true, enumerable: true });
    }
  } as any;
}

import { initModalResizing } from '../../src/renderer/modalResize';

describe('Modal Resizing Controller', () => {
  let mockPlanner: any;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="modal-overlay" id="summary-overlay">
        <div class="modal resizable" style="width: 500px; height: 400px;">
          <div class="modal-resize-handle"></div>
        </div>
      </div>
    `;

    mockPlanner = {
      getSetting: jest.fn().mockResolvedValue({
        'summary-overlay': { width: 600, height: 450 }
      }),
      setSetting: jest.fn().mockResolvedValue(undefined)
    };
    (window as any).planner = mockPlanner;
  });

  test('applies saved sizes from setting options on initialization', async () => {
    await initModalResizing();

    const modal = document.querySelector('.modal.resizable') as HTMLElement;
    expect(modal.style.width).toBe('600px');
    expect(modal.style.height).toBe('450px');
    expect(mockPlanner.getSetting).toHaveBeenCalledWith('modalSizes');
  });

  test('does not error if no saved sizes exist', async () => {
    mockPlanner.getSetting.mockResolvedValue(undefined);
    await initModalResizing();

    const modal = document.querySelector('.modal.resizable') as HTMLElement;
    expect(modal.style.width).toBe('500px'); // Retains original inline style set in DOM
  });

  test('handles dragging handle and saving size', async () => {
    await initModalResizing();

    const handle = document.querySelector('.modal-resize-handle') as HTMLElement;
    const modal = document.querySelector('.modal.resizable') as HTMLElement;

    // Mock JSDOM offsetWidth/offsetHeight getters for initial width/height
    Object.defineProperty(modal, 'offsetWidth', { value: 600, configurable: true });
    Object.defineProperty(modal, 'offsetHeight', { value: 450, configurable: true });

    // Simulate pointerdown
    const downEvent = new PointerEvent('pointerdown', {
      button: 0,
      clientX: 100,
      clientY: 100
    });
    handle.dispatchEvent(downEvent);

    // Simulate pointermove
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 200,
      clientY: 200
    });
    window.dispatchEvent(moveEvent);

    // Check computed inline width/height shifts (600 + (200-100) = 700)
    expect(modal.style.width).toBe('700px');
    expect(modal.style.height).toBe('550px');

    // Mock JSDOM offsetWidth/offsetHeight getters for final persistence checks
    Object.defineProperty(modal, 'offsetWidth', { value: 700, configurable: true });
    Object.defineProperty(modal, 'offsetHeight', { value: 550, configurable: true });

    // Simulate pointerup
    const upEvent = new PointerEvent('pointerup');
    window.dispatchEvent(upEvent);

    // Wait for the async save operation to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('modalSizes', {
      'summary-overlay': { width: 700, height: 550 }
    });
  });
});
