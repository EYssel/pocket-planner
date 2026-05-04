const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.setTimeout(60000);

test.describe('Weekly Planner E2E', () => {
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

  test('should launch with correct title', async () => {
    const title = await window.title();
    expect(title).toBe('Daily Planner');
    await expect(window.locator('.logo')).toBeVisible();
  });

  test('should allow adding a task', async () => {
    // Find the first day column
    const firstDay = window.locator('.day-section').first();
    const dayKey = await firstDay.getAttribute('data-day-key');
    const tasksContainer = window.locator(`#tasks-${dayKey}`);
    
    // Check initial count
    const initialCount = await tasksContainer.locator('.task-item').count();

    // Click the "+ task" button in that day
    const addTaskBtn = firstDay.locator('.add-task-btn');
    await addTaskBtn.click();

    // Verify a new task was added
    await expect(tasksContainer.locator('.task-item')).toHaveCount(initialCount + 1);

    // Find the textarea in the tasks list for that day
    const taskTextArea = tasksContainer.locator('.task-text').last();
    
    // Use type instead of fill to be more like a user
    await taskTextArea.click(); // Ensure focus
    await taskTextArea.type('My E2E Task', { delay: 50 });
    
    // Verify it exists with correct value
    await expect(taskTextArea).toHaveValue('My E2E Task');
  });

  test('should toggle a task as done', async () => {
    const firstDay = window.locator('.day-section').first();
    const dayKey = await firstDay.getAttribute('data-day-key');
    const tasksContainer = window.locator(`#tasks-${dayKey}`);
    
    // Add a task
    await firstDay.locator('.add-task-btn').click();
    const taskItem = tasksContainer.locator('.task-item').last();
    const taskTextArea = taskItem.locator('.task-text');
    await taskTextArea.type('Complete me', { delay: 20 });

    // Click check button
    const checkBtn = taskItem.locator('.check-btn');
    await checkBtn.click();

    // Verify task-item has 'done' class
    await expect(taskItem).toHaveClass(/done/);
  });
});
