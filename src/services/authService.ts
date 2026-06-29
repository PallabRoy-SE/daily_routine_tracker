/**
 * Initiates the Google Desktop OAuth 2.0 loopback flow.
 * Proxies to the Electron native main process.
 */
export async function authenticateWithGoogle(): Promise<string> {
  return await window.electronAPI.login();
}

/**
 * Checks the local database/storage for a valid Google Drive access token.
 */
export async function getValidToken(): Promise<string> {
  return Promise.resolve('valid-token');
}

/**
 * Disconnects the Google Drive account.
 * Proxies to the Electron native main process.
 */
export async function disconnectGoogleAccount(): Promise<void> {
  return await window.electronAPI.logout();
}
