const db = {
  select: (query: string, params?: any[]) => window.electronAPI.dbSelect(query, params),
  execute: (query: string, params?: any[]) => window.electronAPI.dbExecute(query, params)
};

async function getDB(): Promise<any> {
  return db;
}

// Helper to map DB row to Task object
function mapTask(row: any) {
  if (!row) return null;
  return {
    ...row,
    is_completed: !!row.is_completed,
    links: row.links ? JSON.parse(row.links) : [],
  };
}

export const fetchTasks = async (): Promise<any[]> => {
  const db = await getDB();
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  const today = localDate.toISOString().split('T')[0];

  const rows: any[] = await db.select(
    'SELECT * FROM tasks WHERE is_deleted = 0 AND (scheduled_date = $1 OR (scheduled_date < $1 AND is_completed = 0))',
    [today]
  );
  return rows.map(mapTask);
};

export const fetchUpcomingTasks = async (): Promise<any[]> => {
  const db = await getDB();
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  const today = localDate.toISOString().split('T')[0];

  const rows: any[] = await db.select(
    'SELECT * FROM tasks WHERE scheduled_date > $1 AND is_deleted = 0',
    [today]
  );
  return rows.map(mapTask);
};

export const createTask = async (payload: any): Promise<any> => {
  const db = await getDB();
  const id = crypto.randomUUID();
  const title = payload.title;
  const description = payload.description || null;
  const priority = payload.priority ?? 1;
  const is_completed = payload.is_completed ? 1 : 0;
  const time_limit = payload.time_limit ?? null;
  const links = JSON.stringify(payload.links || []);
  const updated_at = Date.now();
  const is_deleted = 0;

  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  const today = localDate.toISOString().split('T')[0];
  const scheduled_date = payload.scheduled_date || today;

  await db.execute(
    'INSERT INTO tasks (id, title, description, priority, is_completed, time_limit, links, updated_at, is_deleted, scheduled_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [id, title, description, priority, is_completed, time_limit, links, updated_at, is_deleted, scheduled_date]
  );

  return {
    id,
    title,
    description,
    priority,
    is_completed: !!is_completed,
    time_limit,
    links: payload.links || [],
    updated_at,
    is_deleted,
    scheduled_date,
  };
};

export const editTask = async (taskId: string, payload: any): Promise<any> => {
  const db = await getDB();
  // Fetch existing task to ensure it exists and get defaults if needed
  const rows: any[] = await db.select('SELECT * FROM tasks WHERE id = $1 AND is_deleted = 0', [taskId]);
  if (rows.length === 0) {
    throw new Error('Task not found');
  }
  const existing = rows[0];

  const title = payload.title !== undefined ? payload.title : existing.title;
  const description = payload.description !== undefined ? payload.description : existing.description;
  const priority = payload.priority !== undefined ? payload.priority : existing.priority;
  const is_completed = payload.is_completed !== undefined ? (payload.is_completed ? 1 : 0) : existing.is_completed;
  const time_limit = payload.time_limit !== undefined ? payload.time_limit : existing.time_limit;
  const links = payload.links !== undefined ? JSON.stringify(payload.links) : existing.links;
  const updated_at = Date.now();
  const scheduled_date = payload.scheduled_date !== undefined ? payload.scheduled_date : existing.scheduled_date;

  await db.execute(
    'UPDATE tasks SET title = $1, description = $2, priority = $3, is_completed = $4, time_limit = $5, links = $6, updated_at = $7, scheduled_date = $8 WHERE id = $9 AND is_deleted = 0',
    [title, description, priority, is_completed, time_limit, links, updated_at, scheduled_date, taskId]
  );

  return {
    id: taskId,
    title,
    description,
    priority,
    is_completed: !!is_completed,
    time_limit,
    links: payload.links !== undefined ? payload.links : JSON.parse(existing.links || '[]'),
    updated_at,
    is_deleted: 0,
    scheduled_date,
  };
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const db = await getDB();
  const updatedAt = Date.now();
  // Soft delete task
  await db.execute('UPDATE tasks SET is_deleted = 1, updated_at = $1 WHERE id = $2', [updatedAt, taskId]);
  // Soft delete corresponding logs
  await db.execute('UPDATE task_logs SET is_deleted = 1, updated_at = $1 WHERE task_id = $2', [updatedAt, taskId]);
};

export const completeTask = async (taskId: string): Promise<any> => {
  const db = await getDB();
  
  // 1. Fetch Task
  const taskRows: any[] = await db.select('SELECT * FROM tasks WHERE id = $1 AND is_deleted = 0', [taskId]);
  if (taskRows.length === 0) {
    throw new Error('Task not found');
  }
  const task = taskRows[0];
  if (task.is_completed === 1) {
    throw new Error('Task already completed');
  }

  // 2. Mark Task as Complete
  const updatedAt = Date.now();
  await db.execute('UPDATE tasks SET is_completed = 1, updated_at = $1 WHERE id = $2', [updatedAt, taskId]);

  // 3. Create or Update TaskLog for today
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  const today = localDate.toISOString().split('T')[0];

  const logRows: any[] = await db.select(
    'SELECT * FROM task_logs WHERE task_id = $1 AND target_date = $2 AND is_deleted = 0',
    [taskId, today]
  );

  if (logRows.length === 0) {
    const logId = crypto.randomUUID();
    await db.execute(
      'INSERT INTO task_logs (id, task_id, target_date, is_completed, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6)',
      [logId, taskId, today, 1, updatedAt, 0]
    );
  } else {
    await db.execute(
      'UPDATE task_logs SET is_completed = 1, updated_at = $1 WHERE id = $2',
      [updatedAt, logRows[0].id]
    );
  }

  // 4. Fetch/Create UserStats (assuming single user with id='1' for now)
  const statsRows: any[] = await db.select('SELECT * FROM user_stats WHERE id = $1 AND is_deleted = 0', ['1']);
  let stats: any;
  if (statsRows.length === 0) {
    stats = {
      id: '1',
      xp: 0,
      current_streak: 0,
      max_streak: 0,
      last_completed_at: null,
    };
    await db.execute(
      'INSERT INTO user_stats (id, xp, current_streak, max_streak, last_completed_at, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [stats.id, stats.xp, stats.current_streak, stats.max_streak, stats.last_completed_at, updatedAt, 0]
    );
  } else {
    stats = statsRows[0];
  }

  // 5. Calculate XP (Priority * 10)
  const xpReward = task.priority * 10;
  const newXp = stats.xp + xpReward;

  // 6. Streak Logic
  let newStreak = stats.current_streak;
  const nowStr = new Date().toISOString();

  if (stats.last_completed_at) {
    const lastDate = stats.last_completed_at.split('T')[0];
    if (lastDate === today) {
      // Already completed something today, streak stays the same
    } else {
      const lastDateObj = new Date(lastDate + 'T00:00:00');
      const todayDateObj = new Date(today + 'T00:00:00');
      const diffTime = todayDateObj.getTime() - lastDateObj.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }
  } else {
    newStreak = 1;
  }

  const newMaxStreak = newStreak > stats.max_streak ? newStreak : stats.max_streak;

  await db.execute(
    'UPDATE user_stats SET xp = $1, current_streak = $2, max_streak = $3, last_completed_at = $4, updated_at = $5 WHERE id = $6',
    [newXp, newStreak, newMaxStreak, nowStr, updatedAt, '1']
  );

  return {
    task: {
      ...mapTask(task),
      is_completed: true,
      updated_at: updatedAt,
    },
    user_stats: {
      id: '1',
      xp: newXp,
      current_streak: newStreak,
      max_streak: newMaxStreak,
      last_completed_at: nowStr,
    },
  };
};

export const fetchUserStats = async (): Promise<any> => {
  const db = await getDB();
  const rows: any[] = await db.select('SELECT * FROM user_stats WHERE id = $1 AND is_deleted = 0', ['1']);
  if (rows.length === 0) {
    const defaultStats = {
      id: '1',
      xp: 0,
      current_streak: 0,
      max_streak: 0,
      last_completed_at: null,
    };
    await db.execute(
      'INSERT INTO user_stats (id, xp, current_streak, max_streak, last_completed_at, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [defaultStats.id, defaultStats.xp, defaultStats.current_streak, defaultStats.max_streak, defaultStats.last_completed_at, Date.now(), 0]
    );
    return defaultStats;
  }
  return rows[0];
};

export const fetchDailyHistory = async (dateString: string): Promise<any[]> => {
  const db = await getDB();
  const rows: any[] = await db.select(
    `SELECT t.id, t.title, t.priority, t.time_limit, t.links, tl.is_completed as is_completed_on_date
     FROM tasks t
     LEFT OUTER JOIN task_logs tl ON tl.task_id = t.id AND tl.target_date = $1 AND tl.is_deleted = 0
     WHERE t.is_deleted = 0`,
    [dateString]
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    time_limit: row.time_limit,
    is_completed_on_date: !!row.is_completed_on_date,
    links: row.links ? JSON.parse(row.links) : [],
  }));
};

export const fetchXpTrend = async (): Promise<any[]> => {
  const db = await getDB();
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const offset = d.getTimezoneOffset();
  const thirtyDaysAgo = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

  const rows: any[] = await db.select(
    `SELECT tl.target_date as date, SUM(t.priority * 10) as xp
     FROM task_logs tl
     INNER JOIN tasks t ON t.id = tl.task_id
     WHERE tl.target_date >= $1 AND tl.is_completed = 1 AND tl.is_deleted = 0 AND t.is_deleted = 0
     GROUP BY tl.target_date
     ORDER BY tl.target_date ASC`,
    [thirtyDaysAgo]
  );

  return rows.map((row) => ({
    date: row.date,
    xp: parseInt(row.xp || '0', 10),
  }));
};

export const fetchHeatmapData = async (): Promise<any[]> => {
  const db = await getDB();
  const d = new Date();
  d.setDate(d.getDate() - 365);
  const offset = d.getTimezoneOffset();
  const oneYearAgo = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

  const rows: any[] = await db.select(
    `SELECT target_date as date, COUNT(id) as count
     FROM task_logs
     WHERE target_date >= $1 AND is_completed = 1 AND is_deleted = 0
     GROUP BY target_date
     ORDER BY target_date ASC`,
    [oneYearAgo]
  );

  return rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count || '0', 10),
  }));
};

export const fetchTaskLogs = async (dateString: string): Promise<any[]> => {
  const db = await getDB();
  const rows: any[] = await db.select(
    `SELECT tl.id as log_id, tl.task_id, tl.target_date, tl.is_completed as log_completed,
            t.id as task_id, t.title as task_title, t.description as task_description,
            t.priority as task_priority, t.time_limit as task_time_limit, t.links as task_links
     FROM task_logs tl
     INNER JOIN tasks t ON t.id = tl.task_id
     WHERE tl.target_date = $1 AND tl.is_deleted = 0 AND t.is_deleted = 0`,
    [dateString]
  );

  return rows.map((row) => ({
    id: row.log_id,
    task_id: row.task_id,
    target_date: row.target_date,
    is_completed: !!row.log_completed,
    task: {
      id: row.task_id,
      title: row.task_title,
      description: row.task_description,
      priority: row.task_priority,
      time_limit: row.task_time_limit,
      links: row.task_links ? JSON.parse(row.task_links) : [],
    },
  }));
};

// Exporting a dummy Axios mock API for backward compatibility
const dummyAxiosMock: any = {
  get: async (url: string) => {
    if (url.includes('/tasks/history/xp')) {
      return { data: await fetchXpTrend() };
    }
    if (url.includes('/tasks/history/heatmap')) {
      return { data: await fetchHeatmapData() };
    }
    if (url.includes('/tasks/logs')) {
      const match = url.match(/target_date=([^&]+)/);
      const date = match ? match[1] : new Date().toISOString().split('T')[0];
      return { data: await fetchTaskLogs(date) };
    }
    throw new Error(`Endpoint ${url} not supported in Tauri database mode`);
  },
  post: async () => { throw new Error('Axios post deprecated'); },
  put: async () => { throw new Error('Axios put deprecated'); },
  delete: async () => { throw new Error('Axios delete deprecated'); },
};

export default dummyAxiosMock;
