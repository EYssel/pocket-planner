'use strict';

import { BrowserWindow } from 'electron';
import { getSetting, setSetting } from './store';
import { OutlookMeeting } from './types';

// Use the ID injected by esbuild from GitHub Secrets/Environment variables
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || '00000000-0000-0000-0000-000000000000';
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const REDIRECT_URI = 'http://localhost/callback';
const SCOPES = 'offline_access user.read calendars.read';

export async function connect(): Promise<boolean> {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const url = `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent(SCOPES)}`;
    authWindow.loadURL(url);

    authWindow.webContents.on('will-redirect', async (event, newUrl) => {
      if (newUrl.startsWith(REDIRECT_URI)) {
        event.preventDefault();
        const urlParams = new URL(newUrl).searchParams;
        const code = urlParams.get('code');
        if (code) {
          try {
            await exchangeCodeForTokens(code);
            authWindow.close();
            resolve(true);
          } catch (err) {
            console.error('Token exchange failed', err);
            authWindow.close();
            resolve(false);
          }
        }
      }
    });

    authWindow.on('closed', () => resolve(false));
  });
}

async function exchangeCodeForTokens(code: string): Promise<void> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange error: ${err}`);
  }

  const data = await response.json();
  await saveTokens(data);
  
  // Get user info to show which account is connected
  const meResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': `Bearer ${data.access_token}` },
  });
  if (meResponse.ok) {
    const me = await meResponse.json();
    setSetting('outlookAccount', me.userPrincipalName);
  }
  setSetting('outlookConnected', true);
}

async function saveTokens(data: any): Promise<void> {
  setSetting('outlookTokens', {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
}

export async function disconnect(): Promise<void> {
  setSetting('outlookConnected', false);
  setSetting('outlookAccount', undefined);
  setSetting('outlookTokens', undefined);
}

async function getValidToken(): Promise<string | null> {
  const tokens = getSetting('outlookTokens');
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt - 60000) {
    return tokens.accessToken;
  }

  // Refresh token
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    console.error('Token refresh failed');
    return null;
  }

  const data = await response.json();
  await saveTokens(data);
  return data.access_token;
}

export async function getMeetings(start: string, end: string): Promise<OutlookMeeting[]> {
  const token = await getValidToken();
  if (!token) return [];

  const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${start}&endDateTime=${end}&$select=subject,start,end`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error('Failed to fetch meetings');
    return [];
  }

  const data = await response.json();
  return data.value.map((m: any) => ({
    id: m.id,
    subject: m.subject,
    start: m.start.dateTime,
    end: m.end.dateTime,
  }));
}
