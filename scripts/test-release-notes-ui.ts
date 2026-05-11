'use strict';

import * as fs from 'fs';
import * as path from 'path';
import Store from 'electron-store';

function prepareTest() {
  // 1. Create a dummy CHANGELOG.md in the root
  const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
  const dummyContent = `### [1.0.30] - 2026-05-10
### Features
* **UI**: Added automated release notes display!
* **Automation**: Integrated standard-version for changelog management.

### [1.0.29] - 2026-05-05
* Fixed minor bugs.
`;

  console.log(`Ensuring CHANGELOG.md exists at: ${changelogPath}`);
  fs.writeFileSync(changelogPath, dummyContent);

  // 2. Use electron-store to find and modify the config
  // We MUST match the path set in main.ts for development
  const userDataPath = path.join(process.env.APPDATA || '', 'Weekly Planner Dev');
  const store = new Store({ 
    name: 'config-dev',
    cwd: userDataPath 
  });
  console.log(`Target config path: ${store.path}`);

  const currentVersion = store.get('settings.lastRunVersion');
  console.log(`Current lastRunVersion in store: ${currentVersion}`);

  console.log('Setting lastRunVersion to 1.0.29 to simulate update...');
  store.set('settings.lastRunVersion', '1.0.29');

  const newVersion = store.get('settings.lastRunVersion');
  if (newVersion === '1.0.29') {
    console.log('Successfully updated config!');
    console.log('IMPORTANT: Make sure the Weekly Planner app is COMPLETELY CLOSED before starting it again.');
  } else {
    console.log('Failed to update config.');
  }
}

prepareTest();
