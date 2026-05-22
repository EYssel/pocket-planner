/**
 * @jest-environment jsdom
 */

'use strict';

import { WeekData } from '../../src/renderer/types';

describe('Renderer Quick Add Logic', () => {
  let mockPlanner: any;
  let mockWeekData: WeekData;
  let quickAdd: typeof import('../../src/renderer/quickAdd');
  const registeredListeners: any[] = [];
  const originalAddEventListener = window.addEventListener;

  beforeAll(() => {
    // Intercept event listeners to clean them up after each test
    window.addEventListener = function (type: string, listener: any, options?: any) {
      if (type === 'keydown') {
        registeredListeners.push(listener);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  afterAll(() => {
    window.addEventListener = originalAddEventListener;
  });

  beforeEach(() => {
    jest.resetModules();

    mockWeekData = {
      key: '2026-W21',
      cwLabel: 'CW 21',
      dateRange: 'May 18 – May 24',
      year: 2026,
      week: 21,
      days: [
        { key: '2026-05-18', dayName: 'Mon', date: 18, month: 'May', isToday: false, isWeekend: false, plans: [] },
        { key: '2026-05-19', dayName: 'Tue', date: 19, month: 'May', isToday: false, isWeekend: false, plans: [] },
        { key: '2026-05-20', dayName: 'Wed', date: 20, month: 'May', isToday: true, isWeekend: false, plans: [] },
        { key: '2026-05-21', dayName: 'Thu', date: 21, month: 'May', isToday: false, isWeekend: false, plans: [] },
        { key: '2026-05-22', dayName: 'Fri', date: 22, month: 'May', isToday: false, isWeekend: false, plans: [] },
        { key: '2026-05-23-WE', dayName: 'Weekend', date: '23-24', month: 'May', isToday: false, isWeekend: true, plans: [] },
      ] as any[]
    };

    mockPlanner = {
      getWeek: jest.fn().mockResolvedValue(mockWeekData),
      closeQuickAdd: jest.fn().mockResolvedValue(undefined),
      savePlans: jest.fn().mockResolvedValue(undefined)
    };

    // Attach planner to JSDOM's window object
    (window as any).planner = mockPlanner;

    document.body.innerHTML = `
      <div id="quick-add-container" style="display: none;">
        <input id="quick-add-input" />
        <div id="quick-add-day-selector"></div>
      </div>
    `;

    quickAdd = require('../../src/renderer/quickAdd');
  });

  afterEach(() => {
    // Clean up keydown listeners registered in this test
    registeredListeners.forEach(listener => {
      window.removeEventListener('keydown', listener);
    });
    registeredListeners.length = 0;
  });

  test('initQuickAdd should set body class, display container, focus input, load week, and render chips', async () => {
    document.body.className = 'font-large theme-nord';
    await quickAdd.initQuickAdd();

    expect(document.body.classList.contains('quick-add-mode')).toBe(true);
    expect(document.body.classList.contains('font-large')).toBe(true);
    expect(document.body.classList.contains('theme-nord')).toBe(true);
    
    const container = document.getElementById('quick-add-container');
    expect(container?.style.display).toBe('flex');

    const input = document.getElementById('quick-add-input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    expect(mockPlanner.getWeek).toHaveBeenCalledWith('');

    const selector = document.getElementById('quick-add-day-selector');
    const chips = selector?.querySelectorAll('.quick-add-chip');
    expect(chips?.length).toBe(6);

    // Wed is marked as today, so index 2 should be active by default
    expect(chips?.[2].classList.contains('active')).toBe(true);
    expect(chips?.[0].classList.contains('active')).toBe(false);
  });

  test('clicking a day chip should change the active chip and focus the input', async () => {
    await quickAdd.initQuickAdd();

    const selector = document.getElementById('quick-add-day-selector');
    const chips = selector?.querySelectorAll('.quick-add-chip') as NodeListOf<HTMLElement>;

    // Click Mon chip (index 0)
    chips[0].click();

    expect(chips[0].classList.contains('active')).toBe(true);
    expect(chips[2].classList.contains('active')).toBe(false);

    const input = document.getElementById('quick-add-input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });

  test('Escape keydown should close the Quick Add window', async () => {
    await quickAdd.initQuickAdd();

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(escEvent);

    expect(mockPlanner.closeQuickAdd).toHaveBeenCalled();
  });

  test('Enter keydown with empty input should do nothing', async () => {
    await quickAdd.initQuickAdd();

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    window.dispatchEvent(enterEvent);

    expect(mockPlanner.savePlans).not.toHaveBeenCalled();
    expect(mockPlanner.closeQuickAdd).not.toHaveBeenCalled();
  });

  test('Enter keydown with non-empty input should save task and close window', async () => {
    await quickAdd.initQuickAdd();

    const input = document.getElementById('quick-add-input') as HTMLInputElement;
    input.value = 'New Task content';

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    window.dispatchEvent(enterEvent);

    // Allow async handlers to run
    await new Promise(resolve => setTimeout(resolve, 0));

    // Saved to Wednesday (today, activeDayIndex = 2)
    expect(mockPlanner.getWeek).toHaveBeenCalledWith('2026-W21');
    expect(mockPlanner.savePlans).toHaveBeenCalledWith('2026-05-20', [
      { text: 'New Task content', done: false }
    ]);
    expect(mockPlanner.closeQuickAdd).toHaveBeenCalled();
  });

  test('Ctrl+Enter keydown should save task, clear input, and keep window open', async () => {
    await quickAdd.initQuickAdd();

    const input = document.getElementById('quick-add-input') as HTMLInputElement;
    input.value = 'Keep open task';

    const ctrlEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true });
    window.dispatchEvent(ctrlEnterEvent);

    // Allow async handlers to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockPlanner.savePlans).toHaveBeenCalledWith('2026-05-20', [
      { text: 'Keep open task', done: false }
    ]);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(mockPlanner.closeQuickAdd).not.toHaveBeenCalled();
  });

  test('Alt+1-7 keydown should select the correct day chip', async () => {
    await quickAdd.initQuickAdd();

    const selector = document.getElementById('quick-add-day-selector');
    const chips = selector?.querySelectorAll('.quick-add-chip');

    // Alt+1 should select Mon (index 0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', altKey: true, bubbles: true }));
    expect(chips?.[0].classList.contains('active')).toBe(true);

    // Alt+5 should select Fri (index 4)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', altKey: true, bubbles: true }));
    expect(chips?.[4].classList.contains('active')).toBe(true);

    // Alt+6 should select Weekend (index 5)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '6', altKey: true, bubbles: true }));
    expect(chips?.[5].classList.contains('active')).toBe(true);
  });

  test('Ctrl+Left/Right Arrow keys should cycle day chips', async () => {
    await quickAdd.initQuickAdd();

    const selector = document.getElementById('quick-add-day-selector');
    const chips = selector?.querySelectorAll('.quick-add-chip');

    // Default active is Wed (index 2)
    
    // Ctrl+Left should go to Tue (index 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true, bubbles: true }));
    expect(chips?.[1].classList.contains('active')).toBe(true);

    // Ctrl+Right should go to Wed (index 2)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }));
    expect(chips?.[2].classList.contains('active')).toBe(true);

    // Ctrl+Right to Thu (index 3)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }));
    expect(chips?.[3].classList.contains('active')).toBe(true);
  });
});
