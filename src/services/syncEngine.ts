import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { getValidToken } from './authService';

/**
 * Syncs the local routine tracker SQLite database with Google Drive master copy.
 */
export async function syncWithGDrive(): Promise<void> {
  const token = await getValidToken();
  if (!token) {
    throw new Error('Access token is required to synchronize data.');
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 1. Search for routine_data_master.db on Google Drive
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='routine_data_master.db' and trashed=false`;
  let searchResponse;
  try {
    searchResponse = await fetch(searchUrl, { headers: authHeaders });
  } catch (err) {
    throw new Error(`Failed to contact Google Drive: ${(err as Error).message}`);
  }

  if (searchResponse.status === 401) {
    const db = await Database.load('sqlite:routine_data.db');
    await db.execute("DELETE FROM app_settings WHERE key IN ('access_token', 'refresh_token', 'token_expiry')");
    throw new Error('Google OAuth token is invalid or expired. The token has been reset. Please try again.');
  }

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Search failed with status ${searchResponse.status}: ${errorText}`);
  }

  const searchData = await searchResponse.json();
  const files = searchData.files || [];
  let fileId = files.length > 0 ? files[0].id : null;

  if (!fileId) {
    console.log('Master database file not found on Google Drive. Creating a new one...');

    // Read local database bytes
    let bytes: number[];
    try {
      bytes = await invoke<number[]>('read_local_db');
    } catch (err) {
      throw new Error(`Failed to read local database: ${String(err)}`);
    }

    // Create file metadata
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'routine_data_master.db',
        mimeType: 'application/x-sqlite3',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create master database metadata: ${errorText}`);
    }

    const createData = await createResponse.json();
    fileId = createData.id;

    // Upload content
    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/x-sqlite3',
      },
      body: new Uint8Array(bytes),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload local database content: ${errorText}`);
    }

    console.log('Master database file successfully initialized on Google Drive.');
    return;
  }

  // 2. Download Alt Media content from Drive
  console.log(`Downloading master database from Google Drive (File ID: ${fileId})...`);
  const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: authHeaders,
  });

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text();
    throw new Error(`Failed to download master database: ${errorText}`);
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();

  // Save downloaded master copy locally
  try {
    await invoke('save_remote_db', { data: Array.from(new Uint8Array(arrayBuffer)) });
  } catch (err) {
    throw new Error(`Failed to save remote database copy locally: ${String(err)}`);
  }

  // 3. Connect to both databases and run bidirectional merge
  console.log('Databases loaded. Running row-by-row merge...');
  const localDb = await Database.load('sqlite:routine_data.db');
  const remoteDb = await Database.load('sqlite:routine_data_remote.db');

  try {
    // A. Merge Tasks Table
    const localTasks: any[] = await localDb.select('SELECT * FROM tasks');
    const remoteTasks: any[] = await remoteDb.select('SELECT * FROM tasks');

    const localTasksMap = new Map(localTasks.map(t => [t.id, t]));

    for (const rTask of remoteTasks) {
      const lTask = localTasksMap.get(rTask.id);
      if (lTask) {
        // MATCHING ID: compare updated_at
        if (rTask.updated_at > lTask.updated_at) {
          await localDb.execute(
            'UPDATE tasks SET title = $1, description = $2, priority = $3, is_completed = $4, time_limit = $5, links = $6, updated_at = $7, is_deleted = $8, scheduled_date = $9 WHERE id = $10',
            [rTask.title, rTask.description, rTask.priority, rTask.is_completed, rTask.time_limit, rTask.links, rTask.updated_at, rTask.is_deleted, rTask.scheduled_date, rTask.id]
          );
        }
      } else {
        // REMOTE ONLY: Insert locally
        await localDb.execute(
          'INSERT INTO tasks (id, title, description, priority, is_completed, time_limit, links, updated_at, is_deleted, scheduled_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [rTask.id, rTask.title, rTask.description, rTask.priority, rTask.is_completed, rTask.time_limit, rTask.links, rTask.updated_at, rTask.is_deleted, rTask.scheduled_date]
        );
      }
    }

    // B. Merge Task Logs Table
    const localLogs: any[] = await localDb.select('SELECT * FROM task_logs');
    const remoteLogs: any[] = await remoteDb.select('SELECT * FROM task_logs');

    const localLogsMap = new Map(localLogs.map(l => [l.id, l]));

    for (const rLog of remoteLogs) {
      const lLog = localLogsMap.get(rLog.id);
      if (lLog) {
        if (rLog.updated_at > lLog.updated_at) {
          await localDb.execute(
            'UPDATE task_logs SET task_id = $1, target_date = $2, is_completed = $3, updated_at = $4, is_deleted = $5 WHERE id = $6',
            [rLog.task_id, rLog.target_date, rLog.is_completed, rLog.updated_at, rLog.is_deleted, rLog.id]
          );
        }
      } else {
        await localDb.execute(
          'INSERT INTO task_logs (id, task_id, target_date, is_completed, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6)',
          [rLog.id, rLog.task_id, rLog.target_date, rLog.is_completed, rLog.updated_at, rLog.is_deleted]
        );
      }
    }

    // C. Merge User Stats Table
    const localStatsList: any[] = await localDb.select('SELECT * FROM user_stats');
    const remoteStatsList: any[] = await remoteDb.select('SELECT * FROM user_stats');

    const localStatsMap = new Map(localStatsList.map(s => [s.id, s]));

    for (const rStats of remoteStatsList) {
      const lStats = localStatsMap.get(rStats.id);
      if (lStats) {
        if (rStats.updated_at > lStats.updated_at) {
          await localDb.execute(
            'UPDATE user_stats SET xp = $1, current_streak = $2, max_streak = $3, last_completed_at = $4, updated_at = $5, is_deleted = $6 WHERE id = $7',
            [rStats.xp, rStats.current_streak, rStats.max_streak, rStats.last_completed_at, rStats.updated_at, rStats.is_deleted, rStats.id]
          );
        }
      } else {
        await localDb.execute(
          'INSERT INTO user_stats (id, xp, current_streak, max_streak, last_completed_at, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [rStats.id, rStats.xp, rStats.current_streak, rStats.max_streak, rStats.last_completed_at, rStats.updated_at, rStats.is_deleted]
        );
      }
    }

  } finally {
    // Close remote database connection
    await remoteDb.close();
  }

  // 4. Read merged local database bytes and upload to overwrite Drive master copy
  console.log('Local merge complete. Uploading final merged database back to Google Drive...');
  let mergedBytes: number[];
  try {
    mergedBytes = await invoke<number[]>('read_local_db');
  } catch (err) {
    throw new Error(`Failed to read merged database for upload: ${String(err)}`);
  }

  const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/x-sqlite3',
    },
    body: new Uint8Array(mergedBytes),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload final merged database content: ${errorText}`);
  }

  console.log('Bidirectional database synchronization successfully completed.');
}
