/**
 * @jest-environment jsdom
 */

'use strict';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

import * as ui from '../../src/renderer/ui';
import { Plan, DayData } from '../../src/renderer/types';

describe('Renderer UI Builders', () => {
  const mockCallbacks = {
    saveDay: jest.fn(),
    deleteTask: jest.fn(),
    updateTask: jest.fn(),
    setupDropTarget: jest.fn(),
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="week-grid"></div>';
    jest.clearAllMocks();
  });

  describe('buildTaskItem', () => {
    test('renders an active task correctly', () => {
      const task: Plan = { text: 'Test Task', done: false, notes: 'Some note' };
      const item = ui.buildTaskItem('2026-05-04', task, 0, mockCallbacks);

      expect(item.className).toBe('task-item');
      expect(item.dataset.dayKey).toBe('2026-05-04');
      expect(item.dataset.index).toBe('0');
      expect(item.querySelector('.task-display')?.textContent).toBe('Test Task');
      expect(item.querySelector('.check-btn')?.textContent).toBe('');
      expect(item.querySelector('.note-btn')?.classList.contains('has-notes')).toBe(true);

      expect(item).toMatchSnapshot();
    });

    test('renders a done task correctly', () => {
      const task: Plan = { text: 'Done Task', done: true };
      const item = ui.buildTaskItem('2026-05-04', task, 1, mockCallbacks);

      expect(item.className).toBe('task-item done');
      expect(item.querySelector('.check-btn')?.textContent).toBe('✓');
      expect(item.querySelector('.note-btn')?.classList.contains('has-notes')).toBe(false);

      expect(item).toMatchSnapshot();
    });

    test('renders escaped HTML to prevent XSS', () => {
      const task: Plan = { text: '<script>alert("xss")</script>', done: false };
      const item = ui.buildTaskItem('2026-05-04', task, 0, mockCallbacks);

      expect(item.querySelector('.task-display')?.innerHTML).toContain('&lt;script&gt;');
      expect(item).toMatchSnapshot();
    });
  });

  describe('renderMarkdown', () => {
    test('converts markdown links to clickable anchors', () => {
      const text = 'Check [Google](https://google.com)';
      const html = ui.renderMarkdown(text);
      expect(html).toContain(
        '<a href="#" onclick="window.planner.openExternal(\'https://google.com\'); return false;">Google</a>',
      );
    });

    test('converts plain URLs to clickable anchors', () => {
      const text = 'Visit https://google.com for info';
      const html = ui.renderMarkdown(text);
      expect(html).toContain(
        '<a href="#" onclick="window.planner.openExternal(\'https://google.com\'); return false;">https://google.com</a>',
      );
    });

    test('handles mixed content and escaping', () => {
      const text = '<b>Bold</b> and [Link](https://test.com) and https://auto.com';
      const html = ui.renderMarkdown(text);
      expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
      expect(html).toContain("window.planner.openExternal('https://test.com')");
      expect(html).toContain("window.planner.openExternal('https://auto.com')");
    });
  });

  describe('createDaySection', () => {
    test('renders a full day section with tasks', () => {
      const day: DayData = {
        key: '2026-05-04',
        dayName: 'Monday',
        date: 4,
        month: 'May',
        isToday: true,
        isWeekend: false,
        plans: [
          { text: 'Active Task', done: false },
          { text: 'Completed Task', done: true },
        ],
      };

      const section = ui.createDaySection(day, true, mockCallbacks);

      expect(section.querySelector('.day-name')?.textContent).toBe('Monday');
      expect(section.querySelector('.day-date')?.textContent).toBe('4');
      expect(section.querySelector('.active-tasks')?.children.length).toBe(2); // Task + Add button
      expect(section.querySelector('.done-tasks')?.children.length).toBe(1);
      expect(section.querySelector('.done-section')?.classList.contains('visible')).toBe(true);

      expect(section).toMatchSnapshot();
    });

    test('renders an empty day correctly', () => {
      const day: DayData = {
        key: '2026-05-05',
        dayName: 'Tuesday',
        date: 5,
        month: 'May',
        isToday: false,
        isWeekend: false,
        plans: [],
      };

      const section = ui.createDaySection(day, true, mockCallbacks);
      expect(section.querySelector('.active-tasks')?.children.length).toBe(1); // Only Add button
      expect(section.querySelector('.done-section')?.classList.contains('visible')).toBe(false);

      expect(section).toMatchSnapshot();
    });
  });
});
