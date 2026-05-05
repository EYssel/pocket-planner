'use strict';

import { Notification } from 'electron';
import * as cron from 'node-cron';
import * as store from '../src/store';
import { init, reschedule, sendNotification } from '../src/notifications';

jest.mock('electron', () => ({
  Notification: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../src/store');
jest.mock('../src/weekUtils', () => ({
  currentDayKey: jest.fn().mockReturnValue('2026-05-04'),
}));

describe('notifications', () => {
  let mockJob: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { stop: jest.fn() };
    (cron.schedule as jest.Mock).mockReturnValue(mockJob);
    (Notification.isSupported as jest.Mock) = jest.fn().mockReturnValue(true);
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
      // @ts-ignore
      const instance = (Notification as jest.Mock).mock.results[0].value;
      expect(instance.show).toHaveBeenCalled();
    });

    test('should handle click event', () => {
      const openWindow = jest.fn();
      init(openWindow);
      
      let clickHandler: any;
      // @ts-ignore
      (Notification.prototype.on as jest.Mock) = jest.fn().mockImplementation((event, cb) => {
        if (event === 'click') clickHandler = cb;
      });

      sendNotification('Title', 'Body', 'mode');
      // @ts-ignore
      const instance = (Notification as jest.Mock).mock.results[0].value;
      instance.on.mock.calls.forEach((call: any) => {
        if (call[0] === 'click') clickHandler = call[1];
      });

      clickHandler();
      expect(openWindow).toHaveBeenCalledWith('mode');
    });

    test('should do nothing if notifications are not supported', () => {
      (Notification.isSupported as jest.Mock).mockReturnValue(false);
      sendNotification('Title', 'Body', 'mode');
      expect(Notification).not.toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    beforeEach(() => {
      (store.getSetting as jest.Mock).mockImplementation((key) => {
        if (key === 'notificationInterval') return 60;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
      (store.getPlans as jest.Mock).mockReturnValue([]);
    });

    test('should stop existing jobs', () => {
      reschedule(); // first call
      reschedule(); // second call should stop the first one
      expect(mockJob.stop).toHaveBeenCalled();
    });

    test('should schedule cron for minutes < 60', () => {
      (store.getSetting as jest.Mock).mockImplementation((key) => {
        if (key === 'notificationInterval') return 30;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
      reschedule();
      expect(cron.schedule).toHaveBeenCalledWith('*/30 8-17 * * *', expect.any(Function));
    });

    test('should schedule cron for minutes >= 60', () => {
      (store.getSetting as jest.Mock).mockImplementation((key) => {
        if (key === 'notificationInterval') return 120;
        if (key === 'workStart') return 8;
        if (key === 'workEnd') return 18;
        return null;
      });
      reschedule();
      expect(cron.schedule).toHaveBeenCalledWith('0 8-18/2 * * *', expect.any(Function));
    });

    test('should not schedule if interval is 0', () => {
      (store.getSetting as jest.Mock).mockImplementation((key) => {
        if (key === 'notificationInterval') return 0;
        return null;
      });
      reschedule();
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    test('cron job callback should send "Plan your week" on Monday morning', () => {
      reschedule();
      const jobCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

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
      (store.getSetting as jest.Mock).mockReturnValue(60);
      reschedule();
      const jobCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

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
