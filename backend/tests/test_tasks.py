import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from app.main import app
from app.models.models import Task, UserStats
from app.core.database import get_db

@pytest.mark.asyncio
async def test_complete_task_xp_and_streak():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a task with priority 3
        task_data = {
            "title": "Test Task",
            "priority": 3,
            "links": []
        }
        response = await ac.post("/api/v1/tasks/", json=task_data)
        task_id = response.json()["id"]

        # 2. Complete the task
        response = await ac.put(f"/api/v1/tasks/{task_id}/complete")
        assert response.status_code == 200
        data = response.json()
        
        # Check XP (Priority 3 * 10 = 30)
        assert data["user_stats"]["xp"] == 30
        # Check initial streak
        assert data["user_stats"]["current_streak"] == 1

@pytest.mark.asyncio
async def test_streak_increment_next_day():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Pre-seed UserStats with a completion from yesterday
        db_gen = app.dependency_overrides[get_db]()
        db = await anext(db_gen)
        
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        stats = UserStats(id=1, xp=10, current_streak=1, last_completed_at=yesterday)
        db.add(stats)
        
        task = Task(title="New Task", priority=1)
        db.add(task)
        await db.commit()
        await db.refresh(task)

        # Complete task today
        response = await ac.put(f"/api/v1/tasks/{task.id}/complete")
        assert response.status_code == 200
        assert response.json()["user_stats"]["current_streak"] == 2
