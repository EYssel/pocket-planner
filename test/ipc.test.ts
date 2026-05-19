'use strict';

import { ipcMain, app, clipboard } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'fs';
import * as path from 'path';
import * as store from '../src/store';
import * as weekUtils from '../src/weekUtils';
import { registerHandlers } from '../src/ipc';

jest.mock('fs');
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  app: {
  getName: jest.fn().mockReturnValue('Weekly Planner'),
  getVersion: jest.fn().mockReturnValue('1.1.0'),
  getPath: jest.fn().mockImplementation((name) => {
    if (name === 'exe') return '/mock/app/Weekly Planner.exe';
    return '';
  }),
  getAppPath: jest.fn().mockReturnValue('/mock/app/path'),
  isPackaged: true,
  },  clipboard: {
    writeText: jest.fn(),
  }
}));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    quitAndInstall: jest.fn(),
  },
}));

jest.mock('../src/store');
jest.mock('../src/weekUtils');
jest.mock('../src/notifications', () => ({
  reschedule: jest.fn(),
  INTERVAL_OPTIONS: []
}));
jest.mock('../src/tray', () => ({
  updateTooltip: jest.fn(),
}));
jest.mock('../src/window', () => ({
  updateProgress: jest.fn(),
}));

describe('ipc', () => {
  const handlers: Record<string, Function> = {};
  const listeners: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (ipcMain.handle as jest.Mock).mockImplementation((name, fn) => {
      handlers[name] = fn;
    });
    (ipcMain.on as jest.Mock).mockImplementation((name, fn) => {
      listeners[name] = fn;
    });
  });

  test('registerHandlers should register all expected handlers', () => {
    registerHandlers();
    const expectedHandlers = [
      'get-app-info', 'get-setting', 'set-setting', 
      'get-current-week-key', 'get-offset-week-key', 
      'get-current-day-key', 'get-week-key-from-day-key',
      'get-week', 'save-plans', 'add-to-recycle-bin',
      'get-recycle-bin', 'restore-from-recycle-bin',
      'clear-recycle-bin', 'get-previous-week-key',
      'install-update'
    ];
    expectedHandlers.forEach(name => {
      expect(ipcMain.handle).toHaveBeenCalledWith(name, expect.any(Function));
    });
    expect(ipcMain.on).toHaveBeenCalledWith('update-os-state', expect.any(Function));
  });

  describe('Handlers', () => {
    beforeEach(() => {
      registerHandlers();
    });

    test('get-app-info should return app name and version', async () => {
      const result = await handlers['get-app-info']({});
      expect(result).toEqual({ name: 'Weekly Planner', version: '1.1.0' });
    });

    test('update-os-state should call tray and window update functions', () => {
      const { updateTooltip } = require('../src/tray');
      const { updateProgress } = require('../src/window');
      
      listeners['update-os-state']({}, { 
        nextTaskText: 'Next', 
        doneCount: 1, 
        totalCount: 2 
      });

      expect(updateTooltip).toHaveBeenCalledWith('Next', 1, 2);
      expect(updateProgress).toHaveBeenCalledWith(1, 2, 'Next');
    });

    test('install-update should call autoUpdater.quitAndInstall and set isQuitting', async () => {
      (global as any).isQuitting = false;
      await handlers['install-update']({});
      expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
      expect((global as any).isQuitting).toBe(true);
    });

    test('get-setting should call store.getSetting', async () => {
      (store.getSetting as jest.Mock).mockReturnValue('val');
      const result = await handlers['get-setting']({}, 'theme');
      expect(result).toBe('val');
      expect(store.getSetting).toHaveBeenCalledWith('theme');
    });

    test('set-setting should call store.setSetting', async () => {
      const result = await handlers['set-setting']({}, { key: 'theme', value: 'light' });
      expect(result).toBe(true);
      expect(store.setSetting).toHaveBeenCalledWith('theme', 'light');
    });

    test('get-week should aggregate info from weekUtils and store', async () => {
      (weekUtils.currentWeekKey as jest.Mock).mockReturnValue('2026-W19');
      (weekUtils.weekInfoFromKey as jest.Mock).mockReturnValue({ key: '2026-W19' });
      (weekUtils.weekDayKeys as jest.Mock).mockReturnValue(['2026-05-04']);
      (weekUtils.dayInfoFromKey as jest.Mock).mockReturnValue({ dayName: 'Mon' });
      (store.getPlans as jest.Mock).mockReturnValue(['task']);

      const result = await handlers['get-week']({}, '2026-W19');
      
      expect(result).toEqual({
        key: '2026-W19',
        days: [
          { dayName: 'Mon', plans: ['task'] }
        ]
      });
      expect(weekUtils.weekInfoFromKey).toHaveBeenCalledWith('2026-W19');
    });

    test('save-plans should call store.savePlans', async () => {
      const result = await handlers['save-plans']({}, { dayKey: '2026-05-04', plans: [] });
      expect(result).toBe(true);
      expect(store.savePlans).toHaveBeenCalledWith('2026-05-04', []);
    });

    test('get-release-notes should return features AND bug fixes for current version', async () => {
      (app.getVersion as jest.Mock).mockReturnValue('1.1.0');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
# Changelog
## [1.1.0] (2026-05-11)
### Features
* new feature
### Bug Fixes
* bug fix
### Chores
* some chore
## [1.0.30]
      `);

      const result = await handlers['get-release-notes']({});
      expect(result).toContain('### Features');
      expect(result).toContain('* new feature');
      expect(result).toContain('### Bug Fixes');
      expect(result).toContain('* bug fix');
      expect(result).not.toContain('### Chores');
      expect(result).not.toContain('some chore');
    });

    test('get-release-notes should return empty if neither Features nor Bug Fixes exist', async () => {
      (app.getVersion as jest.Mock).mockReturnValue('1.1.1');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(`
# Changelog
### [1.1.1] (2026-05-11)
### Chores
* technical chore
      `);

      const result = await handlers['get-release-notes']({});
      expect(result).toBe('');
    });

    test('get-release-notes should return empty if version not found', async () => {
      (app.getVersion as jest.Mock).mockReturnValue('2.0.0');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('## [1.1.0]');

      const result = await handlers['get-release-notes']({});
      expect(result).toBe('');
    });

    test('get-release-notes should return empty if file missing', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = await handlers['get-release-notes']({});
      expect(result).toBe('');
    });
  });
});
