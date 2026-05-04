const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Recycle Bin E2E', () => {
  test.describe.configure({ timeout: 60000 });

  let electronApp;
  let window;

  test.beforeEach(async () => {
    const projectRoot = path.join(__dirname, '../../');
    electronApp = await electron.launch({ 
      executablePath: path.join(projectRoot, 'node_modules/electron/dist/electron.exe'),
      args: ['.'],
      cwd: projectRoot
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.evaluate(({ app }) => {
      global.isQuitting = true;
      app.quit();
    });
    await electronApp.close();
  });

  test('should allow deleting a task and restoring it from the recycle bin', async () => {
    const firstDay = window.locator('.day-section').first();
    const dayKey = await firstDay.getAttribute('data-day-key');
    const tasksContainer = window.locator(`#tasks-${dayKey}`);
    
    // 1. Add a task
    await firstDay.locator('.add-task-btn').click();
    const taskTextArea = tasksContainer.locator('.task-text').last();
    await taskTextArea.type('Restore me', { delay: 20 });
    await window.keyboard.press('Control+s'); // Force save

    // 2. Delete the task
    const taskItem = tasksContainer.locator('.task-item').last();
    await taskItem.locator('.del-btn').click();
    await expect(tasksContainer.locator('.task-item')).toHaveCount(0);

    // 3. Open Recycle Bin
    await window.locator('#open-recycle-bin').click();
    await expect(window.locator('#recycle-bin-overlay')).toHaveClass(/show/);

    // 4. Verify task is in the bin
    const binList = window.locator('#recycle-bin-list');
    await expect(binList.locator('.bin-task-item')).toHaveCount(1);
    await expect(binList.locator('.bin-task-text')).toHaveText('Restore me');

    // 5. Restore the task
    await binList.locator('.action-btn[data-action="restore"]').click();
    await expect(window.locator('#recycle-bin-overlay')).not.toHaveClass(/show/);

    // 6. Verify task is back in the grid
    const restoredTask = tasksContainer.locator('.task-item').first();
    await expect(restoredTask).toBeVisible({ timeout: 10000 });
    await expect(restoredTask.locator('.task-text')).toHaveValue('Restore me');
  });

  test('should allow clearing the recycle bin', async () => {
    const firstDay = window.locator('.day-section').first();
    
    // 1. Add and delete a task
    await firstDay.locator('.add-task-btn').click();
    const tasksContainer = firstDay.locator('.day-tasks');
    await tasksContainer.locator('.task-text').last().type('Clear me');
    await window.keyboard.press('Control+s');
    await tasksContainer.locator('.task-item').last().locator('.del-btn').click();

    // 2. Open Recycle Bin and Clear All
    await window.locator('#open-recycle-bin').click();
    
    // Handle the confirmation dialog
    window.on('dialog', dialog => dialog.accept());
    await window.locator('#clear-bin-btn').click();

    // 3. Verify bin is empty
    const binList = window.locator('#recycle-bin-list');
    await expect(binList.locator('.bin-task-item')).toHaveCount(0);
  });
});
