/**
 * Syncs the local routine tracker SQLite database with Google Drive master copy.
 * Proxies to the Electron native main process.
 */
export async function syncWithGDrive(): Promise<void> {
  return await window.electronAPI.sync();
}
