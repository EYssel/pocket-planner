'use strict';

import { Tray, Menu, nativeImage, app } from 'electron';
import * as store from '../src/store';
import * as notifications from '../src/notifications';
import { init, createTray } from '../src/tray';
import { checkForUpdates } from '../src/updater';

jest.mock('electron', () => ({
  app: { 
    quit: jest.fn(),
    getName: jest.fn().mockReturnValue('Pocket Planner'),
    getAppPath: jest.fn().mockReturnValue('/mock/path'),
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    on: jest.fn(),
    setContextMenu: jest.fn(),
  })),
  Menu: {
    buildFromTemplate: jest.fn().mockReturnValue({}),
  },
  nativeImage: {
    createFromPath: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock('../src/store');
jest.mock('../src/updater', () => ({
  checkForUpdates: jest.fn(),
}));
jest.mock('../src/notifications', () => ({
  INTERVAL_OPTIONS: [
    { label: 'Every hour', minutes: 60 },
    { label: 'Off', minutes: 0 },
  ],
  reschedule: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('tray', () => {
  let openWindow: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    openWindow = jest.fn();
    init(openWindow);
  });

  test('createTray should initialize correctly', () => {
    createTray();
    const mockTrayInstance = (Tray as unknown as jest.Mock).mock.results[0].value;
    expect(Tray).toHaveBeenCalled();
    expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Pocket Planner');
    expect(mockTrayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('rebuild should create minimal menu', () => {
    createTray();
    
    const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    const openPlanner = template.find((i: any) => i.label === 'Open Planner');
    const checkIn     = template.find((i: any) => i.label === 'Check In');
    const quit        = template.find((i: any) => i.label === 'Quit');
    
    expect(openPlanner).toBeDefined();
    expect(checkIn).toBeDefined();
    expect(quit).toBeDefined();
  });

  test('clicking Quit should set isQuitting and call app.quit', () => {
    createTray();
    const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    const quitItem = template.find((i: any) => i.label === 'Quit');
    
    quitItem.click();
    
    expect(global.isQuitting).toBe(true);
    expect(app.quit).toHaveBeenCalled();
  });

  test('clicking Check for Updates should call checkForUpdates', () => {
    createTray();
    const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    const updateItem = template.find((i: any) => i.label === 'Check for Updates');
    
    updateItem.click();
    
    expect(checkForUpdates).toHaveBeenCalled();
  });
});
