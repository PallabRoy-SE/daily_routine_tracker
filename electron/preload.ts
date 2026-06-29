import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  dbSelect: (query: string, params?: any[]) => ipcRenderer.invoke('db:select', query, params),
  dbExecute: (query: string, params?: any[]) => ipcRenderer.invoke('db:execute', query, params),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  sync: () => ipcRenderer.invoke('sync:trigger'),
});
