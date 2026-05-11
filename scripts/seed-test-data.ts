'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { currentWeekKey, getPreviousWeekKey, weekDayKeys } from '../src/weekUtils';

/**
 * Seed script to generate test data for the previous calendar week.
 * This script writes directly to the config-dev.json file in the app's data directory.
 */

function getUserDataPath(): string {
  const appName = 'weekly-planner-dev';
  const home = process.env.HOME || process.env.USERPROFILE || '';
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', appName);
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', appName);
    default:
      return path.join(home, '.config', appName);
  }
}

const userDataPath = getUserDataPath();
const configPath = path.join(userDataPath, 'config-dev.json');

console.log(`Targeting config file: ${configPath}`);

// Ensure directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const prevWeekKey = getPreviousWeekKey(currentWeekKey());
const days = weekDayKeys(prevWeekKey);

const sampleTasks = [
  "Review quarterly goals",
  "Team sync meeting",
  "Fix bug #123",
  "Update documentation",
  "Prepare presentation",
  "Refactor store logic",
  "Coffee with mentor",
  "Buy groceries",
  "Exercise for 30 mins",
  "Read a book chapter"
];

const data: any = {
  settings: {
    notificationInterval: 60
  },
  days: {},
  recycleBin: []
};

console.log(`Generating data for week: ${prevWeekKey}`);

days.forEach((dayKey, index) => {
  // Add 2-4 tasks per day
  const numTasks = Math.floor(Math.random() * 3) + 2;
  data.days[dayKey] = [];
  
  for (let i = 0; i < numTasks; i++) {
    const taskIndex = (index * 3 + i) % sampleTasks.length;
    data.days[dayKey].push({
      text: sampleTasks[taskIndex],
      done: Math.random() > 0.3 // Most tasks done in the past
    });
  }
});

try {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  console.log('Successfully seeded dev-data!');
} catch (err) {
  console.error('Failed to write seed data:', err);
  process.exit(1);
}
