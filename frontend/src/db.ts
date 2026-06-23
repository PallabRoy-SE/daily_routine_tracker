import Database from '@tauri-apps/plugin-sql';

/**
 * Initializes and loads the local SQLite database.
 */
export async function initDB(): Promise<Database> {
  return await Database.load('sqlite:routine_data.db');
}
