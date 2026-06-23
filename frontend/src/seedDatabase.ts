import { initDB } from './db';

/**
 * Seeds the local SQLite database with initial tasks, historical logs, and user stats.
 */
export async function seedTestData() {
  const db = await initDB();

  // 1. Clean up existing data
  await db.execute('DELETE FROM task_logs');
  await db.execute('DELETE FROM tasks');
  await db.execute('DELETE FROM user_stats');

  // 2. Create base Tasks
  const tasks = [
    {
      id: crypto.randomUUID(),
      title: 'Morning Workout',
      description: 'HIIT or Strength',
      priority: 3,
      time_limit: 30,
      links: '[]',
      updated_at: Date.now(),
      is_deleted: 0
    },
    {
      id: crypto.randomUUID(),
      title: 'Deep Work Session',
      description: '2 hours focused coding',
      priority: 3,
      time_limit: 120,
      links: '[]',
      updated_at: Date.now(),
      is_deleted: 0
    },
    {
      id: crypto.randomUUID(),
      title: 'Read Technical Paper',
      description: 'Stay updated with ML/AI',
      priority: 2,
      time_limit: 45,
      links: '[]',
      updated_at: Date.now(),
      is_deleted: 0
    },
    {
      id: crypto.randomUUID(),
      title: 'Journaling',
      description: 'Reflect on daily wins',
      priority: 1,
      time_limit: null,
      links: '[]',
      updated_at: Date.now(),
      is_deleted: 0
    },
    {
      id: crypto.randomUUID(),
      title: 'Meditation',
      description: 'Mindful breathing',
      priority: 1,
      time_limit: 15,
      links: '[]',
      updated_at: Date.now(),
      is_deleted: 0
    }
  ];

  for (const t of tasks) {
    await db.execute(
      'INSERT INTO tasks (id, title, description, priority, is_completed, time_limit, links, updated_at, is_deleted) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)',
      [t.id, t.title, t.description, t.priority, t.time_limit, t.links, t.updated_at, t.is_deleted]
    );
  }

  // 3. Simulate Historical Data (Last 90 Days)
  const today = new Date();
  let totalXp = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let lastCompletedDate: string | null = null;

  for (let i = 90; i >= 0; i--) {
    const targetDateObj = new Date();
    targetDateObj.setDate(today.getDate() - i);
    const offset = targetDateObj.getTimezoneOffset();
    const localDate = new Date(targetDateObj.getTime() - (offset * 60 * 1000));
    const targetDateStr = localDate.toISOString().split('T')[0];

    // 80% chance of activity
    const isActive = Math.random() < 0.8;
    let dayCompletedCount = 0;

    if (isActive) {
      // Randomly complete a subset of tasks
      const numToComplete = Math.floor(Math.random() * tasks.length) + 1; // 1 to 5
      const shuffled = [...tasks].sort(() => 0.5 - Math.random());
      const completedToday = shuffled.slice(0, numToComplete);

      for (const t of completedToday) {
        const logId = crypto.randomUUID();
        const updatedAt = Date.now();
        await db.execute(
          'INSERT INTO task_logs (id, task_id, target_date, is_completed, updated_at, is_deleted) VALUES ($1, $2, $3, 1, $4, 0)',
          [logId, t.id, targetDateStr, updatedAt]
        );

        totalXp += t.priority * 10;
        dayCompletedCount++;
      }
    }

    // Streak logic
    if (dayCompletedCount > 0) {
      if (lastCompletedDate) {
        const lastDateObj = new Date(lastCompletedDate + 'T00:00:00');
        const currDateObj = new Date(targetDateStr + 'T00:00:00');
        const diffTime = currDateObj.getTime() - lastDateObj.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastCompletedDate = targetDateStr;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      // Reset streak if day skipped (except for today)
      if (i > 0) {
        if (lastCompletedDate && lastCompletedDate < targetDateStr) {
          currentStreak = 0;
        }
      }
    }
  }

  // 4. Update final stats (user ID is '1')
  const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60 * 1000)).toISOString().split('T')[0];
  const lastCompletedAtStr = lastCompletedDate === localTodayStr ? new Date().toISOString() : null;

  await db.execute(
    'INSERT INTO user_stats (id, xp, current_streak, max_streak, last_completed_at, updated_at, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, 0)',
    ['1', totalXp, currentStreak, maxStreak, lastCompletedAtStr, Date.now()]
  );

  console.log(`Database seeded successfully. XP: ${totalXp}, Streak: ${maxStreak}`);
}
