'use strict';

import { app, BrowserWindow } from 'electron';
import { createWindow } from '../src/window';
import * as path from 'path';

jest.mock('../src/store', () => ({
  getSetting: jest.fn().mockReturnValue('medium'),
}));

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
    close: jest.fn(),
    isVisible: jest.fn().mockReturnValue(false),
    webContents: {
      send: jest.fn(),
    },
    isDestroyed: jest.fn().mockReturnValue(false),
    setProgressBar: jest.fn(),
    setTitle: jest.fn(),
  }));
  const mGlobalShortcut = {
    register: jest.fn().mockReturnValue(true),
    unregisterAll: jest.fn(),
  };
  return {
    app: mApp,
    BrowserWindow: mBrowserWindow,
    globalShortcut: mGlobalShortcut,
  };
});

describe('Window Creation Title', () => {
  test('should use Weekly Planner Dev in development mode', () => {
    jest.isolateModules(() => {
      const { app, BrowserWindow } = require('electron');
      const { createWindow } = require('../src/window');
      
      app.getName.mockReturnValue('Weekly Planner Dev');
      
      createWindow('planner');

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Weekly Planner Dev'
      }));
    });
  });

  test('should use Weekly Planner in production mode', () => {
    jest.isolateModules(() => {
      const { app, BrowserWindow } = require('electron');
      const { createWindow } = require('../src/window');
      
      app.getName.mockReturnValue('Weekly Planner');
      
      createWindow('planner');

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Weekly Planner'
      }));
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

  describe('Quick Add Window Management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('createQuickAddWindow should create a frameless window and load index.html with hash', () => {
      jest.isolateModules(() => {
        const { createQuickAddWindow } = require('../src/window');
        const { BrowserWindow } = require('electron');
        
        createQuickAddWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
          width: 500,
          height: 200,
          frame: false,
          resizable: false,
          alwaysOnTop: true
        }));

        const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
        expect(mockWindow.loadFile).toHaveBeenCalledWith(
          expect.stringContaining('index.html'),
          expect.objectContaining({ hash: 'quick-add' })
        );
      });
    });

    test('createQuickAddWindow should scale window height dynamically based on fontSize setting', () => {
      jest.isolateModules(() => {
        const { createQuickAddWindow } = require('../src/window');
        const { BrowserWindow } = require('electron');
        const { getSetting } = require('../src/store');

        (getSetting as jest.Mock).mockReturnValue('extra-large');

        createQuickAddWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
          width: 500,
          height: 280,
          frame: false,
        }));
      });
    });

    test('closeQuickAddWindow should close the window if exists', () => {
      jest.isolateModules(() => {
        const { createQuickAddWindow, closeQuickAddWindow } = require('../src/window');
        const { BrowserWindow } = require('electron');

        createQuickAddWindow();
        const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
        
        closeQuickAddWindow();
        expect(mockWindow.close).toHaveBeenCalled();
      });
    });

    test('reRegisterQuickAddShortcut should register a global shortcut', () => {
      jest.isolateModules(() => {
        const { reRegisterQuickAddShortcut } = require('../src/window');
        const { globalShortcut } = require('electron');

        reRegisterQuickAddShortcut('Ctrl+Shift+Space');
        expect(globalShortcut.unregisterAll).toHaveBeenCalled();
        expect(globalShortcut.register).toHaveBeenCalledWith('Ctrl+Shift+Space', expect.any(Function));
      });
    });

    test('reRegisterQuickAddShortcut should sanitize legacy key names during registration', () => {
      jest.isolateModules(() => {
        const { reRegisterQuickAddShortcut } = require('../src/window');
        const { globalShortcut } = require('electron');

        reRegisterQuickAddShortcut('CommandOrControl+Alt+Shift+Minus');
        expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Alt+Shift+-', expect.any(Function));

        reRegisterQuickAddShortcut('CommandOrControl+Shift+Equal');
        expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+=', expect.any(Function));
      });
    });

    test('reRegisterQuickAddShortcut should not register shortcut if set to None', () => {
      jest.isolateModules(() => {
        const { reRegisterQuickAddShortcut } = require('../src/window');
        const { globalShortcut } = require('electron');

        reRegisterQuickAddShortcut('None');
        expect(globalShortcut.unregisterAll).toHaveBeenCalled();
        expect(globalShortcut.register).not.toHaveBeenCalled();
      });
    });

    test('toggleQuickAddWindow should create a window if it does not exist, and debounce rapid consecutive calls', () => {
      jest.isolateModules(() => {
        const { toggleQuickAddWindow } = require('../src/window');
        const { BrowserWindow } = require('electron');

        const originalNow = Date.now;
        let mockTime = 1000;
        Date.now = jest.fn().mockImplementation(() => mockTime);

        try {
          // First call: Should create a window
          toggleQuickAddWindow();
          expect(BrowserWindow).toHaveBeenCalledTimes(1);

          // Second call (10ms later): Should be ignored (debounced)
          mockTime += 10;
          toggleQuickAddWindow();
          expect(BrowserWindow).toHaveBeenCalledTimes(1);

          // Third call (300ms later): Should toggle or show
          // Since it exists, it calls show/focus on existing (BrowserWindow constructor called only once)
          mockTime += 300;
          toggleQuickAddWindow();
          expect(BrowserWindow).toHaveBeenCalledTimes(1);

          // Set window visible state to true to test closing toggle
          const mockWindow = (BrowserWindow as unknown as jest.Mock).mock.results[0].value;
          mockWindow.isVisible.mockReturnValue(true);

          // Fourth call (another 300ms later): Should call close
          mockTime += 300;
          toggleQuickAddWindow();
          expect(mockWindow.close).toHaveBeenCalledTimes(1);
        } finally {
          Date.now = originalNow;
        }
      });
    });
  });
});
