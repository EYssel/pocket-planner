'use strict';

import { app, BrowserWindow } from 'electron';
import { createWindow } from '../src/window';
import * as path from 'path';

jest.mock('electron', () => {
  const mApp = {
    getName: jest.fn(),
    getAppPath: jest.fn().mockReturnValue('root'),
  };
  const mBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    webContents: {
      send: jest.fn(),
    },
    isDestroyed: jest.fn().mockReturnValue(false),
    setProgressBar: jest.fn(),
    setTitle: jest.fn(),
  }));
  return {
    app: mApp,
    BrowserWindow: mBrowserWindow,
  };
});

describe('Window Creation Title', () => {
  test('should use Weekly Planner Dev in development mode', () => {
    jest.isolateModules(() => {
      const { app, BrowserWindow } = require('electron');
      const { createWindow } = require('../src/window');

      app.getName.mockReturnValue('Weekly Planner Dev');

      createWindow('planner');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekly Planner Dev',
        }),
      );
    });
  });

  test('should use Weekly Planner in production mode', () => {
    jest.isolateModules(() => {
      const { app, BrowserWindow } = require('electron');
      const { createWindow } = require('../src/window');

      app.getName.mockReturnValue('Weekly Planner');

      createWindow('planner');

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekly Planner',
        }),
      );
    });
  });

  describe('updateProgress', () => {
    test('should set progress bar ratio and update title with next prefix', () => {
      const { createWindow, updateProgress } = require('../src/window');
      createWindow();
      const { BrowserWindow } = require('electron');
      const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;

      updateProgress(2, 5, 'Next Task');
      expect(mockWindow.setProgressBar).toHaveBeenCalledWith(0.4);
      expect(mockWindow.setTitle).toHaveBeenCalledWith(expect.stringContaining('Next: Next Task'));
    });

    test('should update title with focus prefix for single task', () => {
      const { createWindow, updateProgress } = require('../src/window');
      createWindow();
      const { BrowserWindow } = require('electron');
      const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;

      updateProgress(0, 1, 'Only Task');
      expect(mockWindow.setTitle).toHaveBeenCalledWith(expect.stringContaining('Focus: Only Task'));
    });

    test('should update title with last task prefix', () => {
      const { createWindow, updateProgress } = require('../src/window');
      createWindow();
      const { BrowserWindow } = require('electron');
      const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;

      updateProgress(2, 3, 'Last Task');
      expect(mockWindow.setTitle).toHaveBeenCalledWith(expect.stringContaining('Last task: Last Task'));
    });

    test('should set all tasks done title if total is done', () => {
      const { createWindow, updateProgress } = require('../src/window');
      createWindow();
      const { BrowserWindow } = require('electron');
      const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;

      updateProgress(4, 4, null);
      expect(mockWindow.setProgressBar).toHaveBeenCalledWith(1);
      expect(mockWindow.setTitle).toHaveBeenCalledWith(expect.stringContaining('All tasks done!'));
    });

    test('should reset progress bar if total is 0', () => {
      const { createWindow, updateProgress } = require('../src/window');
      createWindow();
      const { BrowserWindow } = require('electron');
      const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;

      updateProgress(0, 0, null);
      expect(mockWindow.setProgressBar).toHaveBeenCalledWith(-1);
    });

    test('should set badge count on macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const { app } = require('electron');
      app.setBadgeCount = jest.fn();

      const { createWindow, updateProgress } = require('../src/window');
      createWindow();

      updateProgress(1, 5, 'Doing work');
      expect(app.setBadgeCount).toHaveBeenCalledWith(4);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
