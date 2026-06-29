import { app, shell } from 'electron';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { dbExecute } from '../database';

const PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
function getTokenPath(): string {
  return path.join(app.getPath('userData'), 'auth_tokens.json');
}

// Load environment variables from root .env
function loadEnv(): void {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      });
    }
  } catch (err) {
    console.error('Failed to load env in authService:', err);
  }
}
loadEnv();

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || '';

interface Tokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

// Save tokens to local storage and database
export function saveTokens(tokens: Tokens): void {
  fs.writeFileSync(getTokenPath(), JSON.stringify(tokens, null, 2), 'utf8');
  if (tokens.refresh_token) {
    try {
      dbExecute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)", ["refresh_token", tokens.refresh_token]);
    } catch (err) {
      console.error('Failed to save refresh token to database:', err);
    }
  }
}

// Load tokens from local storage
export function loadTokens(): Tokens | null {
  try {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) {
      const content = fs.readFileSync(tokenPath, 'utf8');
      return JSON.parse(content) as Tokens;
    }
  } catch (err) {
    console.error('Failed to load local tokens:', err);
  }
  return null;
}

// Clear stored tokens from storage and database
export function logout(): void {
  try {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
    try {
      dbExecute("DELETE FROM app_settings WHERE key = 'refresh_token'");
    } catch (err) {
      console.error('Failed to delete refresh token from database:', err);
    }
    console.log('Logged out and local tokens cleared.');
  } catch (err) {
    console.error('Failed during logout token cleanup:', err);
  }
}

// Get valid access token (refreshing if needed, or initiating login if missing)
export async function getValidToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) {
    console.log('No tokens found. Spawning Google login browser window...');
    try {
      return await loginWithGoogle();
    } catch (err) {
      console.error('Failed auto login during token request:', err);
      return null;
    }
  }

  // Refresh if expiry_date exists and is within 1 minute of expiring
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60000 && tokens.refresh_token) {
    console.log('Access token near expiry, refreshing...');
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      });
      const data = response.data;
      const refreshedTokens: Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || tokens.refresh_token,
        expiry_date: Date.now() + (data.expires_in * 1000),
      };
      saveTokens(refreshedTokens);
      return refreshedTokens.access_token;
    } catch (err) {
      console.error('Failed to refresh Google access token:', err);
      return null;
    }
  }

  return tokens.access_token;
}

// Authenticate with Google OAuth 2.0 Loopback flow
export function loginWithGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return reject(new Error('Google Client Credentials are not set. Check your root .env file.'));
    }

    let server: http.Server | null = null;

    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent select_account',
    }).toString();

    // Spawn http callback redirect server
    server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
        const code = reqUrl.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Successful!</h1><p>You can close this tab now and return to the application.</p>');

          // Gracefully shutdown redirect server
          if (server) {
            server.close();
          }

          // Exchange authorization code for tokens
          console.log('Exchanging auth code for tokens...');
          const response = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          });

          const data = response.data;
          const tokens: Tokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expiry_date: Date.now() + (data.expires_in * 1000),
          };

          saveTokens(tokens);
          resolve(tokens.access_token);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Failed</h1><p>No authorization code found in redirect URL.</p>');
        }
      } catch (err) {
        console.error('Error during token exchange:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Server Error</h1><p>An error occurred while processing authentication.</p>');
        reject(err);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`OAuth loopback callback server listening on Port ${PORT}...`);
      shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      console.error('OAuth loopback server error:', err);
      reject(err);
    });
  });
}
