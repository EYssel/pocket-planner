'use strict';

import { disconnect, getMeetings } from '../src/outlook';
import { getSetting, setSetting } from '../src/store';

jest.mock('../src/store');
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    webContents: {
      on: jest.fn(),
    },
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('outlook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  describe('disconnect', () => {
    test('should clear outlook settings', async () => {
      await disconnect();
      expect(setSetting).toHaveBeenCalledWith('outlookConnected', false);
      expect(setSetting).toHaveBeenCalledWith('outlookAccount', undefined);
      expect(setSetting).toHaveBeenCalledWith('outlookTokens', undefined);
    });
  });

  describe('getMeetings', () => {
    test('should return empty array if no tokens', async () => {
      (getSetting as jest.Mock).mockReturnValue(null);
      const meetings = await getMeetings('2026-05-04', '2026-05-05');
      expect(meetings).toEqual([]);
    });

    test('should fetch and return meetings if token is valid', async () => {
      const mockTokens = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };
      (getSetting as jest.Mock).mockReturnValue(mockTokens);

      const mockResponse = {
        value: [
          {
            id: '1',
            subject: 'Test Meeting',
            start: { dateTime: '2026-05-04T10:00:00Z' },
            end: { dateTime: '2026-05-04T11:00:00Z' },
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const meetings = await getMeetings('2026-05-04T00:00:00Z', '2026-05-04T23:59:59Z');
      
      expect(meetings).toHaveLength(1);
      expect(meetings[0].subject).toBe('Test Meeting');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendarview'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer valid-token' }
        })
      );
    });

    test('should refresh token if expired', async () => {
      const mockTokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
      };
      (getSetting as jest.Mock).mockReturnValue(mockTokens);

      // First fetch for token refresh, second for meetings
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'new-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ value: [] }),
        });

      await getMeetings('2026-05-04', '2026-05-05');

      expect(setSetting).toHaveBeenCalledWith('outlookTokens', expect.objectContaining({
        accessToken: 'new-token'
      }));
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('token'),
        expect.any(Object)
      );
    });
  });
});
