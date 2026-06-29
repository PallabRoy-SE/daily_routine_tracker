"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabasePath = getDatabasePath;
exports.initDB = initDB;
exports.closeDB = closeDB;
exports.dbSelect = dbSelect;
exports.dbExecute = dbExecute;
const Database = require('better-sqlite3');
const path = __importStar(require("path"));
const electron_1 = require("electron");
let db;
function getDatabasePath() {
    return path.join(electron_1.app.getPath('userData'), 'routine_data.db');
}
function initDB() {
    const dbPath = getDatabasePath();
    console.log('Initializing SQLite database at:', dbPath);
    try {
        db = new Database(dbPath);
        console.log('SQLite database connected successfully!');
    }
    catch (error) {
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
function closeDB() {
    if (db) {
        db.close();
        console.log('SQLite database connection closed successfully.');
    }
}
function dbSelect(query, params) {
    try {
        const stmt = db.prepare(query);
        // If no params, execute strictly
        if (!params || params.length === 0) {
            return stmt.all();
        }
        // Convert array ['2026-06-29'] into { $1: '2026-06-29', '1': '2026-06-29' }
        // This allows $1 to be reused in the query safely and satisfies better-sqlite3's lookup for "1"
        const bindObject = {};
        params.forEach((val, index) => {
            const key = `${index + 1}`;
            bindObject[key] = val;
            bindObject[`$${key}`] = val;
        });
        return stmt.all(bindObject);
    }
    catch (error) {
        console.error('dbSelect Error:', error, '\nQuery:', query, '\nParams:', params);
        throw error;
    }
}
function dbExecute(query, params) {
    try {
        const stmt = db.prepare(query);
        if (!params || params.length === 0) {
            return stmt.run();
        }
        const bindObject = {};
        params.forEach((val, index) => {
            const key = `${index + 1}`;
            bindObject[key] = val;
            bindObject[`$${key}`] = val;
        });
        return stmt.run(bindObject);
    }
    catch (error) {
        console.error('dbExecute Error:', error, '\nQuery:', query, '\nParams:', params);
        throw error;
    }
}
