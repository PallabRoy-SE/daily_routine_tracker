import { start, cancel, onUrl } from '@fabianlars/tauri-plugin-oauth';
import { open } from '@tauri-apps/plugin-shell';
import Database from '@tauri-apps/plugin-sql';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';

/**
 * Initiates the Google Desktop OAuth 2.0 loopback flow.
 * Spawns a temporary local server, opens the authorization URL in the user's default browser,
 * captures the authorization code redirect, and exchanges it for tokens.
 * The tokens are stored in the SQLite `app_settings` database table.
 */
export async function authenticateWithGoogle(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google Client ID or Client Secret is not set. Please define VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET in your .env file.'
    );
  }

  const port = await start();
  const redirectUri = `http://127.0.0.1:${port}`;

  const googleAuthUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent select_account',
    }).toString();

  // Open the authorization link in the user's default web browser
  await open(googleAuthUrl);

  return new Promise<string>((resolve, reject) => {
    let unlisten: (() => void) | null = null;

    const cleanup = async () => {
      if (unlisten) {
        unlisten();
      }
      try {
        await cancel(port);
      } catch (err) {
        console.error('Failed to cancel OAuth server port:', err);
      }
    };

    onUrl(async (url) => {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');

        if (!code) {
          reject(new Error('No authorization code found in redirect URL.'));
          await cleanup();
          return;
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          reject(new Error(`Token exchange failed: ${errText}`));
          await cleanup();
          return;
        }

        const data = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = data;
        const expiryTime = Date.now() + expires_in * 1000;

        // Save tokens and expiration to the SQLite app_settings table
        const db = await Database.load('sqlite:routine_data.db');
        await db.execute(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
          ['access_token', access_token]
        );
        if (refresh_token) {
          await db.execute(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
            ['refresh_token', refresh_token]
          );
        }
        await db.execute(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
          ['token_expiry', expiryTime.toString()]
        );

        resolve(access_token);
        await cleanup();
      } catch (err) {
        reject(err);
        await cleanup();
      }
    })
      .then((unsub) => {
        unlisten = unsub;
      })
      .catch(async (err) => {
        reject(err);
        await cleanup();
      });
  });
}

/**
 * Checks the local database for a valid Google Drive access token.
 * If the token is missing, triggers authenticateWithGoogle().
 * If the token is expired or expiring soon, uses the stored refresh token to fetch a new access token.
 */
export async function getValidToken(): Promise<string> {
  const db = await Database.load('sqlite:routine_data.db');

  const getSetting = async (key: string): Promise<string | null> => {
    try {
      const rows: { value: string }[] = await db.select(
        'SELECT value FROM app_settings WHERE key = $1',
        [key]
      );
      return rows.length > 0 ? rows[0].value : null;
    } catch (err) {
      console.warn(`Failed to read app setting '${key}' from database:`, err);
      return null;
    }
  };

  const accessToken = await getSetting('access_token');
  const refreshToken = await getSetting('refresh_token');
  const tokenExpiry = await getSetting('token_expiry');

  if (!accessToken || !refreshToken || !tokenExpiry) {
    console.log('Tokens missing from database, initiating full authentication flow...');
    return authenticateWithGoogle();
  }

  const expiryTime = parseInt(tokenExpiry, 10);
  const now = Date.now();

  // If token is expired or expiring in less than 60 seconds, refresh it
  if (now >= expiryTime - 60000) {
    console.log('Access token has expired or is expiring soon, refreshing...');
    try {
      return await refreshAccessToken(refreshToken);
    } catch (err) {
      console.error('Failed to refresh access token, fallback to full login:', err);
      return authenticateWithGoogle();
    }
  }

  return accessToken;
}

/**
 * Private helper to refresh the access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google Client ID or Client Secret is not set. Please define VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET in your .env file.'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token refresh failed: ${errorText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in;
  const newExpiryTime = Date.now() + expiresIn * 1000;

  const db = await Database.load('sqlite:routine_data.db');
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
    ['access_token', newAccessToken]
  );
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
    ['token_expiry', newExpiryTime.toString()]
  );

  if (data.refresh_token) {
    await db.execute(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)',
      ['refresh_token', data.refresh_token]
    );
  }

  return newAccessToken;
}

/**
 * Disconnects the Google Drive account by deleting stored access token, refresh token, and expiration.
 */
export async function disconnectGoogleAccount(): Promise<void> {
  const db = await Database.load('sqlite:routine_data.db');
  await db.execute(
    "DELETE FROM app_settings WHERE key IN ('access_token', 'refresh_token', 'token_expiry')"
  );
}
