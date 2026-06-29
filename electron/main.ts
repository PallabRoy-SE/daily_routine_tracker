import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
app.disableHardwareAcceleration();

import * as path from 'path';
import { initDB, dbSelect, dbExecute } from './database';
import { loginWithGoogle, logout } from './sync/authService';
import { syncWithGDrive } from './sync/syncEngine';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize SQLite database
  initDB();

  // Register IPC handlers for SQLite
  ipcMain.handle('db:select', (_event: IpcMainInvokeEvent, query: string, params: any[]) => dbSelect(query, params));
  ipcMain.handle('db:execute', (_event: IpcMainInvokeEvent, query: string, params: any[]) => dbExecute(query, params));

  // Register IPC handlers for OAuth Sync
  ipcMain.handle('auth:login', () => loginWithGoogle());
  ipcMain.handle('auth:logout', () => logout());
  ipcMain.handle('sync:trigger', () => syncWithGDrive());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
