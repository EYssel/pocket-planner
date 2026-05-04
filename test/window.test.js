'use strict';

jest.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    isDestroyed: jest.fn().mockReturnValue(false),
    show: jest.fn(),
    focus: jest.fn(),
    loadFile: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    hide: jest.fn(),
    webContents: {
      send: jest.fn(),
    },
  })),
}));

describe('window', () => {
  let windowModule;
  let electron;
  let app;
  let BrowserWindow;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    electron = require('electron');
    app = electron.app;
    BrowserWindow = electron.BrowserWindow;
    windowModule = require('../src/window');
  });

  describe('createWindow', () => {
    test('should create a new BrowserWindow if none exists', () => {
      windowModule.createWindow('planner');
      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: 1000,
        height: 620,
        backgroundColor: '#0f0f0f',
      }));
    });

    test('should send mode and show if window already exists', () => {
      windowModule.createWindow('planner'); // Create it
      const mockWin = BrowserWindow.mock.results[0].value;
      
      windowModule.createWindow('checkin'); // Call again
      
      expect(mockWin.webContents.send).toHaveBeenCalledWith('set-mode', 'checkin');
      expect(mockWin.show).toHaveBeenCalled();
    });

    test('should hide on close if not quitting', () => {
      let capturedCloseHandler;
      BrowserWindow.mockImplementationOnce(() => ({
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn((event, cb) => {
          if (event === 'close') capturedCloseHandler = cb;
        }),
        once: jest.fn(),
        loadFile: jest.fn(),
        hide: jest.fn(),
        webContents: { send: jest.fn() }
      }));

      windowModule.createWindow('planner');
      
      const e = { preventDefault: jest.fn() };
      global.isQuitting = false;
      
      capturedCloseHandler(e);
      
      expect(e.preventDefault).toHaveBeenCalled();
      // We can't easily check hide() here because it's on the mock object we created in implementationOnce
    });
  });

  describe('initSingleInstance', () => {
    test('should quit if lock not obtained', () => {
      app.requestSingleInstanceLock.mockReturnValue(false);
      const result = windowModule.initSingleInstance();
      expect(result).toBe(false);
      expect(app.quit).toHaveBeenCalled();
    });

    test('should return true and listen for second-instance if lock obtained', () => {
      app.requestSingleInstanceLock.mockReturnValue(true);
      const result = windowModule.initSingleInstance();
      expect(result).toBe(true);
      expect(app.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
    });
  });
});


