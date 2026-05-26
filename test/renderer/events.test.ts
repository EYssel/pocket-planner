/**
 * @jest-environment jsdom
 */

'use strict';

describe('Renderer Events - Keyboard Shortcut Recording', () => {
  let mockPlanner: any;
  let eventsModule: any;
  let uiModule: any;
  let mockCallbacks: any;

  beforeEach(() => {
    jest.resetModules();

    // Mock window.planner
    mockPlanner = {
      setSetting: jest.fn().mockResolvedValue(undefined),
      getSetting: jest.fn().mockResolvedValue('Ctrl+Shift+K'),
      getIntervalOptions: jest.fn().mockResolvedValue([]),
      onSetMode: jest.fn(),
      onPlansUpdated: jest.fn(),
      onCheckingForUpdates: jest.fn(),
      onUpdateAvailable: jest.fn(),
      onUpdateNotAvailable: jest.fn(),
      onUpdateProgress: jest.fn(),
      onUpdateDownloaded: jest.fn(),
    };
    (window as any).planner = mockPlanner;

    // Set up the DOM with required elements before requiring events/ui modules
    const elementIds = [
      'week-grid', 'cw-label', 'week-label', 'prev-week', 'next-week', 'today-btn',
      'theme-select', 'font-size-select', 'stale-banner', 'stale-count', 'open-cleanup',
      'close-banner', 'cleanup-list', 'cleanup-overlay', 'close-cleanup', 'update-banner',
      'update-status', 'update-progress-container', 'update-progress-bar', 'install-update-btn',
      'copy-mac-cmd-btn', 'close-update-banner', 'recycle-bin-overlay', 'recycle-bin-list',
      'open-recycle-bin', 'generate-summary', 'close-recycle-bin', 'clear-bin-btn',
      'settings-overlay', 'open-settings', 'close-settings', 'sync-recurring',
      'open-recurring-manager', 'close-recurring-manager', 'recurring-manager-overlay',
      'recurring-list', 'recurrence-setup-overlay', 'close-recurrence-setup',
      'save-recurrence-btn', 'stop-recurrence-btn', 'recurrence-task-text',
      'summary-overlay', 'summary-content', 'close-summary', 'copy-summary-btn',
      'note-overlay', 'task-note-input', 'save-note-btn', 'close-note-modal',
      'release-notes-overlay', 'release-notes-content', 'dismiss-release-notes-btn',
      'settings-version-btn', 'summary-modal-title', 'interval-select',
      'test-notification-btn', 'collapse-done-setting', 'work-start', 'work-end',
      'shortcut-display-input', 'clear-shortcut-btn'
    ];

    document.body.innerHTML = '';
    elementIds.forEach(id => {
      let el;
      if (id === 'shortcut-display-input' || id === 'work-start' || id === 'work-end') {
        el = document.createElement('input');
      } else if (id === 'collapse-done-setting') {
        el = document.createElement('input');
        el.type = 'checkbox';
      } else if (id === 'task-note-input') {
        el = document.createElement('textarea');
      } else if (id === 'theme-select' || id === 'font-size-select' || id === 'interval-select') {
        el = document.createElement('select');
      } else if (id.endsWith('btn') || id === 'generate-summary' || id === 'sync-recurring') {
        el = document.createElement('button');
      } else {
        el = document.createElement('div');
      }
      el.id = id;
      document.body.appendChild(el);
    });

    const shortcutInput = document.getElementById('shortcut-display-input') as HTMLInputElement;
    shortcutInput.value = 'Ctrl+Shift+K';

    // Load modules now that DOM is populated
    uiModule = require('../../src/renderer/ui');
    eventsModule = require('../../src/renderer/events');

    mockCallbacks = {
      loadWeek: jest.fn(),
      saveDay: jest.fn(),
      checkStaleTasks: jest.fn()
    };

    // Initialize listeners
    eventsModule.setupEventListeners(mockCallbacks);
  });

  test('focusing shortcutDisplayInput clears value and shows recording state', () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    expect(input.value).toBe('Ctrl+Shift+K');

    input.dispatchEvent(new Event('focus'));
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Press key combination...');
    expect(input.classList.contains('recording')).toBe(true);
  });

  test('clicking clearShortcutBtn resets shortcut to None', async () => {
    const clearBtn = document.getElementById('clear-shortcut-btn') as HTMLButtonElement;
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;

    clearBtn.dispatchEvent(new Event('click'));
    
    // Allow promises to resolve
    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'None');
    expect(input.value).toBe('None / Disabled');
  });

  test('pressing Escape blurs input and cancels recording', () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    
    const blurSpy = jest.spyOn(input, 'blur');
    
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    input.dispatchEvent(escapeEvent);

    expect(blurSpy).toHaveBeenCalled();
  });

  test('pressing modifier-only keys updates display text but does not save', () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const ctrlEvent = new KeyboardEvent('keydown', {
      key: 'Control',
      ctrlKey: true
    });
    input.dispatchEvent(ctrlEvent);

    expect(input.value).toBe('Ctrl + ...');
    expect(mockPlanner.setSetting).not.toHaveBeenCalled();
  });

  test('recording Ctrl+Shift+Space (Standard Space)', async () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const spaceEvent = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      shiftKey: true
    });
    input.dispatchEvent(spaceEvent);

    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'CommandOrControl+Shift+Space');
    expect(input.value).toBe('Ctrl + Shift + Space');
  });

  test('recording Ctrl+Shift+Space (Non-breaking space \u00A0)', async () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const spaceEvent = new KeyboardEvent('keydown', {
      key: '\u00A0', // Non-breaking space
      code: 'Space',
      ctrlKey: true,
      shiftKey: true
    });
    input.dispatchEvent(spaceEvent);

    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'CommandOrControl+Shift+Space');
    expect(input.value).toBe('Ctrl + Shift + Space');
  });

  test('recording Ctrl+Shift+Alt+- (resolves to Minus physically)', async () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const minusEvent = new KeyboardEvent('keydown', {
      key: '—', // Em-dash (often output on Alt+Shift+-)
      code: 'Minus',
      ctrlKey: true,
      shiftKey: true,
      altKey: true
    });
    input.dispatchEvent(minusEvent);

    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'CommandOrControl+Alt+Shift+Minus');
    expect(input.value).toBe('Ctrl + Alt + Shift + Minus');
  });

  test('recording Ctrl+Shift+A (Standard letter key)', async () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const aEvent = new KeyboardEvent('keydown', {
      key: 'A',
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true
    });
    input.dispatchEvent(aEvent);

    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'CommandOrControl+Shift+A');
    expect(input.value).toBe('Ctrl + Shift + A');
  });

  test('recording Ctrl+Shift+= (resolves to Equal physically)', async () => {
    const input = document.getElementById('shortcut-display-input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));

    const equalEvent = new KeyboardEvent('keydown', {
      key: '+',
      code: 'Equal',
      ctrlKey: true,
      shiftKey: true
    });
    input.dispatchEvent(equalEvent);

    await new Promise(process.nextTick);

    expect(mockPlanner.setSetting).toHaveBeenCalledWith('quickAddShortcut', 'CommandOrControl+Shift+Equal');
    expect(input.value).toBe('Ctrl + Shift + Equal');
  });
});
