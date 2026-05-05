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

    test('should return one of 12 "All done" messages when all tasks are complete', () => {
      const result = getDynamicMessage(14, 5, 5, false);
      const allDoneTitles = [
        '🎉 All done!', '🏆 Productivity master', '✅ List cleared', '🎈 Celebration time',
        '🌟 Perfection!', '🥇 Gold star', '🎊 Victory!', '🌊 Smooth sailing',
        '🔥 On fire!', '🌌 Space for rest', '🚀 Mission complete', '🎨 Masterpiece'
      ];
      expect(allDoneTitles).toContain(result.title);
      expect(result.mode).toBe('checkin');
    });

    test('should return one of 12 "Morning" messages in the morning', () => {
      const result = getDynamicMessage(9, 5, 0, false);
      const morningTitles = [
        '☀️ Good morning!', '☕ Rise and shine!', '🌅 Morning check-in', '🌤️ Hello there!',
        '✨ Fresh start', '🔋 Fully charged?', '🚀 Launching today', '📅 Today\'s agenda',
        '💪 You got this!', '🧘 Focus time', '🏃 Step by step', '🌟 Shine bright'
      ];
      expect(morningTitles).toContain(result.title);
      // Morning messages all contain the total count "5"
      expect(result.body).toContain('5');
    });

    test('should return one of 12 "Afternoon" messages in the afternoon', () => {
      const result = getDynamicMessage(14, 5, 2, false);
      const afternoonTitles = [
        '🌗 Halfway through!', '☀️ Afternoon check-in', '🕒 Time for a break?', '📈 Progress report',
        '🥤 Quick refresh?', '🏁 The home stretch', '⚡ Power hour', '🧐 Review time',
        '🚂 Full steam ahead', '🏔️ Reaching the peak', '🌤️ Afternoon glow', '✅ Checking in'
      ];
      expect(afternoonTitles).toContain(result.title);
      // Body should mention progress (2/5 or 2 done) or remaining (3)
      expect(result.body).toMatch(/2\/5|2|3/);
    });

    test('should return one of 12 "Evening" messages in the evening', () => {
      const result = getDynamicMessage(18, 5, 4, false);
      const eveningTitles = [
        '🌇 Wrapping up?', '🌙 Evening check-in', '🏠 Heading out?', '🌆 Sunset review',
        '🕯️ Final push', '🌌 Starlit goals', '🛌 Nearly bedtime', '🍵 Calm evening',
        '📉 Tying loose ends', '🕰️ Late check-in', '🚶 One last walk-through', '🌑 End of day'
      ];
      expect(eveningTitles).toContain(result.title);
      // Body should mention remaining (1)
      expect(result.body).toContain('1');
    });

    test('should return one of 12 "No progress" messages if no tasks done late in morning/afternoon', () => {
      const result = getDynamicMessage(11, 5, 0, false);
      const noProgressTitles = [
        '🚀 Ready to start?', '💡 Small steps', '🌱 Time to plant', '🧊 Break the ice',
        '⚡ Spark needed?', '🛤️ On the tracks', '⏱️ The clock is ticking', '🪁 Take flight',
        '🧗 Start the climb', '🔑 Unlock progress', '🌊 Catch the wave', '🏁 Starting line'
      ];
      expect(noProgressTitles).toContain(result.title);
      expect(result.body).toContain('5');
    });
  });
});
