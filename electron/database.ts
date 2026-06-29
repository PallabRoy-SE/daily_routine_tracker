const Database = require('better-sqlite3');
import * as path from 'path';
import { app } from 'electron';

let db: any;

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'routine_data.db');
}

export function initDB(): void {
  const dbPath = getDatabasePath();
  console.log('Initializing SQLite database at:', dbPath);
  
  try {
    db = new Database(dbPath);
    console.log('SQLite database connected successfully!');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Schema creation - 1:1 match with latest-stack (Tauri lib.rs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority INTEGER NOT NULL DEFAULT 1,
      is_completed INTEGER NOT NULL DEFAULT 0,
      time_limit INTEGER,
      links TEXT,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      scheduled_date TEXT
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      target_date TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      max_streak INTEGER NOT NULL DEFAULT 0,
      last_completed_at TEXT,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export function closeDB(): void {
  if (db) {
    db.close();
    console.log('SQLite database connection closed successfully.');
  }
}

export function dbSelect(query: string, params?: any[]) {
  try {
    const stmt = db.prepare(query);
    
    // If no params, execute strictly
    if (!params || params.length === 0) {
      return stmt.all();
    }

    // Convert array ['2026-06-29'] into { $1: '2026-06-29', '1': '2026-06-29' }
    // This allows $1 to be reused in the query safely and satisfies better-sqlite3's lookup for "1"
    const bindObject: Record<string, any> = {};
    params.forEach((val, index) => {
      const key = `${index + 1}`;
      bindObject[key] = val;
      bindObject[`$${key}`] = val;
    });

    return stmt.all(bindObject);
  } catch (error) {
    console.error('dbSelect Error:', error, '\nQuery:', query, '\nParams:', params);
    throw error;
  }
}

export function dbExecute(query: string, params?: any[]) {
  try {
    const stmt = db.prepare(query);
    
    if (!params || params.length === 0) {
      return stmt.run();
    }

    const bindObject: Record<string, any> = {};
    params.forEach((val, index) => {
      const key = `${index + 1}`;
      bindObject[key] = val;
      bindObject[`$${key}`] = val;
    });

    return stmt.run(bindObject);
  } catch (error) {
    console.error('dbExecute Error:', error, '\nQuery:', query, '\nParams:', params);
    throw error;
  }
}
