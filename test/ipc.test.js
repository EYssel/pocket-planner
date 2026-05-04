'use strict';

const { ipcMain } = require('electron');
const store = require('../src/store');
const weekUtils = require('../src/weekUtils');
const { registerHandlers } = require('../src/ipc');

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

jest.mock('../src/store');
jest.mock('../src/weekUtils');

describe('ipc', () => {
  const handlers = {};

  beforeEach(() => {
    jest.clearAllMocks();
    ipcMain.handle.mockImplementation((name, fn) => {
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
      'get-recycle-bin', 'get-previous-week-key'
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
      store.getSetting.mockReturnValue('val');
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
      weekUtils.currentWeekKey.mockReturnValue('2026-W19');
      weekUtils.weekInfoFromKey.mockReturnValue({ key: '2026-W19' });
      weekUtils.weekDayKeys.mockReturnValue(['2026-05-04']);
      weekUtils.dayInfoFromKey.mockReturnValue({ dayName: 'Mon' });
      store.getPlans.mockReturnValue(['task']);

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
  });
});
