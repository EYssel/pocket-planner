'use strict';

const { Notification } = require('electron');
const cron = require('node-cron');
const store = require('../src/store');
const { init, reschedule, sendNotification } = require('../src/notifications');

jest.mock('electron', () => ({
  Notification: jest.fn(),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../src/store');

describe('notifications', () => {
  let mockJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { stop: jest.fn() };
    cron.schedule.mockReturnValue(mockJob);
    Notification.isSupported = jest.fn().mockReturnValue(true);
    Notification.prototype.show = jest.fn();
    Notification.prototype.on = jest.fn();
  });

  describe('sendNotification', () => {
    test('should create and show a notification', () => {
      const openWindow = jest.fn();
      init(openWindow);
      sendNotification('Title', 'Body', 'mode');
      
      expect(Notification).toHaveBeenCalledWith({
        title: 'Title',
        body: 'Body',
        silent: false
      });
      expect(Notification.prototype.show).toHaveBeenCalled();
    });

    test('should handle click event', () => {
      const openWindow = jest.fn();
      init(openWindow);
      
      let clickHandler;
      Notification.prototype.on.mockImplementation((event, cb) => {
        if (event === 'click') clickHandler = cb;
      });

      sendNotification('Title', 'Body', 'mode');
      clickHandler();
      expect(openWindow).toHaveBeenCalledWith('mode');
    });

    test('should do nothing if notifications are not supported', () => {
      Notification.isSupported.mockReturnValue(false);
      sendNotification('Title', 'Body', 'mode');
      expect(Notification).not.toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    beforeEach(() => {
      store.getSetting.mockImplementation((key) => {
        if (key === 'notificationInterval') return 60;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
    });

    test('should stop existing jobs', () => {
      reschedule(); // first call
      reschedule(); // second call should stop the first one
      expect(mockJob.stop).toHaveBeenCalled();
    });

    test('should schedule cron for minutes < 60', () => {
      store.getSetting.mockImplementation((key) => {
        if (key === 'notificationInterval') return 30;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
      reschedule();
      expect(cron.schedule).toHaveBeenCalledWith('*/30 8-17 * * *', expect.any(Function));
    });

    test('should schedule cron for minutes >= 60', () => {
      store.getSetting.mockImplementation((key) => {
        if (key === 'notificationInterval') return 120;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
      reschedule();
      expect(cron.schedule).toHaveBeenCalledWith('0 8-18/2 * * *', expect.any(Function));
    });

    test('should not schedule if interval is 0', () => {
      store.getSetting.mockImplementation((key) => {
        if (key === 'notificationInterval') return 0;
        return null;
      });
      reschedule();
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    test('cron job callback should send "Plan your week" on Monday morning', () => {
      reschedule();
      const jobCallback = cron.schedule.mock.calls[0][1];

      // Mock Monday 8:00 AM (May 4, 2026 is Monday)
      const monday8AM = new Date(2026, 4, 4, 8, 0, 0); 
      jest.useFakeTimers().setSystemTime(monday8AM);

      jobCallback();

      expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
        title: '📋 Plan your week'
      }));

      jest.useRealTimers();
    });


    test('cron job callback should send "Daily check-in" otherwise', () => {
      store.getSetting.mockReturnValue(60);
      reschedule();
      const jobCallback = cron.schedule.mock.calls[0][1];

      // Mock Tuesday 10:00 AM
      const tuesday10AM = new Date(2026, 4, 5, 10, 0, 0);
      jest.useFakeTimers().setSystemTime(tuesday10AM);

      jobCallback();

      expect(Notification).toHaveBeenCalledWith(expect.objectContaining({
        title: '☀️ Daily check-in'
      }));

      jest.useRealTimers();
    });
  });
});
