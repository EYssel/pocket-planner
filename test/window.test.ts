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
});
