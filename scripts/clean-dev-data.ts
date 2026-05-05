'use strict';

import * as fs from 'fs';
import * as path from 'path';

/**
 * Clean script to remove the dev-data config file.
 */

function getUserDataPath(): string {
  const appName = 'weekly-planner';
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

if (fs.existsSync(configPath)) {
  try {
    fs.unlinkSync(configPath);
    console.log(`Successfully deleted: ${configPath}`);
  } catch (err) {
    console.error(`Failed to delete ${configPath}:`, err);
    process.exit(1);
  }
} else {
  console.log('No dev-data file found to clean.');
}
