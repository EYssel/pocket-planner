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
import { RecurringTask } from '../src/types';

describe('Recurring Tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Management', () => {
    test('getRecurringTasks should call store.get', () => {
      mockStoreInstance.get.mockReturnValue([]);
      expect(store.getRecurringTasks()).toEqual([]);
      expect(mockStoreInstance.get).toHaveBeenCalledWith('recurringTasks', []);
    });

    test('saveRecurringTask should add new task', () => {
      mockStoreInstance.get.mockReturnValue([]);
      const task: RecurringTask = { id: 'rec-1', text: 'Daily Task', days: [1, 2, 3] };
      store.saveRecurringTask(task);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('recurringTasks', [task]);
    });

    test('saveRecurringTask should update existing task', () => {
      const existing: RecurringTask = { id: 'rec-1', text: 'Daily Task', days: [1, 2, 3] };
      const updated: RecurringTask = { id: 'rec-1', text: 'Updated Task', days: [1, 5] };
      mockStoreInstance.get.mockReturnValue([existing]);
      
      store.saveRecurringTask(updated);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('recurringTasks', [updated]);
    });

    test('deleteRecurringTask should remove task', () => {
      const task: RecurringTask = { id: 'rec-1', text: 'Daily Task', days: [1, 2, 3] };
      mockStoreInstance.get.mockReturnValue([task]);
      
      store.deleteRecurringTask('rec-1');
      expect(mockStoreInstance.set).toHaveBeenCalledWith('recurringTasks', []);
    });
  });

  describe('Generation (Sync)', () => {
    test('generateRecurringTasks should inject tasks for applicable days', () => {
      const templates: RecurringTask[] = [
        { id: 'daily', text: 'Daily', days: [1, 2, 3, 4, 5, 6] },
        { id: 'mon-wed', text: 'Mon-Wed', days: [1, 3] }
      ];

      mockStoreInstance.get.mockImplementation((key, def) => {
        if (key === 'recurringTasks') return templates;
        if (key.startsWith('days.')) return []; // Start with empty days
        return def;
      });

      // week 2026-W17 (April 20-26, 2026)
      // Mon: 2026-04-20
      // Wed: 2026-04-22
      // Sat: 2026-04-25 (WE)
      store.generateRecurringTasks('2026-W17');

      // Verify Monday (1) - should have both
      expect(mockStoreInstance.set).toHaveBeenCalledWith('days.2026-04-20', expect.arrayContaining([
        expect.objectContaining({ recurringId: 'daily' }),
        expect.objectContaining({ recurringId: 'mon-wed' })
      ]));

      // Verify Tuesday (2) - should only have daily
      expect(mockStoreInstance.set).toHaveBeenCalledWith('days.2026-04-21', [
        { text: 'Daily', done: false, recurringId: 'daily', notes: undefined }
      ]);

      // Verify Weekend (6) - should only have daily
      expect(mockStoreInstance.set).toHaveBeenCalledWith('days.2026-W17-WE', [
        { text: 'Daily', done: false, recurringId: 'daily', notes: undefined }
      ]);
    });

    test('generateRecurringTasks should not inject if already exists', () => {
      const templates: RecurringTask[] = [
        { id: 'daily', text: 'Daily', days: [1] }
      ];

      mockStoreInstance.get.mockImplementation((key, def) => {
        if (key === 'recurringTasks') return templates;
        if (key === 'days.2026-04-20') return [{ text: 'Daily', done: true, recurringId: 'daily' }];
        return [];
      });

      store.generateRecurringTasks('2026-W17');

      // Should not have called set for 2026-04-20 because it already existed
      const calls = mockStoreInstance.set.mock.calls.filter(c => c[0] === 'days.2026-04-20');
      expect(calls.length).toBe(0);
    });
  });
});
