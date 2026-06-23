import asyncio
import sys
import random
from datetime import date, timedelta, datetime, timezone
from pathlib import Path

# Add the current directory to sys.path to allow importing from the 'app' package
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.models import Task, UserStats, TaskLog
from sqlalchemy import select, delete

async def seed():
    async with SessionLocal() as db:
        print("Cleaning up existing data...")
        await db.execute(delete(TaskLog))
        await db.execute(delete(Task))
        await db.execute(delete(UserStats))
        await db.commit()

        # 1. Create base UserStats
        print("Creating initial UserStats...")
        stats = UserStats(id=1, xp=0, current_streak=0, max_streak=0)
        db.add(stats)

        # 2. Create base Tasks
        print("Seeding sample missions...")
        tasks = [
            Task(title="Morning Workout", description="HIIT or Strength", priority=3, time_limit=30),
            Task(title="Deep Work Session", description="2 hours focused coding", priority=3, time_limit=120),
            Task(title="Read Technical Paper", description="Stay updated with ML/AI", priority=2, time_limit=45),
            Task(title="Journaling", description="Reflect on daily wins", priority=1),
            Task(title="Meditation", description="Mindful breathing", priority=1, time_limit=15),
        ]
        db.add_all(tasks)
        await db.flush()  # Ensure tasks have IDs

        # 3. Simulate Historical Data (Last 90 Days)
        print("Simulating 90 days of historical archives...")
        today = date.today()
        total_xp = 0
        current_streak = 0
        max_streak = 0
        last_completed_date = None

        for i in range(90, -1, -1):
            target_date = today - timedelta(days=i)
            
            # Randomly decide if the user was active today (80% chance)
            is_active = random.random() < 0.8
            day_completed_count = 0

            if is_active:
                # Randomly complete a subset of tasks
                completed_today = random.sample(tasks, k=random.randint(1, len(tasks)))
                for task in completed_today:
                    log = TaskLog(
                        task_id=task.id,
                        target_date=target_date,
                        is_completed=True
                    )
                    db.add(log)
                    
                    xp_gain = task.priority * 10
                    total_xp += xp_gain
                    day_completed_count += 1

            # Update streak logic for simulation
            if day_completed_count > 0:
                if last_completed_date == target_date - timedelta(days=1):
                    current_streak += 1
                else:
                    current_streak = 1
                last_completed_date = target_date
                if current_streak > max_streak:
                    max_streak = current_streak
            elif target_date != today: # Reset streak if day skipped (except for today)
                if last_completed_date and last_completed_date < target_date:
                    current_streak = 0

        # Update final stats
        stats.xp = total_xp
        stats.current_streak = current_streak
        stats.max_streak = max_streak
        stats.last_completed_at = datetime.now(timezone.utc) if last_completed_date == today else None

        await db.commit()
        print(f"Seeding complete. Simulated {total_xp} total XP and a {max_streak} day best streak.")

if __name__ == "__main__":
    asyncio.run(seed())
