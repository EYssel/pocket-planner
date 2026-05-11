'use strict';

import * as state from '../../src/renderer/state';
import { WeekData } from '../../src/renderer/types';

// Mock window.planner
const mockPlanner = {
  getWeek: jest.fn(),
  savePlans: jest.fn(),
  currentWeekKey: jest.fn().mockResolvedValue('2026-W19'),
  getPreviousWeekKey: jest.fn().mockResolvedValue('2026-W18'),
};

(global as any).window = {
  planner: mockPlanner
};

describe('Renderer State Logic', () => {
  let initialData: WeekData;

  beforeEach(() => {
    jest.clearAllMocks();
    
    initialData = {
      key: '2026-W19',
      cwLabel: 'CW 19',
      dateRange: 'May 4 – May 10',
      year: 2026,
      week: 19,
      days: [
        {
          key: '2026-05-04',
          dayName: 'Monday',
          date: 4,
          month: 'May',
          isToday: true,
          isWeekend: false,
          plans: [
            { text: 'Task 1', done: false },
            { text: 'Task 2', done: true }
          ]
        },
        {
          key: '2026-05-05',
          dayName: 'Tuesday',
          date: 5,
          month: 'May',
          isToday: false,
          isWeekend: false,
          plans: []
        }
      ]
    };

    state.setWeekData(JSON.parse(JSON.stringify(initialData)));
    state.setRenderCallback(jest.fn());
  });

  test('addTask adds an empty task before done tasks', () => {
    state.addTask('2026-05-04');
    expect(state.weekData!.days[0].plans).toHaveLength(3);
    // Initial was [Active, Done]. New should be [Active, NewActive, Done]
    expect(state.weekData!.days[0].plans[1]).toEqual({ text: '', done: false });
    expect(state.weekData!.days[0].plans[2].done).toBe(true);
  });

  test('updateTask changes the text of a task', () => {
    state.updateTask('2026-05-04', 0, 'Updated Task 1');
    expect(state.weekData!.days[0].plans[0].text).toBe('Updated Task 1');
  });

  test('toggleTask flips the done status', () => {
    state.toggleTask('2026-05-04', 0);
    expect(state.weekData!.days[0].plans[0].done).toBe(true);
    state.toggleTask('2026-05-04', 0);
    expect(state.weekData!.days[0].plans[0].done).toBe(false);
  });

  test('deleteTask removes a task and returns it', () => {
    const deleted = state.deleteTask('2026-05-04', 0);
    expect(deleted).toEqual({ text: 'Task 1', done: false });
    expect(state.weekData!.days[0].plans).toHaveLength(1);
    expect(state.weekData!.days[0].plans[0].text).toBe('Task 2');
  });

  test('moveTask moves a task between days and updates status', () => {
    // Move Monday Task 1 (index 0) to Tuesday (index 0) and mark as done
    state.moveTask('2026-05-04', 0, '2026-05-05', 0, true);
    
    expect(state.weekData!.days[0].plans).toHaveLength(1);
    expect(state.weekData!.days[1].plans).toHaveLength(1);
    expect(state.weekData!.days[1].plans[0]).toEqual({ text: 'Task 1', done: true });
  });

  test('moveTask handles same-day movement correctly (moving forward)', () => {
    // Initial: [Task 1 (active), Task 2 (done)]
    // Move Task 1 (0) before Task 2 (1) -> should stay [Task 1, Task 2]
    state.moveTask('2026-05-04', 0, '2026-05-04', 1);
    expect(state.weekData!.days[0].plans[0].text).toBe('Task 1');
    expect(state.weekData!.days[0].plans[1].text).toBe('Task 2');

    // Add another task. Use addTask to maintain invariant: [Task 1, Task 3, Task 2]
    state.addTask('2026-05-04');
    state.updateTask('2026-05-04', 1, 'Task 3');
    
    // Move Task 1 (0) after Task 3 (1). Target index is 2 (index of Task 2).
    state.moveTask('2026-05-04', 0, '2026-05-04', 2);
    expect(state.weekData!.days[0].plans[0].text).toBe('Task 3');
    expect(state.weekData!.days[0].plans[1].text).toBe('Task 1');
    expect(state.weekData!.days[0].plans[2].text).toBe('Task 2');
  });

  test('moveTask handles same-day movement correctly (moving backward)', () => {
    // Initial: [Task 1 (active), Task 2 (done)]
    // Move Task 2 (1) to before Task 1 (0)
    // The invariant will push it back to the end!
    state.moveTask('2026-05-04', 1, '2026-05-04', 0);
    expect(state.weekData!.days[0].plans[0].text).toBe('Task 1');
    expect(state.weekData!.days[0].plans[1].text).toBe('Task 2');
  });

  test('saveDay sends filtered plans to the backend', async () => {
    state.addTask('2026-05-04'); // Adds an empty task
    await state.saveDay('2026-05-04');
    
    expect(mockPlanner.savePlans).toHaveBeenCalledWith('2026-05-04', [
      { text: 'Task 1', done: false },
      { text: 'Task 2', done: true }
      // Empty task should be filtered out
    ]);
  });
});
