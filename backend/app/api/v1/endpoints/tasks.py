from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.core.database import SessionDep
from app.models.models import Task, UserStats, TaskLog
from app.schemas.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskPublic,
    CompletionResponse,
    UserStatsPublic,
    TaskLogWithTask,
    DailyStats,
)

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


@router.get("/logs", response_model=list[TaskLogWithTask])
async def read_task_logs(
    db: SessionDep, target_date: date = Query(default_factory=date.today)
):
    """Fetch all TaskLogs for a specific date, joined with parent Tasks."""
    result = await db.execute(
        select(TaskLog)
        .options(joinedload(TaskLog.task))
        .where(TaskLog.target_date == target_date)
    )
    return result.scalars().all()


@router.get("/history", response_model=list[DailyStats])
async def read_task_history(
    db: SessionDep, start_date: date = Query(...), end_date: date = Query(...)
):
    """Fetch aggregated completion stats grouped by target_date."""
    result = await db.execute(
        select(
            TaskLog.target_date.label("date"),
            func.count(TaskLog.id).label("total_tasks"),
            func.sum(func.cast(TaskLog.is_completed, func.Integer)).label(
                "completed_tasks"
            ),
        )
        .where(TaskLog.target_date.between(start_date, end_date))
        .group_by(TaskLog.target_date)
        .order_by(TaskLog.target_date)
    )

    # Map raw results to DailyStats schema
    stats = []
    for row in result.all():
        stats.append(
            DailyStats(
                date=row.date,
                total_tasks=row.total_tasks,
                completed_tasks=int(row.completed_tasks or 0),
            )
        )
    return stats


@router.get("/history/heatmap", response_model=list[dict])
async def read_heatmap_data(db: SessionDep):
    """Fetch completed task counts for the last 365 days."""
    today = date.today()
    one_year_ago = today - timedelta(days=365)
    
    result = await db.execute(
        select(
            TaskLog.target_date.label("date"),
            func.count(TaskLog.id).label("count")
        )
        .where(
            TaskLog.target_date >= one_year_ago,
            TaskLog.is_completed == True
        )
        .group_by(TaskLog.target_date)
        .order_by(TaskLog.target_date)
    )
    
    # Format results to match the requested [{'date': '...', 'count': <int>}]
    return [{"date": row.date.isoformat(), "count": row.count} for row in result.all()]


@router.get("/history/daily")
async def read_daily_history(
    db: SessionDep,
    target_date: date = Query(...)
):
    """Fetch all tasks with their completion status for a specific date."""
    # Query tasks and join with task_logs for the specific date
    # We use a left outer join to get all tasks, even those without logs on that date
    result = await db.execute(
        select(Task, TaskLog.is_completed)
        .outerjoin(TaskLog, (TaskLog.task_id == Task.id) & (TaskLog.target_date == target_date))
    )
    
    tasks_with_status = []
    for row in result.all():
        task_data = TaskPublic.model_validate(row.Task).model_dump()
        task_data["is_completed_on_date"] = bool(row.is_completed)
        tasks_with_status.append(task_data)
        
    return tasks_with_status


@router.get("/history/xp", response_model=list[dict])
async def read_xp_trend(db: SessionDep):
    """Fetch cumulative total XP for each day in the last 30 days."""
    # This logic assumes we want a trend line. 
    # Since we only store 'total xp' in UserStats, we need to calculate 
    # daily gains from TaskLog or store historical XP.
    # For now, let's aggregate XP gained per day from TaskLogs * Task Priority.
    
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    
    result = await db.execute(
        select(
            TaskLog.target_date.label("date"),
            func.sum(Task.priority * 10).label("xp_gained")
        )
        .join(Task, Task.id == TaskLog.task_id)
        .where(
            TaskLog.target_date >= thirty_days_ago,
            TaskLog.is_completed == True
        )
        .group_by(TaskLog.target_date)
        .order_by(TaskLog.target_date)
    )
    
    # Calculate a simple trend (for demo purposes, we'll return daily gains)
    return [{"date": row.date.isoformat(), "xp": int(row.xp_gained or 0)} for row in result.all()]


@router.get("/{task_id}", response_model=TaskPublic)
async def read_task(task_id: int, db: SessionDep):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskPublic)
async def update_task(task_id: int, task_in: TaskUpdate, db: SessionDep):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


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

    # 2.1 Create or Update TaskLog for today
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(TaskLog).where(TaskLog.task_id == task_id, TaskLog.target_date == today)
    )
    task_log = result.scalar_one_or_none()
    if not task_log:
        task_log = TaskLog(task_id=task_id, target_date=today, is_completed=True)
        db.add(task_log)
    else:
        task_log.is_completed = True

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
