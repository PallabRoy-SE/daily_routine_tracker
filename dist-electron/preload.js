"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    dbSelect: (query, params) => electron_1.ipcRenderer.invoke('db:select', query, params),
    dbExecute: (query, params) => electron_1.ipcRenderer.invoke('db:execute', query, params),
    login: () => electron_1.ipcRenderer.invoke('auth:login'),
    logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
    sync: () => electron_1.ipcRenderer.invoke('sync:trigger'),
});
