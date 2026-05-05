'use strict';

import { ipcMain } from 'electron';
import * as store from '../src/store';
import * as weekUtils from '../src/weekUtils';
import { registerHandlers } from '../src/ipc';

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

jest.mock('../src/store');
jest.mock('../src/weekUtils');
jest.mock('../src/outlook', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  getMeetings: jest.fn(),
}));
jest.mock('../src/notifications', () => ({
  reschedule: jest.fn(),
  INTERVAL_OPTIONS: []
}));

import { connect, disconnect, getMeetings } from '../src/outlook';

describe('ipc', () => {
  const handlers: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (ipcMain.handle as jest.Mock).mockImplementation((name, fn) => {
      handlers[name] = fn;
    });
  });

  test('registerHandlers should register all expected handlers', () => {
    registerHandlers();
    const expectedHandlers = [
      'get-setting', 'set-setting', 
      'get-current-week-key', 'get-offset-week-key', 
      'get-current-day-key', 'get-week-key-from-day-key',
      'get-week', 'save-plans', 'add-to-recycle-bin',
      'get-recycle-bin', 'get-previous-week-key',
      'connect-outlook', 'disconnect-outlook', 'get-outlook-meetings'
    ];
    expectedHandlers.forEach(name => {
      expect(ipcMain.handle).toHaveBeenCalledWith(name, expect.any(Function));
    });
  });

  describe('Handlers', () => {
    beforeEach(() => {
      registerHandlers();
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

    test('connect-outlook should call outlook.connect', async () => {
      (connect as jest.Mock).mockResolvedValue(true);
      const result = await handlers['connect-outlook']({});
      expect(result).toBe(true);
      expect(connect).toHaveBeenCalled();
    });

    test('disconnect-outlook should call outlook.disconnect', async () => {
      const result = await handlers['disconnect-outlook']({});
      expect(result).toBeUndefined();
      expect(disconnect).toHaveBeenCalled();
    });

    test('get-outlook-meetings should call outlook.getMeetings', async () => {
      (getMeetings as jest.Mock).mockResolvedValue(['meeting']);
      const result = await handlers['get-outlook-meetings']({}, { start: 's', end: 'e' });
      expect(result).toEqual(['meeting']);
      expect(getMeetings).toHaveBeenCalledWith('s', 'e');
    });
  });
});
