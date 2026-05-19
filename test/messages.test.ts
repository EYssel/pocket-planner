'use strict';

import { getDynamicMessage } from '../src/messages';

describe('messages', () => {
  describe('getDynamicMessage', () => {
    test('should return "Plan your week" on Monday early morning', () => {
      const result = getDynamicMessage(8, 0, 0, true);
      expect(result.title).toBe('📋 Plan your week');
      expect(result.mode).toBe('planner');
    });

    test('should return "Daily check-in" if no tasks', () => {
      const result = getDynamicMessage(10, 0, 0, false);
      expect(result.title).toBe('☀️ Daily check-in');
      expect(result.body).toContain('No tasks for today');
      expect(result.mode).toBe('checkin');
    });

    test('should return "All done" messages when all tasks are complete', () => {
      const result = getDynamicMessage(14, 5, 5, false);
      const allDoneTitles = [
        '🎉 All done!',
        '🏆 Productivity master',
        '✅ List cleared',
        '🎈 Celebration time',
        '🌟 Perfection!',
        '🥇 Gold star',
        '🎊 Victory!',
        '🌊 Smooth sailing',
        '🔥 On fire!',
        '🚀 Mission complete',
      ];
      expect(allDoneTitles).toContain(result.title);
    });

    test('should return Early Morning messages before 10 AM', () => {
      const result = getDynamicMessage(8, 5, 0, false);
      const titles = [
        '☀️ Good morning!',
        '☕ Rise and shine!',
        '🌅 Morning check-in',
        '🌤️ Hello there!',
        '✨ Fresh start',
        '🔋 Fully charged?',
        '🚀 Launching today',
        '💪 You got this!',
      ];
      expect(titles).toContain(result.title);
    });

    test('should return Mid-Morning messages between 10 AM and 12 PM', () => {
      const result = getDynamicMessage(11, 5, 1, false);
      const titles = [
        '🕒 Mid-morning focus',
        '📈 Building momentum',
        '☕ Coffee break?',
        '🧘 Focus time',
        '🏃 Step by step',
        '🌟 Shine bright',
        '🚂 Full steam ahead',
        '⚖️ Balancing act',
      ];
      expect(titles).toContain(result.title);
    });

    test('should return "No progress" messages after 11 AM if 0 done', () => {
      const result = getDynamicMessage(11, 5, 0, false);
      const titles = [
        '🚀 Ready to start?',
        '💡 Small steps',
        '🌱 Time to plant',
        '🧊 Break the ice',
        '⚡ Spark needed?',
        '🛤️ On the tracks',
        '⏱️ The clock is ticking',
        '🏁 Starting line',
      ];
      expect(titles).toContain(result.title);
    });

    test('should return Early Afternoon messages between 12 PM and 3 PM', () => {
      const result = getDynamicMessage(13, 5, 2, false);
      const titles = [
        '🌗 Afternoon check-in',
        '🥤 Quick refresh?',
        '⛰️ Halfway there!',
        '⚡ Power hour',
        '🧐 Review time',
        '🏔️ Reaching the peak',
        '🌤️ Afternoon glow',
        '✅ Checking in',
      ];
      expect(titles).toContain(result.title);
    });

    test('should return Late Afternoon messages between 3 PM and 6 PM', () => {
      const result = getDynamicMessage(16, 5, 3, false);
      const titles = [
        '🏁 The home stretch',
        '⚡ Power hour',
        '🏃 Sprint finish',
        '🌇 Sunset sprint',
        '📉 Tying loose ends',
        '🕰️ Late check-in',
        '🚶 One last walk-through',
        '🕯️ Final push',
      ];
      expect(titles).toContain(result.title);
    });

    test('should return Evening messages after 6 PM', () => {
      const result = getDynamicMessage(19, 5, 4, false);
      const titles = [
        '🌇 Wrapping up?',
        '🌙 Evening review',
        '🏠 Ready for rest?',
        '🌆 Sunset review',
        '🌌 Starlit goals',
        '🛌 Nearly bedtime',
        '🍵 Calm evening',
        '🌑 End of day',
      ];
      expect(titles).toContain(result.title);
    });
  });
});
