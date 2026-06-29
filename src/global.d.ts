export {};

declare global {
  interface Window {
    electronAPI: {
      dbSelect: (query: string, params?: any[]) => Promise<any[]>;
      dbExecute: (query: string, params?: any[]) => Promise<any>;
      login: () => Promise<string>;
      logout: () => Promise<void>;
      sync: () => Promise<void>;
    };
  }
}
