from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from typing import list

from app.core.database import SessionDep
from app.models.models import Task, UserStats
from app.schemas.schemas import TaskCreate, TaskPublic, CompletionResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskPublic, status_code=status.HTTP_201_CREATED)
async def create_task(task_in: TaskCreate, db: SessionDep):
    db_task = Task(**task_in.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.get("/", response_model=list[TaskPublic])
async def read_tasks(db: SessionDep, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Task).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{task_id}", response_model=TaskPublic)
async def read_task(task_id: int, db: SessionDep):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.get("/stats", response_model=UserStatsPublic)
async def read_user_stats(db: SessionDep):
    result = await db.execute(select(UserStats).where(UserStats.id == 1))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = UserStats(id=1)
        db.add(stats)
        await db.commit()
        await db.refresh(stats)
    return stats

@router.put("/{task_id}/complete", response_model=CompletionResponse)
async def complete_task(task_id: int, db: SessionDep):
    # 1. Fetch Task
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.is_completed:
        raise HTTPException(status_code=400, detail="Task already completed")

    # 2. Mark Task as Complete
    task.is_completed = True

    # 3. Fetch/Create UserStats (assuming single user with id=1 for now)
    result = await db.execute(select(UserStats).where(UserStats.id == 1))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = UserStats(id=1)
        db.add(stats)

    # 4. Calculate XP (Priority * 10)
    xp_reward = task.priority * 10
    stats.xp += xp_reward

    # 5. Streak Logic
    now = datetime.now(timezone.utc)
    if stats.last_completed_at:
        last_date = stats.last_completed_at.date()
        today = now.date()
        
        if last_date == today:
            # Already completed something today, streak stays the same
            pass
        elif last_date == today - timedelta(days=1):
            # Completed yesterday, increment streak
            stats.current_streak += 1
        else:
            # Streak broken
            stats.current_streak = 1
    else:
        # First task ever
        stats.current_streak = 1
    
    if stats.current_streak > stats.max_streak:
        stats.max_streak = stats.current_streak
        
    stats.last_completed_at = now

    await db.commit()
    await db.refresh(task)
    await db.refresh(stats)

    return {"task": task, "user_stats": stats}

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: SessionDep):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return None
