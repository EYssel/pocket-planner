'use strict';

const mockStoreInstance = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn().mockReturnValue('/mock/app-data'),
  },
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => mockStoreInstance);
});

import * as store from '../src/store';

describe('store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings', () => {
    test('getSetting should call store.get', () => {
      mockStoreInstance.get.mockReturnValue('dark');
      expect(store.getSetting('theme' as any)).toBe('dark');
      expect(mockStoreInstance.get).toHaveBeenCalledWith('settings.theme');
    });

    test('setSetting should call store.set', () => {
      store.setSetting('theme' as any, 'light' as any);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('settings.theme', 'light');
    });
  });

  describe('Plans', () => {
    test('getPlans should return what store.get returns', () => {
      mockStoreInstance.get.mockReturnValue([{ text: 'test', done: false }]);
      expect(store.getPlans('2026-04-23')).toEqual([{ text: 'test', done: false }]);
      expect(mockStoreInstance.get).toHaveBeenCalledWith('days.2026-04-23', []);
    });

    test('savePlans should validate and call store.set', () => {
      const plans = [
        { text: 'Task 1', done: true },
        { text: 123, done: 'not-bool' },
      ] as any;
      store.savePlans('2026-04-23', plans);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('days.2026-04-23', [
        { text: 'Task 1', done: true },
        { text: '', done: false },
      ]);
    });

    test('savePlans should throw if plans is not an array', () => {
      expect(() => store.savePlans('2026-04-23', 'not-an-array' as any)).toThrow(
        'plans must be an array',
      );
    });
  });

  describe('Recycle Bin', () => {
    test('getRecycleBin should call store.get', () => {
      mockStoreInstance.get.mockReturnValue([]);
      expect(store.getRecycleBin()).toEqual([]);
      expect(mockStoreInstance.get).toHaveBeenCalledWith('recycleBin', []);
    });

    test('addToRecycleBin should add task with deletedAt', () => {
      mockStoreInstance.get.mockReturnValue([]);
      const task = { text: 'Deleted task', done: false, dayKey: '2026-04-23' };
      store.addToRecycleBin(task);

      expect(mockStoreInstance.get).toHaveBeenCalledWith('recycleBin', []);
      const setCall = mockStoreInstance.set.mock.calls[0];
      expect(setCall[0]).toBe('recycleBin');
      expect(setCall[1][0].text).toBe('Deleted task');
      expect(setCall[1][0].deletedAt).toBeDefined();
    });

    test('restoreFromRecycleBin should move task back to its original day', () => {
      const task = { text: 'Restorable task', done: false, dayKey: '2026-04-23', deletedAt: '...' };
      mockStoreInstance.get.mockImplementation((key) => {
        if (key === 'recycleBin') return [task];
        if (key === 'days.2026-04-23') return [];
        return null;
      });

      store.restoreFromRecycleBin(0);

      // Should have cleared the bin
      expect(mockStoreInstance.set).toHaveBeenCalledWith('recycleBin', []);
      // Should have added to the day
      expect(mockStoreInstance.set).toHaveBeenCalledWith('days.2026-04-23', [
        { text: 'Restorable task', done: false },
      ]);
    });

    test('clearRecycleBin should empty the bin', () => {
      store.clearRecycleBin();
      expect(mockStoreInstance.set).toHaveBeenCalledWith('recycleBin', []);
    });
  });
});
