'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const store = require('../src/store');
const notifications = require('../src/notifications');
const { init, createTray } = require('../src/tray');

jest.mock('electron', () => ({
  app: { quit: jest.fn() },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    on: jest.fn(),
    setContextMenu: jest.fn(),
  })),
  Menu: {
    buildFromTemplate: jest.fn().mockReturnValue({}),
  },
  nativeImage: {
    createFromPath: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../src/store');
jest.mock('../src/notifications', () => ({
  INTERVAL_OPTIONS: [
    { label: 'Every hour', minutes: 60 },
    { label: 'Off', minutes: 0 },
  ],
  reschedule: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('tray', () => {
  let openWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    openWindow = jest.fn();
    init(openWindow);
  });

  test('createTray should initialize correctly', () => {
    createTray();
    const mockTrayInstance = Tray.mock.results[0].value;
    expect(Tray).toHaveBeenCalled();
    expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Weekly Planner');
    expect(mockTrayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('rebuild should create minimal menu', () => {
    createTray();
    
    const template = Menu.buildFromTemplate.mock.calls[0][0];
    const openPlanner = template.find(i => i.label === 'Open Planner');
    const checkIn     = template.find(i => i.label === 'Check In');
    const quit        = template.find(i => i.label === 'Quit');
    const notifications = template.find(i => i.label === 'Notifications');
    const testNotif   = template.find(i => i.label === 'Send Test Notification');
    
    expect(openPlanner).toBeDefined();
    expect(checkIn).toBeDefined();
    expect(quit).toBeDefined();
    expect(notifications).toBeUndefined();
    expect(testNotif).toBeUndefined();
  });

  test('clicking Quit should set isQuitting and call app.quit', () => {
    createTray();
    const template = Menu.buildFromTemplate.mock.calls[0][0];
    const quitItem = template.find(i => i.label === 'Quit');
    
    quitItem.click();
    
    expect(global.isQuitting).toBe(true);
    expect(app.quit).toHaveBeenCalled();
  });
});

