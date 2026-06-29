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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncWithGDrive = syncWithGDrive;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Database = require('better-sqlite3');
const authService_1 = require("./authService");
const database_1 = require("../database");
const FILE_NAME = 'routine_data_master.db';
// Search for the master SQLite file on Google Drive
async function findBackupFile(accessToken) {
    const response = await axios_1.default.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
            q: `name = '${FILE_NAME}' and trashed = false`,
            spaces: 'drive',
            fields: 'files(id, name)',
        },
    });
    const files = response.data.files;
    return files && files.length > 0 ? files[0] : null;
}
// Create new file metadata on Google Drive
async function createBackupFileMetadata(accessToken) {
    const response = await axios_1.default.post('https://www.googleapis.com/drive/v3/files', {
        name: FILE_NAME,
        mimeType: 'application/octet-stream',
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    return response.data.id;
}
// Upload raw binary db content to Google Drive
async function uploadDbBinary(accessToken, fileId, filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    await axios_1.default.patch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`, fileBuffer, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        params: { uploadType: 'media' },
    });
}
// Download raw binary db content from Google Drive
async function downloadDbBinary(accessToken, fileId, filePath) {
    const response = await axios_1.default.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { alt: 'media' },
        responseType: 'arraybuffer',
    });
    fs.writeFileSync(filePath, Buffer.from(response.data));
}
// SQL query parameter binder helper matching better-sqlite3 lookup rules
function runExecute(dbInstance, query, params = []) {
    const stmt = dbInstance.prepare(query);
    const bindObject = {};
    params.forEach((val, index) => {
        const key = `${index + 1}`;
        bindObject[key] = val;
        bindObject[`$${key}`] = val;
    });
    stmt.run(bindObject);
}
// SQL query select helper matching better-sqlite3 lookup rules
function runSelect(dbInstance, query, params = []) {
    const stmt = dbInstance.prepare(query);
    const bindObject = {};
    params.forEach((val, index) => {
        const key = `${index + 1}`;
        bindObject[key] = val;
        bindObject[`$${key}`] = val;
    });
    return stmt.all(bindObject);
}
// Bidirectional Row-by-Row SQLite Database Synchronization Engine
async function syncWithGDrive() {
    const accessToken = await (0, authService_1.getValidToken)();
    if (!accessToken) {
        throw new Error('Access token is missing or invalid. Please login first.');
    }
    console.log('Initiating row-by-row SQLite database synchronization...');
    const dbPath = (0, database_1.getDatabasePath)();
    // Search for the master file on Google Drive
    const remoteFile = await findBackupFile(accessToken);
    if (!remoteFile) {
        console.log('No remote backup file found. Creating and uploading local copy as master...');
        // Lock and close database before reading the file
        (0, database_1.closeDB)();
        try {
            const fileId = await createBackupFileMetadata(accessToken);
            await uploadDbBinary(accessToken, fileId, dbPath);
            console.log('Successfully uploaded local SQLite database to Google Drive.');
        }
        finally {
            // Re-initialize database connection immediately after operation
            (0, database_1.initDB)();
        }
        return;
    }
    // File exists on Drive: Download it to a remote DB copy file, open both, run row-by-row merge
    const remoteDbPath = path.join(path.dirname(dbPath), 'routine_data_remote.db');
    console.log('Remote master copy found. Downloading to remote DB copy file:', remoteDbPath);
    await downloadDbBinary(accessToken, remoteFile.id, remoteDbPath);
    // Close local connection before opening direct DB connections
    (0, database_1.closeDB)();
    const localDb = new Database(dbPath);
    const remoteDb = new Database(remoteDbPath);
    try {
        // A. Merge Tasks Table
        const localTasks = runSelect(localDb, 'SELECT * FROM tasks');
        const remoteTasks = runSelect(remoteDb, 'SELECT * FROM tasks');
        const localTasksMap = new Map(localTasks.map((t) => [t.id, t]));
        for (const rTask of remoteTasks) {
            const lTask = localTasksMap.get(rTask.id);
            if (lTask) {
                if (rTask.updated_at > lTask.updated_at) {
                    runExecute(localDb, 'UPDATE tasks SET title = $1, description = $2, priority = $3, is_completed = $4, time_limit = $5, links = $6, updated_at = $7, is_deleted = $8, scheduled_date = $9 WHERE id = $10', [
                        rTask.title,
                        rTask.description,
                        rTask.priority,
                        rTask.is_completed,
                        rTask.time_limit,
                        rTask.links,
                        rTask.updated_at,
                        rTask.is_deleted,
                        rTask.scheduled_date,
                        rTask.id,
                    ]);
                }
            }
            else {
                runExecute(localDb, 'INSERT INTO tasks (id, title, description, priority, is_completed, time_limit, links, updated_at, is_deleted, scheduled_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
                    rTask.id,
                    rTask.title,
                    rTask.description,
                    rTask.priority,
                    rTask.is_completed,
                    rTask.time_limit,
                    rTask.links,
                    rTask.updated_at,
                    rTask.is_deleted,
                    rTask.scheduled_date,
                ]);
            }
        }
        // B. Merge Task Logs Table
        const localLogs = runSelect(localDb, 'SELECT * FROM task_logs');
        const remoteLogs = runSelect(remoteDb, 'SELECT * FROM task_logs');
        const localLogsMap = new Map(localLogs.map((l) => [l.id, l]));
        for (const rLog of remoteLogs) {
            const lLog = localLogsMap.get(rLog.id);
            if (lLog) {
                if (rLog.updated_at > lLog.updated_at) {
                    runExecute(localDb, 'UPDATE task_logs SET task_id = $1, target_date = $2, is_completed = $3, updated_at = $4, is_deleted = $5 WHERE id = $6', [rLog.task_id, rLog.target_date, rLog.is_completed, rLog.updated_at, rLog.is_deleted, rLog.id]);
                }
            }
            else {
                runExecute(localDb, 'INSERT INTO task_logs (id, task_id, target_date, is_completed, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6)', [rLog.id, rLog.task_id, rLog.target_date, rLog.is_completed, rLog.updated_at, rLog.is_deleted]);
            }
        }
        // C. Merge User Stats Table
        const localStatsList = runSelect(localDb, 'SELECT * FROM user_stats');
        const remoteStatsList = runSelect(remoteDb, 'SELECT * FROM user_stats');
        const localStatsMap = new Map(localStatsList.map((s) => [s.id, s]));
        for (const rStats of remoteStatsList) {
            const lStats = localStatsMap.get(rStats.id);
            if (lStats) {
                if (rStats.updated_at > lStats.updated_at) {
                    runExecute(localDb, 'UPDATE user_stats SET xp = $1, current_streak = $2, max_streak = $3, last_completed_at = $4, updated_at = $5, is_deleted = $6 WHERE id = $7', [
                        rStats.xp,
                        rStats.current_streak,
                        rStats.max_streak,
                        rStats.last_completed_at,
                        rStats.updated_at,
                        rStats.is_deleted,
                        rStats.id,
                    ]);
                }
            }
            else {
                runExecute(localDb, 'INSERT INTO user_stats (id, xp, current_streak, max_streak, last_completed_at, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
                    rStats.id,
                    rStats.xp,
                    rStats.current_streak,
                    rStats.max_streak,
                    rStats.last_completed_at,
                    rStats.updated_at,
                    rStats.is_deleted,
                ]);
            }
        }
    }
    finally {
        // Safely close database connections
        localDb.close();
        remoteDb.close();
        // Clean up downloaded copy of remote database
        if (fs.existsSync(remoteDbPath)) {
            try {
                fs.unlinkSync(remoteDbPath);
            }
            catch (err) {
                console.error('Failed to delete temporary remote DB copy:', err);
            }
        }
    }
    // Upload final merged SQLite database file to Google Drive
    console.log('Row-by-row merge completed successfully. Uploading final local database file to Google Drive...');
    try {
        await uploadDbBinary(accessToken, remoteFile.id, dbPath);
        console.log('Google Drive master database file overwritten with final merged state successfully.');
    }
    finally {
        // Re-initialize local database connection
        (0, database_1.initDB)();
    }
}
