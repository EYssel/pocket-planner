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

  test('rebuild should create menu with correct radio status', () => {
    store.getSetting.mockReturnValue(60);
    createTray();
    
    const template = Menu.buildFromTemplate.mock.calls[0][0];
    const notificationsItem = template.find(i => i.label === 'Notifications');
    const everyHour = notificationsItem.submenu.find(i => i.label === 'Every hour');
    const off = notificationsItem.submenu.find(i => i.label === 'Off');
    
    expect(everyHour.checked).toBe(true);
    expect(off.checked).toBe(false);
  });

  test('clicking an interval should update setting and reschedule', () => {
    store.getSetting.mockReturnValue(60);
    createTray();

    const template = Menu.buildFromTemplate.mock.calls[0][0];
    const notificationsItem = template.find(i => i.label === 'Notifications');
    const off = notificationsItem.submenu.find(i => i.label === 'Off');
    
    off.click();
    
    expect(store.setSetting).toHaveBeenCalledWith('notificationInterval', 0);
    expect(notifications.reschedule).toHaveBeenCalled();
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

