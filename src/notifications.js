'use strict';

const { Notification } = require('electron');
const cron = require('node-cron');
const { getSetting } = require('./store');

const WORK_START = 8;
const WORK_END   = 18;

const INTERVAL_OPTIONS = [
  { label: 'Every 30 minutes', minutes: 30  },
  { label: 'Every hour',       minutes: 60  },
  { label: 'Every 2 hours',    minutes: 120 },
  { label: 'Every 4 hours',    minutes: 240 },
  { label: 'Off',              minutes: 0   },
];

let cronJobs = [];
let _openWindow = null; // injected to avoid circular dep with window.js

function init(openWindowFn) {
  _openWindow = openWindowFn;
}

function sendNotification(title, body, mode) {
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title, body, silent: false });
  notif.on('click', () => _openWindow && _openWindow(mode));
  notif.show();
}

function reschedule() {
  cronJobs.forEach(j => j.stop());
  cronJobs = [];

  const minutes = getSetting('notificationInterval');
  if (!minutes) return;

  let cronExpr;
  if (minutes < 60) {
    cronExpr = `*/${minutes} ${WORK_START}-${WORK_END - 1} * * *`;
  } else {
    const hours = minutes / 60;
    cronExpr = `0 ${WORK_START}-${WORK_END}/${hours} * * *`;
  }

  const job = cron.schedule(cronExpr, () => {
    const now          = new Date();
    const isMonday     = now.getDay() === 1;
    const isFirstFire  = now.getHours() === WORK_START;

    if (isMonday && isFirstFire) {
      sendNotification('📋 Plan your week', 'Set your tasks for each day this week.', 'planner');
    } else {
      sendNotification('☀️ Daily check-in', 'How is your day going? Review your tasks.', 'checkin');
    }
  });

  cronJobs.push(job);
}

module.exports = { init, reschedule, sendNotification, INTERVAL_OPTIONS };