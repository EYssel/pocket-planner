'use strict';

import { Notification } from 'electron';
import * as cron from 'node-cron';
import { getSetting, getPlans } from './store';
import { currentDayKey } from './weekUtils';
import { getDynamicMessage, getTaskPrefix } from './messages';

export const INTERVAL_OPTIONS = [
  { label: 'Every 30 minutes', minutes: 30 },
  { label: 'Every hour', minutes: 60 },
  { label: 'Every 2 hours', minutes: 120 },
  { label: 'Every 4 hours', minutes: 240 },
  { label: 'Off', minutes: 0 },
];

let cronJobs: cron.ScheduledTask[] = [];
let _openWindow: ((mode: string) => void) | null = null; // injected to avoid circular dep with window.js

export function init(openWindowFn: (mode: string) => void): void {
  _openWindow = openWindowFn;
}

export function sendNotification(title: string, body: string, mode: string): void {
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title, body, silent: false });
  notif.on('click', () => _openWindow && _openWindow(mode));
  notif.show();
}

export function reschedule(): void {
  cronJobs.forEach((j) => j.stop());
  cronJobs = [];

  const minutes = getSetting('notificationInterval');
  if (!minutes) return;

  const workStart = getSetting('workStart') || 8;
  const workEnd = getSetting('workEnd') || 18;

  let cronExpr: string;
  if (minutes < 60) {
    cronExpr = `*/${minutes} ${workStart}-${workEnd - 1} * * *`;
  } else {
    const hours = minutes / 60;
    cronExpr = `0 ${workStart}-${workEnd}/${hours} * * *`;
  }

  const job = cron.schedule(cronExpr, () => {
    const now = new Date();
    const hour = now.getHours();
    const isMonday = now.getDay() === 1;

    const tasks = getPlans(currentDayKey()).filter((t) => t.text.trim() !== '');
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.done).length;

    let { title, body, mode } = getDynamicMessage(hour, totalTasks, doneTasks, isMonday);

    const nextTask = tasks.find(t => !t.done);
    if (nextTask) {
      const prefix = getTaskPrefix(doneTasks, totalTasks);
      body += `\n${prefix} ${nextTask.text}`;
    }

    sendNotification(title, body, mode);
  });

  cronJobs.push(job);
}

export function triggerManualNotification(): void {
  const now = new Date();
  const hour = now.getHours();
  const isMonday = now.getDay() === 1;

  const tasks = getPlans(currentDayKey()).filter(t => t.text.trim() !== '');
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;

  let { title, body, mode } = getDynamicMessage(hour, totalTasks, doneTasks, isMonday);

  const nextTask = tasks.find(t => !t.done);
  if (nextTask) {
    const prefix = getTaskPrefix(doneTasks, totalTasks);
    body += `\n${prefix} ${nextTask.text}`;
  }

  sendNotification(title, body, mode);
}
