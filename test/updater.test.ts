'use strict';

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    on: jest.fn(),
    checkForUpdates: jest.fn(),
  },
}));

describe('updater', () => {
  let updaterModule: any;
  let electron: any;
  let electronUpdater: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    electron = require('electron');
    electronUpdater = require('electron-updater');
    updaterModule = require('../src/updater');
  });

  describe('initUpdater', () => {
    test('should return early if app is not packaged', () => {
      electron.app.isPackaged = false;
      updaterModule.initUpdater();
      expect(electronUpdater.autoUpdater.on).not.toHaveBeenCalled();
      expect(electronUpdater.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });

    test('should initialize and check for updates if packaged', () => {
      electron.app.isPackaged = true;
      updaterModule.initUpdater();
      expect(electronUpdater.autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(electronUpdater.autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
      expect(electronUpdater.autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(electronUpdater.autoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    test('update-downloaded event should notify all windows', () => {
      electron.app.isPackaged = true;
      const mockWin = {
        webContents: {
          send: jest.fn(),
        },
      };
      electron.BrowserWindow.getAllWindows.mockReturnValue([mockWin]);

      let updateDownloadedCallback: any;
      electronUpdater.autoUpdater.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'update-downloaded') updateDownloadedCallback = cb;
      });

      updaterModule.initUpdater();
      
      if (updateDownloadedCallback) {
        updateDownloadedCallback();
        expect(mockWin.webContents.send).toHaveBeenCalledWith('update-downloaded');
      }
    });
  });

  describe('checkForUpdates', () => {
    test('should return early if app is not packaged', () => {
      electron.app.isPackaged = false;
      updaterModule.checkForUpdates();
      expect(electronUpdater.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });

    test('should call checkForUpdates if packaged', () => {
      electron.app.isPackaged = true;
      updaterModule.checkForUpdates();
      expect(electronUpdater.autoUpdater.checkForUpdates).toHaveBeenCalled();
    });
  });
});
